import math

from app.models.enums import TerritoryKind
from app.models.inspection import InspectionEvent
from app.models.territory import Territory


def territory_matches(territory: Territory, event: InspectionEvent) -> bool:
    if territory.kind == TerritoryKind.ZIP:
        return bool(event.postal_code) and event.postal_code == territory.value

    if territory.kind in (TerritoryKind.BOROUGH, TerritoryKind.LOCAL_AUTHORITY):
        return bool(event.municipality) and event.municipality.strip().lower() == territory.value.strip().lower()

    if territory.kind == TerritoryKind.RADIUS:
        return _within_radius(territory.value, event.latitude, event.longitude)

    if territory.kind == TerritoryKind.CITY:
        # value holds the city's id (as a string) — matches every event in
        # that city regardless of zip. Created when a client picks a city
        # at signup but leaves zip codes empty (see auth_service.signup).
        return str(event.city_id) == territory.value

    return False


def _within_radius(value: str, latitude: float | None, longitude: float | None) -> bool:
    if latitude is None or longitude is None:
        return False
    try:
        center_lat_str, center_lon_str, radius_km_str = (part.strip() for part in value.split(","))
        center_lat, center_lon, radius_km = float(center_lat_str), float(center_lon_str), float(radius_km_str)
    except ValueError:
        return False
    return _haversine_km(center_lat, center_lon, float(latitude), float(longitude)) <= radius_km


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * earth_radius_km * math.asin(math.sqrt(a))
