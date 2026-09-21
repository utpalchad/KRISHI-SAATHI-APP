from datetime import datetime
from statistics import mean, pstdev
from app.config import settings
from app.services.http import get_json

def _number(value):
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None

def _date(value):
    if not value:
        return None
    text = str(value).strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d %b %Y"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            pass
    return None

def _records(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("records", "data", "result", "items"):
            if isinstance(payload.get(key), list):
                return payload[key]
    return []

def _normalize(row):
    price = _number(row.get("modal_price") or row.get("Modal_Price") or row.get("price") or row.get("modalPrice"))
    minimum = _number(row.get("min_price") or row.get("Min_Price") or row.get("minPrice"))
    maximum = _number(row.get("max_price") or row.get("Max_Price") or row.get("maxPrice"))
    date_text = row.get("arrival_date") or row.get("Arrival_Date") or row.get("date") or row.get("last_updated")
    return {
        "market": row.get("market") or row.get("Market") or row.get("market_name") or "Mandi",
        "commodity": row.get("commodity") or row.get("Commodity"),
        "price": price,
        "modal_price": price,
        "min_price": minimum,
        "max_price": maximum,
        "date": date_text,
        "_date": _date(date_text),
        "unit": "₹/quintal",
    }

def _forecast(rows):
    usable = [r for r in rows if r.get("modal_price") is not None]
    usable.sort(key=lambda r: r.get("_date") or datetime.min)
    prices = [r["modal_price"] for r in usable][-30:]
    if len(prices) < 3:
        return {"available": False, "reason": "At least 3 historical price records are required."}

    recent = prices[-7:]
    x = list(range(len(recent)))
    xbar, ybar = mean(x), mean(recent)
    denom = sum((i - xbar) ** 2 for i in x)
    slope = sum((i - xbar) * (y - ybar) for i, y in zip(x, recent)) / denom if denom else 0
    baseline = recent[-1]
    predicted = [max(0, round(baseline + slope * day, 2)) for day in range(1, 8)]
    volatility = pstdev(recent) if len(recent) > 1 else 0
    margin = max(volatility * 1.5, baseline * 0.015)
    change_pct = ((predicted[-1] - baseline) / baseline * 100) if baseline else 0
    if change_pct > 1:
        trend = "rising"
    elif change_pct < -1:
        trend = "falling"
    else:
        trend = "stable"
    cv = volatility / mean(recent) if mean(recent) else 1
    confidence = "High" if len(prices) >= 14 and cv < .04 else "Moderate" if len(prices) >= 7 and cv < .10 else "Low"
    return {
        "available": True,
        "method": "7-day linear trend with recent-price volatility band",
        "days": 7,
        "trend": trend,
        "confidence": confidence,
        "current": round(baseline, 2),
        "forecast": [{"day": i + 1, "price": p, "low": round(max(0, p - margin), 2), "high": round(p + margin, 2)} for i, p in enumerate(predicted)],
        "range_low": round(min(p - margin for p in predicted), 2),
        "range_high": round(max(p + margin for p in predicted), 2),
        "change_pct": round(change_pct, 2),
        "disclaimer": "Statistical estimate from recent mandi prices, not a guaranteed future price.",
    }

async def market_data(commodity: str, state: str | None = None, district: str | None = None):
    if not settings.agmarknet_base_url:
        return {"source": "demo", "commodity": commodity, "records": [], "forecast": {"available": False, "reason": "Configure a market-data source to enable live prices and forecasting."}}
    url = settings.agmarknet_base_url.rstrip("/") + settings.agmarknet_daily_path
    params = {"commodity": commodity}
    if state:
        params["state"] = state
    if district:
        params["district"] = district
    headers = {"Accept": "application/json"}
    if settings.agmarknet_api_key:
        headers["X-API-Key"] = settings.agmarknet_api_key
    try:
        payload = await get_json(url, params=params, headers=headers)
        rows = [_normalize(r) for r in _records(payload)]
        rows = [r for r in rows if r["price"] is not None]
        rows.sort(key=lambda r: r.get("_date") or datetime.min, reverse=True)
        public_rows = [{k: v for k, v in r.items() if k != "_date"} for r in rows[:30]]
        latest = public_rows[0] if public_rows else {}
        return {
            "source": payload.get("source", "market-data") if isinstance(payload, dict) else "market-data",
            "commodity": commodity,
            "state": state,
            "district": district,
            "modal_price": latest.get("modal_price"),
            "min_price": latest.get("min_price"),
            "max_price": latest.get("max_price"),
            "records": public_rows,
            "forecast": _forecast(rows),
        }
    except Exception as exc:
        return {"source": "fallback", "commodity": commodity, "records": [], "forecast": {"available": False, "reason": "Market service unavailable."}, "message": str(exc)}
