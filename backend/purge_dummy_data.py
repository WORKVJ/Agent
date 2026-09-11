import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from tracking.models import AgentProfile, ClientLocation, VisitLog, LocationTrackingLog

def purge_data():
    print("Purging all dummy and mock data...")
    
    # 1. Clear all visit logs and location breadcrumbs
    v_count, _ = VisitLog.objects.all().delete()
    print(f"Deleted {v_count} visit records.")

    l_count, _ = LocationTrackingLog.objects.all().delete()
    print(f"Deleted {l_count} location tracking logs.")

    # 2. Clear all dummy client locations
    c_count, _ = ClientLocation.objects.all().delete()
    print(f"Deleted {c_count} client location targets.")

    # 3. Clear all dummy agent profiles and agent users
    a_count, _ = AgentProfile.objects.all().delete()
    print(f"Deleted {a_count} agent profiles.")

    u_count, _ = User.objects.filter(is_superuser=False, is_staff=False).delete()
    print(f"Deleted {u_count} dummy agent user accounts.")

    # 4. Ensure clean Manager/Admin account exists
    admin_user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'first_name': 'System',
            'last_name': 'Administrator',
            'email': 'admin@agentpulse.com',
            'is_staff': True,
            'is_superuser': True
        }
    )
    admin_user.set_password('AdminPass123!')
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()

    print("\n[OK] Clean state achieved!")
    print(f"Remaining Users: {[u.username for u in User.objects.all()]}")
    print(f"Remaining Agents: {AgentProfile.objects.count()}")
    print(f"Remaining Clients: {ClientLocation.objects.count()}")
    print(f"Remaining Visits: {VisitLog.objects.count()}")
    print("Admin login: username='admin', password='AdminPass123!'")

if __name__ == '__main__':
    purge_data()
