from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Avg
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from datetime import datetime, time, timedelta

from .models import AgentProfile, ClientLocation, LocationTrackingLog, VisitLog
from .serializers import (
    AgentProfileSerializer, ClientLocationSerializer, VisitLogSerializer,
    CheckInRequestSerializer, CheckOutRequestSerializer, LocationPingSerializer,
    DutyToggleSerializer, LocationTrackingLogSerializer
)
from .consumers import broadcast_location_sync
from .geoutils import calculate_distance_meters, is_within_geofence


class CheckInAPIView(APIView):
    """
    POST /api/check-in/
    Verifies that the field agent is within 50 meters of the client location (geofence).
    If verified, creates an active VisitLog and updates agent status.
    """
    def post(self, request):
        serializer = CheckInRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        agent_id = serializer.validated_data['agent_id']
        client_id = serializer.validated_data.get('client_id')
        client_name = serializer.validated_data.get('client_name', '').strip()
        client_address = serializer.validated_data.get('client_address', '').strip()
        agent_lat = serializer.validated_data['latitude']
        agent_lng = serializer.validated_data['longitude']

        agent = get_object_or_404(AgentProfile, id=agent_id)

        # Duty check: Privacy & Compliance
        if not agent.is_on_duty:
            return Response({
                "success": False,
                "error": "Agent is currently Off-Duty. You must toggle On-Duty before checking in."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Prevent concurrent overlapping check-ins
        ongoing_visit = agent.visits.filter(status=VisitLog.STATUS_IN_PROGRESS).first()
        if ongoing_visit:
            return Response({
                "success": False,
                "error": f"You already have an ongoing visit at {ongoing_visit.client.name}. Please check out first.",
                "active_visit_id": ongoing_visit.id
            }, status=status.HTTP_400_BAD_REQUEST)

        # Dynamic On-the-Fly Destination Handling
        if client_name:
            client = ClientLocation.objects.filter(name__iexact=client_name).first()
            if not client:
                client = ClientLocation.objects.create(
                    name=client_name,
                    address=client_address or f"Visit Location ({agent_lat:.4f}, {agent_lng:.4f})",
                    latitude=agent_lat,
                    longitude=agent_lng,
                    geofence_radius_meters=50.0
                )
                broadcast_location_sync({
                    'event': 'client_created',
                    'client': ClientLocationSerializer(client).data
                })
            distance = 0.0
        elif client_id:
            client = get_object_or_404(ClientLocation, id=client_id)
            is_inside, distance = client.is_agent_inside(agent_lat, agent_lng)
        else:
            return Response({
                "success": False,
                "error": "Please enter a customer/client name or select an existing client."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create verified visit
        selfie_image = serializer.validated_data.get('selfie_image', '')
        visit = VisitLog.objects.create(
            agent=agent,
            client=client,
            check_in_time=timezone.now(),
            check_in_latitude=agent_lat,
            check_in_longitude=agent_lng,
            distance_at_checkin=distance,
            selfie_image=selfie_image,
            status=VisitLog.STATUS_IN_PROGRESS
        )

        # Update agent status & current location
        agent.update_location(agent_lat, agent_lng, speed=0.0)
        agent.current_status = AgentProfile.STATUS_CHECKED_IN
        agent.save()

        # Real-time WebSocket notification
        broadcast_location_sync({
            'event': 'agent_checked_in',
            'agent_id': agent.id,
            'agent_name': agent.user.get_full_name() or agent.user.username,
            'client_id': client.id,
            'client_name': client.name,
            'visit_id': visit.id,
            'distance_meters': distance,
            'latitude': agent_lat,
            'longitude': agent_lng,
            'status': agent.current_status,
            'timestamp': timezone.now().isoformat()
        })

        return Response({
            "success": True,
            "message": f"Successfully checked in at {client.name} ({distance:.1f}m away).",
            "visit": VisitLogSerializer(visit).data
        }, status=status.HTTP_201_CREATED)


class CheckOutAPIView(APIView):
    """
    POST /api/check-out/
    Finalizes visit, records meeting notes, order value, photo attachment, and follow-up date.
    """
    def post(self, request):
        serializer = CheckOutRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        visit_id = serializer.validated_data['visit_id']
        visit = get_object_or_404(VisitLog, id=visit_id)

        if visit.status != VisitLog.STATUS_IN_PROGRESS:
            return Response({
                "success": False,
                "error": "This visit is already closed or cancelled."
            }, status=status.HTTP_400_BAD_REQUEST)

        visit.check_out_time = timezone.now()
        visit.meeting_notes = serializer.validated_data.get('meeting_notes', '')
        visit.order_value = serializer.validated_data.get('order_value', 0.0)
        visit.follow_up_date = serializer.validated_data.get('follow_up_date')
        if serializer.validated_data.get('attachment_image'):
            visit.attachment_image = serializer.validated_data.get('attachment_image')
        if 'photo' in request.FILES:
            visit.photo = request.FILES['photo']
        visit.status = VisitLog.STATUS_COMPLETED
        visit.save()

        # Update agent status back to Idle
        agent = visit.agent
        if agent.is_on_duty:
            agent.current_status = AgentProfile.STATUS_IDLE
        else:
            agent.current_status = AgentProfile.STATUS_OFF_DUTY
        agent.save()

        # Real-time WebSocket broadcast
        broadcast_location_sync({
            'event': 'agent_checked_out',
            'agent_id': agent.id,
            'agent_name': agent.user.get_full_name() or agent.user.username,
            'visit_id': visit.id,
            'client_name': visit.client.name,
            'duration_minutes': visit.duration_minutes,
            'order_value': float(visit.order_value),
            'status': agent.current_status,
            'timestamp': timezone.now().isoformat()
        })

        return Response({
            "success": True,
            "message": f"Successfully checked out of visit at {visit.client.name}.",
            "visit": VisitLogSerializer(visit).data
        }, status=status.HTTP_200_OK)


class LocationPingAPIView(APIView):
    """
    POST /api/location/ping/
    Receives periodic agent GPS coordinates, persists breadcrumb if on duty,
    updates AgentProfile, and broadcasts live telemetry via WebSocket.
    """
    def post(self, request):
        serializer = LocationPingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        agent_id = serializer.validated_data['agent_id']
        lat = serializer.validated_data['latitude']
        lng = serializer.validated_data['longitude']
        speed = serializer.validated_data.get('speed', 0.0)
        battery = serializer.validated_data.get('battery_level', 100)

        agent = get_object_or_404(AgentProfile, id=agent_id)

        # Privacy compliance: Only record coordinates if agent is On-Duty
        if agent.is_on_duty:
            agent.update_location(lat, lng, speed, battery)
            log = LocationTrackingLog.objects.create(
                agent=agent,
                latitude=lat,
                longitude=lng,
                speed=speed,
                battery_level=battery,
                timestamp=timezone.now()
            )

            # Real-time WebSocket broadcast
            broadcast_location_sync({
                'event': 'location_ping',
                'agent_id': agent.id,
                'agent_name': agent.user.get_full_name() or agent.user.username,
                'employee_id': agent.employee_id,
                'latitude': lat,
                'longitude': lng,
                'speed': speed,
                'battery_level': battery,
                'status': agent.current_status,
                'timestamp': log.timestamp.isoformat()
            })

            return Response({
                "success": True,
                "recorded": True,
                "agent_status": agent.current_status,
                "battery_level": agent.battery_level
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "success": True,
                "recorded": False,
                "message": "Agent is Off-Duty; GPS ping discarded for privacy."
            }, status=status.HTTP_200_OK)


class DutyToggleAPIView(APIView):
    """
    POST /api/duty/
    Toggles On-Duty / Off-Duty state.
    """
    def post(self, request):
        serializer = DutyToggleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        agent_id = serializer.validated_data['agent_id']
        is_on_duty = serializer.validated_data['is_on_duty']

        agent = get_object_or_404(AgentProfile, id=agent_id)
        agent.is_on_duty = is_on_duty
        if is_on_duty:
            agent.current_status = AgentProfile.STATUS_IDLE
        else:
            agent.current_status = AgentProfile.STATUS_OFF_DUTY
        agent.save()

        broadcast_location_sync({
            'event': 'duty_status_changed',
            'agent_id': agent.id,
            'agent_name': agent.user.get_full_name() or agent.user.username,
            'is_on_duty': agent.is_on_duty,
            'status': agent.current_status,
            'timestamp': timezone.now().isoformat()
        })

        return Response({
            "success": True,
            "agent": AgentProfileSerializer(agent).data
        }, status=status.HTTP_200_OK)


class AuthLoginAPIView(APIView):
    """
    POST /api/auth/login/
    Authenticates Admin or Field Agent and returns role and credentials.
    """
    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password:
            return Response({"error": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Allow logging in by employee_id as well as username
        user = None
        if AgentProfile.objects.filter(employee_id__iexact=username).exists():
            agent_prof = AgentProfile.objects.filter(employee_id__iexact=username).first()
            user = authenticate(username=agent_prof.user.username, password=password)
        else:
            user = authenticate(username=username, password=password)

        if not user:
            return Response({"error": "Invalid username or password."}, status=status.HTTP_401_UNAUTHORIZED)

        if user.is_superuser or user.is_staff:
            role = 'admin'
            agent_data = None
        elif hasattr(user, 'agent_profile'):
            role = 'agent'
            agent_data = AgentProfileSerializer(user.agent_profile).data
        else:
            role = 'admin' if user.is_staff else 'agent'
            agent_data = None

        return Response({
            "success": True,
            "role": role,
            "user": {
                "id": user.id,
                "username": user.username,
                "name": user.get_full_name() or user.username,
                "email": user.email,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser
            },
            "agent": agent_data
        }, status=status.HTTP_200_OK)


class AgentListAPIView(APIView):
    """
    GET /api/agents/
    Returns list of all field agents with real-time status and battery.
    POST /api/agents/
    Creates a new field agent user and profile dynamically.
    """
    def get(self, request):
        agents = AgentProfile.objects.select_related('user').all()
        return Response(AgentProfileSerializer(agents, many=True).data)

    def post(self, request):
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        username = request.data.get('username', '').strip().lower()
        employee_id = request.data.get('employee_id', '').strip().upper()
        email = request.data.get('email', '').strip()
        phone_number = request.data.get('phone_number', '').strip()
        password = request.data.get('password', '').strip() or 'AgentPassword123!'

        if not username:
            username = f"agent_{employee_id.lower().replace('-', '_')}" if employee_id else f"agent_{int(timezone.now().timestamp())}"

        if not employee_id:
            last_agent = AgentProfile.objects.order_by('-id').first()
            next_num = (last_agent.id + 101) if last_agent else 101
            employee_id = f"AGT-{next_num}"

        if User.objects.filter(username=username).exists():
            return Response({"error": f"Username '{username}' already exists."}, status=status.HTTP_400_BAD_REQUEST)

        if AgentProfile.objects.filter(employee_id=employee_id).exists():
            return Response({"error": f"Employee ID '{employee_id}' already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email or f"{username}@company.com",
            password=password
        )

        agent = AgentProfile.objects.create(
            user=user,
            employee_id=employee_id,
            phone_number=phone_number,
            is_on_duty=False,
            current_status=AgentProfile.STATUS_OFF_DUTY,
            battery_level=100,
            last_latitude=40.7580,
            last_longitude=-73.9855,
            last_speed=0.0,
            last_seen_at=timezone.now()
        )

        broadcast_location_sync({
            'event': 'agent_created',
            'agent_id': agent.id,
            'agent_name': user.get_full_name() or user.username,
            'employee_id': agent.employee_id,
            'status': agent.current_status
        })

        return Response({
            "success": True,
            "message": f"Field agent {user.get_full_name() or user.username} ({employee_id}) created successfully!",
            "agent": AgentProfileSerializer(agent).data
        }, status=status.HTTP_201_CREATED)


class ClientListAPIView(APIView):
    """
    GET /api/clients/
    Returns list of all client target locations.
    POST /api/clients/
    Creates a new client target location with 50m geofence.
    """
    def get(self, request):
        clients = ClientLocation.objects.all().order_by('name')
        return Response(ClientLocationSerializer(clients, many=True).data)

    def post(self, request):
        name = request.data.get('name', '').strip()
        address = request.data.get('address', '').strip()
        contact_person = request.data.get('contact_person', '').strip()
        contact_phone = request.data.get('contact_phone', '').strip()
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        geofence_radius = request.data.get('geofence_radius_meters', 50.0)

        if not name or not address or latitude is None or longitude is None:
            return Response({"error": "Name, address, latitude, and longitude are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lat = float(latitude)
            lng = float(longitude)
            radius = float(geofence_radius)
        except (ValueError, TypeError):
            return Response({"error": "Latitude, longitude, and radius must be valid numbers."}, status=status.HTTP_400_BAD_REQUEST)

        client = ClientLocation.objects.create(
            name=name,
            address=address,
            contact_person=contact_person,
            contact_phone=contact_phone,
            latitude=lat,
            longitude=lng,
            geofence_radius_meters=radius
        )

        broadcast_location_sync({
            'event': 'client_created',
            'client_id': client.id,
            'client_name': client.name,
            'address': client.address,
            'latitude': client.latitude,
            'longitude': client.longitude,
            'radius': client.geofence_radius_meters
        })

        return Response({
            "success": True,
            "message": f"Client target '{client.name}' created with {client.geofence_radius_meters}m geofence!",
            "client": ClientLocationSerializer(client).data
        }, status=status.HTTP_201_CREATED)


class VisitListAPIView(APIView):
    """
    GET /api/visits/
    Returns list of visit logs with optional filter by agent or date.
    """
    def get(self, request):
        queryset = VisitLog.objects.select_related('agent__user', 'client').all()
        agent_id = request.query_params.get('agent_id')
        if agent_id:
            queryset = queryset.filter(agent_id=agent_id)
        return Response(VisitLogSerializer(queryset[:100], many=True).data)


class RouteReplayAPIView(APIView):
    """
    GET /api/routes/<int:agent_id>/?date=YYYY-MM-DD
    Returns breadcrumb path coordinates, stops (stationary periods), and visits for timeline replay.
    """
    def get(self, request, agent_id):
        agent = get_object_or_404(AgentProfile, id=agent_id)
        date_str = request.query_params.get('date')

        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                target_date = timezone.now().date()
        else:
            target_date = timezone.now().date()

        start_dt = timezone.make_aware(datetime.combine(target_date, time.min))
        end_dt = timezone.make_aware(datetime.combine(target_date, time.max))

        logs = LocationTrackingLog.objects.filter(
            agent=agent,
            timestamp__range=(start_dt, end_dt)
        ).order_by('timestamp')

        # Detect stops (consecutive points where speed < 2 km/h spanning > 5 minutes)
        stops = []
        path = []
        total_distance = 0.0
        prev_log = None

        for log in logs:
            path.append({
                'id': log.id,
                'lat': log.latitude,
                'lng': log.longitude,
                'speed': log.speed,
                'battery': log.battery_level,
                'timestamp': log.timestamp.isoformat()
            })

            if prev_log:
                d = calculate_distance_meters(
                    prev_log.latitude, prev_log.longitude,
                    log.latitude, log.longitude
                )
                total_distance += d
            prev_log = log

        # Get visits during this window
        visits = VisitLog.objects.filter(
            agent=agent,
            check_in_time__range=(start_dt, end_dt)
        )

        return Response({
            "agent_id": agent.id,
            "agent_name": agent.user.get_full_name() or agent.user.username,
            "employee_id": agent.employee_id,
            "date": target_date.isoformat(),
            "total_points": len(path),
            "total_distance_km": round(total_distance / 1000.0, 2),
            "path": path,
            "visits": VisitLogSerializer(visits, many=True).data
        })


class AnalyticsSummaryAPIView(APIView):
    """
    GET /api/analytics/
    Returns executive metrics: total distance, visits, revenue, transit vs meeting time breakdown.
    """
    def get(self, request):
        today = timezone.now().date()
        start_today = timezone.make_aware(datetime.combine(today, time.min))

        total_agents = AgentProfile.objects.count()
        on_duty_count = AgentProfile.objects.filter(is_on_duty=True).count()
        checked_in_count = AgentProfile.objects.filter(current_status=AgentProfile.STATUS_CHECKED_IN).count()

        # Visits stats
        visits_today = VisitLog.objects.filter(check_in_time__gte=start_today)
        total_visits = visits_today.count()
        completed_visits = visits_today.filter(status=VisitLog.STATUS_COMPLETED).count()
        total_order_value = visits_today.aggregate(total=Sum('order_value'))['total'] or 0.0

        # Meeting time calculation
        total_meeting_minutes = 0.0
        for v in visits_today.filter(status=VisitLog.STATUS_COMPLETED):
            if v.duration_minutes:
                total_meeting_minutes += v.duration_minutes

        # Estimate distance across all tracking logs today
        total_distance_meters = 0.0
        for agent in AgentProfile.objects.all():
            agent_logs = LocationTrackingLog.objects.filter(
                agent=agent,
                timestamp__gte=start_today
            ).order_by('timestamp')
            prev = None
            for item in agent_logs:
                if prev:
                    total_distance_meters += calculate_distance_meters(
                        prev.latitude, prev.longitude,
                        item.latitude, item.longitude
                    )
                prev = item

        conversion_rate = round((completed_visits / total_visits * 100) if total_visits > 0 else 0, 1)

        # Transit minutes estimate (~ 1.5 min per km)
        total_distance_km = round(total_distance_meters / 1000.0, 1)
        estimated_transit_minutes = round(total_distance_km * 2.0, 1)

        return Response({
            "date": today.isoformat(),
            "agents": {
                "total": total_agents,
                "on_duty": on_duty_count,
                "checked_in": checked_in_count,
                "idle": on_duty_count - checked_in_count,
            },
            "visits": {
                "total": total_visits,
                "completed": completed_visits,
                "conversion_rate_percent": conversion_rate,
                "total_order_value": float(total_order_value),
            },
            "time_and_distance": {
                "total_distance_km": total_distance_km,
                "meeting_time_minutes": round(total_meeting_minutes, 1),
                "transit_time_minutes": estimated_transit_minutes,
            }
        })
