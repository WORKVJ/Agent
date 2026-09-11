from geopy.distance import geodesic
import math

def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate high-precision geodetic distance in meters between two coordinates (WGS-84 ellipsoid).
    Matches PostGIS ST_DWithin(geom1::geography, geom2::geography, tolerance) precision.
    """
    if None in (lat1, lon1, lat2, lon2):
        return float('inf')
    point1 = (lat1, lon1)
    point2 = (lat2, lon2)
    return geodesic(point1, point2).meters

def is_within_geofence(agent_lat: float, agent_lon: float, client_lat: float, client_lon: float, radius_meters: float = 50.0) -> tuple[bool, float]:
    """
    Verify if the agent is within `radius_meters` (default 50m) of the target client location.
    Returns: (is_within, exact_distance_meters)
    """
    distance = calculate_distance_meters(agent_lat, agent_lon, client_lat, client_lon)
    return (distance <= radius_meters, round(distance, 2))
