from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from .geoutils import calculate_distance_meters, is_within_geofence


class AgentProfile(models.Model):
    STATUS_OFF_DUTY = 'OFF_DUTY'
    STATUS_IDLE = 'IDLE'
    STATUS_MOVING = 'MOVING'
    STATUS_CHECKED_IN = 'CHECKED_IN'

    STATUS_CHOICES = [
        (STATUS_OFF_DUTY, 'Off Duty'),
        (STATUS_IDLE, 'Idle'),
        (STATUS_MOVING, 'Moving'),
        (STATUS_CHECKED_IN, 'Checked In'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agent_profile')
    employee_id = models.CharField(max_length=50, unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    is_on_duty = models.BooleanField(default=False)
    current_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OFF_DUTY)
    battery_level = models.IntegerField(default=100)  # Percentage (0-100)
    last_latitude = models.FloatField(null=True, blank=True)
    last_longitude = models.FloatField(null=True, blank=True)
    last_speed = models.FloatField(default=0.0)  # km/h
    last_seen_at = models.DateTimeField(null=True, blank=True)

    def update_location(self, lat: float, lng: float, speed: float = 0.0, battery: int = 100):
        self.last_latitude = lat
        self.last_longitude = lng
        self.last_speed = speed
        self.battery_level = max(0, min(100, battery))
        self.last_seen_at = timezone.now()
        if self.is_on_duty:
            # If not in an active meeting, determine if moving or idle
            active_visit = self.visits.filter(status=VisitLog.STATUS_IN_PROGRESS).first()
            if active_visit:
                self.current_status = self.STATUS_CHECKED_IN
            elif speed > 3.0:
                self.current_status = self.STATUS_MOVING
            else:
                self.current_status = self.STATUS_IDLE
        else:
            self.current_status = self.STATUS_OFF_DUTY
        self.save()

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.employee_id})"


class ClientLocation(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField()
    contact_person = models.CharField(max_length=150, blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    geofence_radius_meters = models.FloatField(default=50.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_agent_inside(self, agent_lat: float, agent_lng: float) -> tuple[bool, float]:
        """Check if coordinates fall inside the client's geofence perimeter."""
        return is_within_geofence(agent_lat, agent_lng, self.latitude, self.longitude, self.geofence_radius_meters)

    def __str__(self):
        return f"{self.name} ({self.address[:30]})"


class LocationTrackingLog(models.Model):
    agent = models.ForeignKey(AgentProfile, on_delete=models.CASCADE, related_name='location_logs')
    latitude = models.FloatField()
    longitude = models.FloatField()
    speed = models.FloatField(default=0.0)  # km/h
    battery_level = models.IntegerField(default=100)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['agent', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.agent.employee_id} at ({self.latitude}, {self.longitude}) @ {self.timestamp}"


class VisitLog(models.Model):
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_CANCELLED = 'CANCELLED'

    STATUS_CHOICES = [
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    agent = models.ForeignKey(AgentProfile, on_delete=models.CASCADE, related_name='visits')
    client = models.ForeignKey(ClientLocation, on_delete=models.CASCADE, related_name='visits')
    check_in_time = models.DateTimeField(default=timezone.now)
    check_out_time = models.DateTimeField(null=True, blank=True)
    check_in_latitude = models.FloatField()
    check_in_longitude = models.FloatField()
    distance_at_checkin = models.FloatField(help_text="Exact distance from client geofence center in meters at check-in")
    meeting_notes = models.TextField(blank=True)
    order_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    follow_up_date = models.DateField(null=True, blank=True)
    photo = models.ImageField(upload_to='visit_photos/', null=True, blank=True)
    selfie_image = models.TextField(blank=True, default='', help_text="Watermarked selfie punch image (base64 or URL)")
    attachment_image = models.TextField(blank=True, default='', help_text="Discussion attachment image (base64 or URL)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_IN_PROGRESS)

    class Meta:
        ordering = ['-check_in_time']

    @property
    def duration_minutes(self):
        if self.check_in_time and self.check_out_time:
            delta = self.check_out_time - self.check_in_time
            return round(delta.total_seconds() / 60.0, 1)
        return None

    def __str__(self):
        return f"Visit by {self.agent.employee_id} to {self.client.name} ({self.status})"
