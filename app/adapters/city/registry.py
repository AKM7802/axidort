from app.adapters.city.base import CityAdapter
from app.adapters.city.chicago import ChicagoAdapter

CITY_ADAPTERS: dict[str, type[CityAdapter]] = {
    "chicago": ChicagoAdapter,
}


def get_adapter(city: str) -> CityAdapter:
    try:
        return CITY_ADAPTERS[city]()
    except KeyError:
        raise ValueError(f"no adapter registered for city '{city}'") from None
