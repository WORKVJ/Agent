from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import AgentProfile, ClientLocation, LocationTrackingLog, VisitLog


class AgentProfileInline(admin.StackedInline):
    model = AgentProfile
    can_delete = False
    verbose_name_plural = 'Agent Profile'
    fk_name = 'user'


class UserAdmin(BaseUserAdmin):
    inlines = (AgentProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_employee_id', 'get_duty_status')

    def get_employee_id(self, instance):
        if hasattr(instance, 'agent_profile'):
            return instance.agent_profile.employee_id
        return '-'
    get_employee_id.short_description = 'Employee ID'

    def get_duty_status(self, instance):
        if hasattr(instance, 'agent_profile'):
            return 'ON DUTY' if instance.agent_profile.is_on_duty else 'OFF DUTY'
        return '-'
    get_duty_status.short_description = 'Duty Status'


# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(AgentProfile)
class AgentProfileAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'user_full_name', 'phone_number', 'is_on_duty', 'current_status', 'battery_level', 'last_seen_at')
    list_filter = ('is_on_duty', 'current_status')
    search_fields = ('employee_id', 'user__username', 'user__first_name', 'user__last_name', 'phone_number')
    readonly_fields = ('last_seen_at',)

    def user_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    user_full_name.short_description = 'Agent Name'


@admin.register(ClientLocation)
class ClientLocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_person', 'contact_phone', 'latitude', 'longitude', 'geofence_radius_meters', 'created_at')
    search_fields = ('name', 'address', 'contact_person', 'contact_phone')


@admin.register(VisitLog)
class VisitLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'agent', 'client', 'check_in_time', 'check_out_time', 'duration_minutes', 'status', 'order_value')
    list_filter = ('status', 'client', 'agent')
    search_fields = ('agent__employee_id', 'agent__user__username', 'client__name', 'meeting_notes')
    readonly_fields = ('check_in_time',)


@admin.register(LocationTrackingLog)
class LocationTrackingLogAdmin(admin.ModelAdmin):
    list_display = ('agent', 'latitude', 'longitude', 'speed', 'battery_level', 'timestamp')
    list_filter = ('agent',)
    search_fields = ('agent__employee_id', 'agent__user__username')
    readonly_fields = ('timestamp',)
