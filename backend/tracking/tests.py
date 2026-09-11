from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from .models import AgentProfile, ClientLocation, VisitLog, LocationTrackingLog
from .geoutils import calculate_distance_meters, is_within_geofence


class GeofenceAndCheckInTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Agent User
        self.user = User.objects.create_user(
            username='agent_john',
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            password='securepassword123'
        )
        self.agent = AgentProfile.objects.create(
            user=self.user,
            employee_id='AGT-007',
            phone_number='+15550199',
            is_on_duty=True,
            current_status=AgentProfile.STATUS_IDLE,
            battery_level=95
        )

        # Create Client Location (Times Square NYC: 40.7580, -73.9855)
        self.client_loc = ClientLocation.objects.create(
            name='Midtown Retail Store',
            address='123 Broadway, New York, NY',
            latitude=40.758000,
            longitude=-73.985500,
            geofence_radius_meters=50.0
        )

    def test_geodesic_distance_accuracy(self):
        # Coordinates ~ 22.2 meters north
        nearby_lat = 40.758200
        nearby_lng = -73.985500
        distance = calculate_distance_meters(
            self.client_loc.latitude, self.client_loc.longitude,
            nearby_lat, nearby_lng
        )
        self.assertLess(distance, 50.0)
        is_inside, exact_dist = is_within_geofence(
            nearby_lat, nearby_lng,
            self.client_loc.latitude, self.client_loc.longitude,
            50.0
        )
        self.assertTrue(is_inside)

    def test_check_in_within_50m_succeeds(self):
        # 22 meters north of client
        lat = 40.758200
        lng = -73.985500

        url = reverse('api_check_in')
        payload = {
            'agent_id': self.agent.id,
            'client_id': self.client_loc.id,
            'latitude': lat,
            'longitude': lng,
            'selfie_image': 'data:image/jpeg;base64,TEST_WATERMARKED_SELFIE_PUNCH_DATA'
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])

        # Verify VisitLog created with server-side timestamp & selfie
        visit = VisitLog.objects.get(id=response.data['visit']['id'])
        self.assertEqual(visit.status, VisitLog.STATUS_IN_PROGRESS)
        self.assertLessEqual(visit.distance_at_checkin, 50.0)
        self.assertEqual(visit.selfie_image, 'data:image/jpeg;base64,TEST_WATERMARKED_SELFIE_PUNCH_DATA')
        self.assertIsNotNone(visit.check_in_time)

        # Verify agent status updated
        self.agent.refresh_from_db()
        self.assertEqual(self.agent.current_status, AgentProfile.STATUS_CHECKED_IN)

    def test_check_in_outside_50m_fails_with_geofence_error(self):
        # 500 meters away
        lat = 40.763000
        lng = -73.985500

        url = reverse('api_check_in')
        payload = {
            'agent_id': self.agent.id,
            'client_id': self.client_loc.id,
            'latitude': lat,
            'longitude': lng
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('Geofence validation failed', response.data['error'])
        self.assertGreater(response.data['distance_meters'], 50.0)

    def test_geofence_boundary_edge_cases(self):
        # Test boundary at exactly ~44 meters (0.0004 deg lat ~ 44.4 meters)
        inside_lat = 40.758400
        inside_lng = -73.985500
        is_inside, dist = is_within_geofence(inside_lat, inside_lng, self.client_loc.latitude, self.client_loc.longitude, 50.0)
        self.assertTrue(is_inside)
        self.assertLessEqual(dist, 50.0)

        # Test boundary outside at ~55 meters (0.0005 deg lat ~ 55.6 meters)
        outside_lat = 40.758500
        outside_lng = -73.985500
        is_outside, out_dist = is_within_geofence(outside_lat, outside_lng, self.client_loc.latitude, self.client_loc.longitude, 50.0)
        self.assertFalse(is_outside)
        self.assertGreater(out_dist, 50.0)

    def test_check_in_fails_when_agent_off_duty(self):
        self.agent.is_on_duty = False
        self.agent.save()

        url = reverse('api_check_in')
        payload = {
            'agent_id': self.agent.id,
            'client_id': self.client_loc.id,
            'latitude': 40.758000,
            'longitude': -73.985500
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Off-Duty', response.data['error'])

    def test_server_authoritative_timestamp_and_duration_calculation(self):
        # Create active visit with server timestamp
        visit = VisitLog.objects.create(
            agent=self.agent,
            client=self.client_loc,
            check_in_time=timezone.now() - timezone.timedelta(minutes=30),
            check_in_latitude=40.758000,
            check_in_longitude=-73.985500,
            distance_at_checkin=5.0,
            status=VisitLog.STATUS_IN_PROGRESS
        )
        self.agent.current_status = AgentProfile.STATUS_CHECKED_IN
        self.agent.save()

        url = reverse('api_check_out')
        payload = {
            'visit_id': visit.id,
            'meeting_notes': 'Quarterly product review with store manager.',
            'order_value': 7500.00,
            'follow_up_date': '2026-09-20',
            'attachment_image': 'data:image/jpeg;base64,INVOICE_ATTACHMENT_PROOF'
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])

        visit.refresh_from_db()
        self.assertEqual(visit.status, VisitLog.STATUS_COMPLETED)
        self.assertIsNotNone(visit.check_out_time)
        self.assertGreaterEqual(visit.duration_minutes, 29.5)
        self.assertEqual(visit.attachment_image, 'data:image/jpeg;base64,INVOICE_ATTACHMENT_PROOF')

        # Agent reset to Idle
        self.agent.refresh_from_db()
        self.assertEqual(self.agent.current_status, AgentProfile.STATUS_IDLE)

    def test_location_ping_privacy_compliance(self):
        # On-duty ping is recorded
        url = reverse('api_location_ping')
        payload = {
            'agent_id': self.agent.id,
            'latitude': 40.758500,
            'longitude': -73.985200,
            'speed': 18.5,
            'battery_level': 88
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['recorded'])
        self.assertEqual(LocationTrackingLog.objects.filter(agent=self.agent).count(), 1)

        # Off-duty ping is discarded
        self.agent.is_on_duty = False
        self.agent.save()
        response_off = self.client.post(url, payload, format='json')
        self.assertEqual(response_off.status_code, status.HTTP_200_OK)
        self.assertFalse(response_off.data['recorded'])
        # Count remains 1
        self.assertEqual(LocationTrackingLog.objects.filter(agent=self.agent).count(), 1)
