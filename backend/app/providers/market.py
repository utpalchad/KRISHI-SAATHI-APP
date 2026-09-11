from app.config import settings
from app.services.http import get_json

async def market_data(commodity: str, state: str | None = None, district: str | None = None):
    if not settings.agmarknet_base_url:
        return {"source": "demo", "commodity": commodity, "records": [
            {"market": "Demo Mandi", "commodity": commodity, "price": 2450, "unit": "₹/quintal", "last_updated": "demo"}
        ]}
    url = settings.agmarknet_base_url.rstrip("/") + settings.agmarknet_daily_path
    params = {"commodity": commodity}
    if state: params["state"] = state
    if district: params["district"] = district
    headers = {"Accept": "application/json"}
    if settings.agmarknet_api_key:
        headers["X-API-Key"] = settings.agmarknet_api_key
    try:
        return await get_json(url, params=params, headers=headers)
    except Exception:
        return {"source": "fallback", "commodity": commodity, "records": [], "message": "Market service unavailable; no live price is shown."}
