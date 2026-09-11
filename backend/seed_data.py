import os
import django
import random
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from tracking.models import AgentProfile, ClientLocation, VisitLog, LocationTrackingLog

def run_seed():
    print("Clearing previous seed data...")
    VisitLog.objects.all().delete()
    LocationTrackingLog.objects.all().delete()
    ClientLocation.objects.all().delete()
    AgentProfile.objects.all().delete()
    User.objects.filter(username__startswith='agent_').delete()

    print("Creating / Ensuring Admin Superuser...")
    admin_user, _ = User.objects.get_or_create(
        username='admin',
        defaults={'email': 'admin@agentpulse.com', 'first_name': 'System', 'last_name': 'Administrator', 'is_staff': True, 'is_superuser': True}
    )
    admin_user.set_password('AdminPassword123!')
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()
    print("Admin Superuser ready (admin / AdminPassword123!)")

    print("Creating Client Locations...")
    clients_data = [
        {
            "name": "Apex Electronics MegaStore",
            "address": "750 7th Ave, New York, NY 10019",
            "contact_person": "Robert Vance",
            "contact_phone": "+1 212-555-0142",
            "latitude": 40.7608,
            "longitude": -73.9831,
            "radius": 50.0
        },
        {
            "name": "Summit Medical Supplies",
            "address": "450 Lexington Ave, New York, NY 10017",
            "contact_person": "Dr. Aris Thorne",
            "contact_phone": "+1 212-555-0189",
            "latitude": 40.7532,
            "longitude": -73.9749,
            "radius": 50.0
        },
        {
            "name": "Horizon Organic Supermarket",
            "address": "10 Columbus Cir, New York, NY 10019",
            "contact_person": "Claire Bennet",
            "contact_phone": "+1 212-555-0177",
            "latitude": 40.7685,
            "longitude": -73.9818,
            "radius": 50.0
        },
        {
            "name": "Beacon Hardware & Tools",
            "address": "520 8th Ave, New York, NY 10018",
            "contact_person": "Jack Miller",
            "contact_phone": "+1 212-555-0112",
            "latitude": 40.7538,
            "longitude": -73.9922,
            "radius": 50.0
        },
        {
            "name": "Empire Fashion Boutique",
            "address": "350 5th Ave, New York, NY 10118",
            "contact_person": "Sophia Lorenzi",
            "contact_phone": "+1 212-555-0193",
            "latitude": 40.7484,
            "longitude": -73.9857,
            "radius": 50.0
        }
    ]

    client_objs = []
    for c in clients_data:
        obj = ClientLocation.objects.create(
            name=c["name"],
            address=c["address"],
            contact_person=c["contact_person"],
            contact_phone=c["contact_phone"],
            latitude=c["latitude"],
            longitude=c["longitude"],
            geofence_radius_meters=c["radius"]
        )
        client_objs.append(obj)
    print(f"Created {len(client_objs)} clients.")

    print("Creating Field Agents...")
    agents_data = [
        {
            "username": "agent_sarah",
            "first_name": "Sarah",
            "last_name": "Jenkins",
            "employee_id": "AGT-101",
            "phone": "+1 555-0101",
            "is_on_duty": True,
            "current_status": AgentProfile.STATUS_MOVING,
            "battery": 88,
            "lat": 40.7562,
            "lng": -73.9860,
            "speed": 19.4
        },
        {
            "username": "agent_marcus",
            "first_name": "Marcus",
            "last_name": "Chen",
            "employee_id": "AGT-102",
            "phone": "+1 555-0102",
            "is_on_duty": True,
            "current_status": AgentProfile.STATUS_CHECKED_IN,
            "battery": 94,
            "lat": 40.7608,
            "lng": -73.9831,
            "speed": 0.0
        },
        {
            "username": "agent_elena",
            "first_name": "Elena",
            "last_name": "Rostova",
            "employee_id": "AGT-103",
            "phone": "+1 555-0103",
            "is_on_duty": True,
            "current_status": AgentProfile.STATUS_IDLE,
            "battery": 72,
            "lat": 40.7510,
            "lng": -73.9780,
            "speed": 1.2
        },
        {
            "username": "agent_david",
            "first_name": "David",
            "last_name": "Kim",
            "employee_id": "AGT-104",
            "phone": "+1 555-0104",
            "is_on_duty": False,
            "current_status": AgentProfile.STATUS_OFF_DUTY,
            "battery": 42,
            "lat": 40.7450,
            "lng": -73.9900,
            "speed": 0.0
        }
    ]

    agent_objs = []
    for a in agents_data:
        u = User.objects.create_user(
            username=a["username"],
            first_name=a["first_name"],
            last_name=a["last_name"],
            email=f"{a['username']}@company.com",
            password="AgentPassword123!"
        )
        ap = AgentProfile.objects.create(
            user=u,
            employee_id=a["employee_id"],
            phone_number=a["phone"],
            is_on_duty=a["is_on_duty"],
            current_status=a["current_status"],
            battery_level=a["battery"],
            last_latitude=a["lat"],
            last_longitude=a["lng"],
            last_speed=a["speed"],
            last_seen_at=timezone.now()
        )
        agent_objs.append(ap)
    print(f"Created {len(agent_objs)} agents.")

    # Create an active visit for Marcus at Apex Electronics (client 0)
    v_active = VisitLog.objects.create(
        agent=agent_objs[1],
        client=client_objs[0],
        check_in_time=timezone.now() - timedelta(minutes=24),
        check_in_latitude=client_objs[0].latitude + 0.0001,
        check_in_longitude=client_objs[0].longitude,
        distance_at_checkin=11.2,
        status=VisitLog.STATUS_IN_PROGRESS
    )

    # Create completed visits for Sarah earlier today
    now = timezone.now()
    VisitLog.objects.create(
        agent=agent_objs[0],
        client=client_objs[3], # Beacon Hardware
        check_in_time=now - timedelta(hours=3, minutes=15),
        check_out_time=now - timedelta(hours=2, minutes=30),
        check_in_latitude=client_objs[3].latitude,
        check_in_longitude=client_objs[3].longitude,
        distance_at_checkin=8.5,
        meeting_notes="Met with GM Jack Miller. Replenished safety equipment inventory. Requested quote for power drill assortment.",
        order_value=6850.00,
        follow_up_date=(now + timedelta(days=7)).date(),
        status=VisitLog.STATUS_COMPLETED
    )

    VisitLog.objects.create(
        agent=agent_objs[0],
        client=client_objs[4], # Empire Fashion
        check_in_time=now - timedelta(hours=1, minutes=45),
        check_out_time=now - timedelta(hours=1, minutes=10),
        check_in_latitude=client_objs[4].latitude,
        check_in_longitude=client_objs[4].longitude,
        distance_at_checkin=14.1,
        meeting_notes="Reviewed seasonal line display. Order processed for Q4 inventory.",
        order_value=12400.00,
        follow_up_date=(now + timedelta(days=14)).date(),
        status=VisitLog.STATUS_COMPLETED
    )

    # Generate historical GPS route logs for Sarah (for Route Replay demonstration)
    print("Generating GPS route logs for Agent Sarah...")
    base_time = now - timedelta(hours=4)
    start_lat, start_lng = 40.7420, -73.9930
    current_lat, current_lng = start_lat, start_lng
    battery = 98

    # Sequence of target waypoints
    waypoints = [
        (40.7538, -73.9922), # Beacon Hardware
        (40.7484, -73.9857), # Empire Fashion
        (40.7562, -73.9860), # Current location
    ]

    for wp_lat, wp_lng in waypoints:
        steps = 15
        d_lat = (wp_lat - current_lat) / steps
        d_lng = (wp_lng - current_lng) / steps
        for s in range(steps):
            current_lat += d_lat + (random.random() - 0.5) * 0.0003
            current_lng += d_lng + (random.random() - 0.5) * 0.0003
            base_time += timedelta(minutes=4)
            battery = max(20, battery - 1)
            speed = round(random.uniform(12.0, 32.0), 1)

            LocationTrackingLog.objects.create(
                agent=agent_objs[0],
                latitude=round(current_lat, 6),
                longitude=round(current_lng, 6),
                speed=speed,
                battery_level=battery,
                timestamp=base_time
            )

        # Add 3 stationary stop points at the waypoint (meeting time)
        for stop_i in range(3):
            base_time += timedelta(minutes=10)
            LocationTrackingLog.objects.create(
                agent=agent_objs[0],
                latitude=round(wp_lat, 6),
                longitude=round(wp_lng, 6),
                speed=0.5,
                battery_level=battery,
                timestamp=base_time
            )

    print("Seed data successfully populated!")

if __name__ == '__main__':
    run_seed()
