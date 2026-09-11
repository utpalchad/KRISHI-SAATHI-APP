from app.config import settings
from app.services.http import get_json

async def current_weather(city: str, country: str = "IN"):
    if not settings.openweather_api_key:
        return {"source": "demo", "city": city, "temperature_c": 32, "humidity": 68, "wind_mps": 3.2, "condition": "Partly cloudy"}
    try:
        data = await get_json(f"{settings.openweather_base_url}/weather", params={
            "q": f"{city},{country}", "appid": settings.openweather_api_key, "units": "metric"
        })
    except Exception:
        return {"source": "fallback", "city": city, "temperature_c": 32, "humidity": 68, "wind_mps": 3.2, "condition": "Weather service unavailable", "advice": "Check local conditions before irrigating or spraying."}
    return {
        "source": "OpenWeather", "city": data.get("name", city),
        "temperature_c": data.get("main", {}).get("temp"),
        "humidity": data.get("main", {}).get("humidity"),
        "wind_mps": data.get("wind", {}).get("speed"),
        "condition": (data.get("weather") or [{}])[0].get("description")
    }
