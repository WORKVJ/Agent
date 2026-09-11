from django.urls import path
from .views import (
    CheckInAPIView, CheckOutAPIView, LocationPingAPIView,
    DutyToggleAPIView, AgentListAPIView, ClientListAPIView,
    VisitListAPIView, RouteReplayAPIView, AnalyticsSummaryAPIView,
    AuthLoginAPIView
)

urlpatterns = [
    path('auth/login/', AuthLoginAPIView.as_view(), name='api_auth_login'),
    path('check-in/', CheckInAPIView.as_view(), name='api_check_in'),
    path('check-out/', CheckOutAPIView.as_view(), name='api_check_out'),
    path('location/ping/', LocationPingAPIView.as_view(), name='api_location_ping'),
    path('duty/', DutyToggleAPIView.as_view(), name='api_duty_toggle'),
    path('agents/', AgentListAPIView.as_view(), name='api_agents_list'),
    path('clients/', ClientListAPIView.as_view(), name='api_clients_list'),
    path('visits/', VisitListAPIView.as_view(), name='api_visits_list'),
    path('routes/<int:agent_id>/', RouteReplayAPIView.as_view(), name='api_route_replay'),
    path('analytics/', AnalyticsSummaryAPIView.as_view(), name='api_analytics_summary'),
]
