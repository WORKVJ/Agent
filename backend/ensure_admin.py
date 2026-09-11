import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from tracking.models import AgentProfile

def ensure_accounts():
    # 1. Ensure System Administrator
    admin_u, a_created = User.objects.get_or_create(
        username='admin',
        defaults={
            'first_name': 'System',
            'last_name': 'Administrator',
            'email': 'admin@agentpulse.com',
            'is_staff': True,
            'is_superuser': True
        }
    )
    admin_u.set_password('AdminPass123!')
    admin_u.is_staff = True
    admin_u.is_superuser = True
    admin_u.save()
    print(f"[OK] Admin account: username='admin', password='AdminPass123!' (created={a_created})")

    # 2. Ensure Agent Vijay Pn (Employee ID 1021)
    vijay_u, v_created = User.objects.get_or_create(
        username='vijay',
        defaults={
            'first_name': 'Vijay',
            'last_name': 'Pn',
            'email': 'vijay@agentpulse.com'
        }
    )
    vijay_u.set_password('AgentPass123!')
    vijay_u.save()

    vijay_prof, vp_created = AgentProfile.objects.get_or_create(
        user=vijay_u,
        defaults={
            'employee_id': '1021',
            'phone_number': '8113900760',
            'battery_level': 90,
            'is_on_duty': False,
            'current_status': AgentProfile.STATUS_OFF_DUTY
        }
    )
    print(f"[OK] Field Agent: username='vijay', badge='1021', password='AgentPass123!'")

    # 3. Ensure Agent Sarah Jenkins (Employee ID AGT-002)
    sarah_u, s_created = User.objects.get_or_create(
        username='sarah',
        defaults={
            'first_name': 'Sarah',
            'last_name': 'Jenkins',
            'email': 'sarah@agentpulse.com'
        }
    )
    sarah_u.set_password('AgentPass123!')
    sarah_u.save()

    AgentProfile.objects.get_or_create(
        user=sarah_u,
        defaults={
            'employee_id': 'AGT-002',
            'phone_number': '+1-555-0198',
            'battery_level': 85,
            'is_on_duty': False,
            'current_status': AgentProfile.STATUS_OFF_DUTY
        }
    )
    print(f"[OK] Field Agent: username='sarah', badge='AGT-002', password='AgentPass123!'")

if __name__ == '__main__':
    ensure_accounts()
