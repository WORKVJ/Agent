import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User

def ensure_admin():
    admin_u, created = User.objects.get_or_create(
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
    print(f"[OK] Admin account verified: username='admin', password='AdminPass123!' (created={created})")

if __name__ == '__main__':
    ensure_admin()
