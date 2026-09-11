from rest_framework import serializers
from django.contrib.auth.models import User
from .models import AgentProfile, ClientLocation, LocationTrackingLog, VisitLog


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class ClientLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientLocation
        fields = [
            'id', 'name', 'address', 'contact_person', 'contact_phone',
            'latitude', 'longitude', 'geofence_radius_meters', 'created_at'
        ]


class AgentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    active_visit = serializers.SerializerMethodField()

    class Meta:
        model = AgentProfile
        fields = [
            'id', 'user', 'employee_id', 'full_name', 'phone_number',
            'is_on_duty', 'current_status', 'battery_level',
            'last_latitude', 'last_longitude', 'last_speed',
            'last_seen_at', 'active_visit'
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_active_visit(self, obj):
        visit = obj.visits.filter(status=VisitLog.STATUS_IN_PROGRESS).first()
        if visit:
            return {
                'id': visit.id,
                'client_id': visit.client.id,
                'client_name': visit.client.name,
                'check_in_time': visit.check_in_time,
                'distance_at_checkin': visit.distance_at_checkin
            }
        return None


class LocationTrackingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationTrackingLog
        fields = ['id', 'agent', 'latitude', 'longitude', 'speed', 'battery_level', 'timestamp']


class VisitLogSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(source='agent.user.get_full_name', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_address = serializers.CharField(source='client.address', read_only=True)
    duration_minutes = serializers.ReadOnlyField()

    class Meta:
        model = VisitLog
        fields = [
            'id', 'agent', 'agent_name', 'client', 'client_name', 'client_address',
            'check_in_time', 'check_out_time', 'check_in_latitude', 'check_in_longitude',
            'distance_at_checkin', 'meeting_notes', 'order_value', 'follow_up_date',
            'photo', 'selfie_image', 'attachment_image', 'status', 'duration_minutes'
        ]


class CheckInRequestSerializer(serializers.Serializer):
    agent_id = serializers.IntegerField(required=True)
    client_id = serializers.IntegerField(required=False, allow_null=True)
    client_name = serializers.CharField(required=False, allow_blank=True, default='')
    client_address = serializers.CharField(required=False, allow_blank=True, default='')
    latitude = serializers.FloatField(required=True)
    longitude = serializers.FloatField(required=True)
    selfie_image = serializers.CharField(required=False, allow_blank=True, default='')


class CheckOutRequestSerializer(serializers.Serializer):
    visit_id = serializers.IntegerField(required=True)
    meeting_notes = serializers.CharField(required=False, allow_blank=True, default='')
    order_value = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.0)
    follow_up_date = serializers.DateField(required=False, allow_null=True)
    photo = serializers.ImageField(required=False, allow_null=True)
    attachment_image = serializers.CharField(required=False, allow_blank=True, default='')


class LocationPingSerializer(serializers.Serializer):
    agent_id = serializers.IntegerField(required=True)
    latitude = serializers.FloatField(required=True)
    longitude = serializers.FloatField(required=True)
    speed = serializers.FloatField(required=False, default=0.0)
    battery_level = serializers.IntegerField(required=False, default=100)


class DutyToggleSerializer(serializers.Serializer):
    agent_id = serializers.IntegerField(required=True)
    is_on_duty = serializers.BooleanField(required=True)
