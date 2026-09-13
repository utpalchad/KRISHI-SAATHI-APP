import asyncio
from app.providers.ai import ai_text

# Lightweight, explainable crop suitability engine using the farmer profile.
CROP_RULES = [
    {"crop":"Wheat","seasons":{"rabi"},"soils":{"loamy","clay","clayey","sandy loam"},"water":"irrigated","states":{"uttar pradesh","punjab","haryana","madhya pradesh","rajasthan","bihar"}},
    {"crop":"Chickpea","seasons":{"rabi"},"soils":{"loamy","sandy loam","black","clay"},"water":"both","states":{"uttar pradesh","madhya pradesh","rajasthan","maharashtra","karnataka","bihar"}},
    {"crop":"Mustard","seasons":{"rabi"},"soils":{"loamy","sandy","sandy loam","clay"},"water":"low","states":{"uttar pradesh","rajasthan","haryana","madhya pradesh","bihar","west bengal"}},
    {"crop":"Lentil","seasons":{"rabi"},"soils":{"loamy","sandy loam","clay"},"water":"low","states":{"uttar pradesh","madhya pradesh","bihar","west bengal"}},
    {"crop":"Rice","seasons":{"kharif","zaid"},"soils":{"clay","clayey","loamy"},"water":"irrigated","states":{"uttar pradesh","west bengal","punjab","bihar","odisha","andhra pradesh","telangana"}},
    {"crop":"Maize","seasons":{"kharif","rabi","zaid"},"soils":{"loamy","sandy loam","black"},"water":"both","states":{"karnataka","bihar","uttar pradesh","madhya pradesh","telangana","andhra pradesh","rajasthan"}},
    {"crop":"Pigeon Pea","seasons":{"kharif"},"soils":{"loamy","sandy loam","black"},"water":"low","states":{"maharashtra","karnataka","madhya pradesh","uttar pradesh","telangana","gujarat"}},
    {"crop":"Soybean","seasons":{"kharif"},"soils":{"black","loamy","clay"},"water":"both","states":{"madhya pradesh","maharashtra","rajasthan","karnataka"}},
    {"crop":"Groundnut","seasons":{"kharif","zaid"},"soils":{"sandy","sandy loam","loamy"},"water":"both","states":{"gujarat","andhra pradesh","telangana","karnataka","tamil nadu","rajasthan"}},
    {"crop":"Millet","seasons":{"kharif"},"soils":{"sandy","sandy loam","loamy"},"water":"low","states":{"rajasthan","haryana","gujarat","maharashtra","karnataka","uttar pradesh"}},
]


def _norm(value) -> str:
    return str(value or "").strip().lower()


def recommendations(profile: dict):
    """Rank crops from the saved farmer profile with transparent scoring."""
    season = _norm(profile.get("season"))
    soil = _norm(profile.get("soil_type"))
    state = _norm(profile.get("state"))
    current_crop = _norm(profile.get("current_crop"))
    irrigation = bool(profile.get("irrigation"))
    land = float(profile.get("land_size_acres") or 0)

    ranked = []
    for rule in CROP_RULES:
        crop = rule["crop"]
        if _norm(crop) == current_crop:
            continue

        score = 50
        reasons = []

        if season in rule["seasons"]:
            score += 20
            reasons.append(f"{profile.get('season') or 'Current'}-season fit")
        else:
            score -= 25

        if soil in rule["soils"]:
            score += 15
            reasons.append(f"Suitable for {profile.get('soil_type') or 'your'} soil")
        elif soil:
            score -= 5

        if state in rule["states"]:
            score += 10
            reasons.append(f"Commonly suitable in {profile.get('state')}")

        if rule["water"] == "irrigated":
            if irrigation:
                score += 10
                reasons.append("Irrigation available")
            else:
                score -= 18
                reasons.append("Needs reliable irrigation")
        elif rule["water"] == "low":
            if not irrigation:
                score += 8
                reasons.append("Lower irrigation dependence")
            else:
                score += 3
                reasons.append("Works with available irrigation")
        elif irrigation:
            score += 5
            reasons.append("Irrigation gives flexibility")

        if 0 < land <= 2 and crop in {"Chickpea", "Lentil", "Mustard", "Millet"}:
            score += 3
            reasons.append("Practical option for a small holding")

        ranked.append({"crop": crop, "score": max(1, min(99, score)), "reasons": reasons})

    ranked.sort(key=lambda item: (-item["score"], item["crop"]))
    return {
        "source": "profile-rule-engine",
        "profile": profile,
        "personalized": True,
        "based_on": ["state", "district", "soil_type", "land_size_acres", "irrigation", "current_crop", "season"],
        "recommendations": ranked[:3],
        "disclaimer": "Prototype suitability guidance. Verify local soil, water and weather conditions before planting.",
    }


async def farm_brief(profile: dict, weather: dict | None = None, market: dict | None = None):
    """Return a fast farm brief with a strict AI timeout and deterministic fallback.

    The home page calls this endpoint during startup, so a provider retry/outage must
    never hold the page open for 10+ seconds.
    """
    context = {"profile": profile, "weather": weather, "market": market}
    prompt = "Create a short Today's Farm Brief with 3-5 prioritized actions for the farmer using this context. Do not invent data. Label demo sources.\n" + str(context)

    try:
        # Keep startup latency bounded even when the AI provider is overloaded.
        return {"source": "AI", "brief": await asyncio.wait_for(ai_text(prompt), timeout=3.0)}
    except (asyncio.TimeoutError, Exception):
        actions = []
        condition = (weather or {}).get("condition")
        advice = (weather or {}).get("advice")
        price = (market or {}).get("modal_price")

        if condition:
            actions.append(f"Weather: {condition}.")
        if advice:
            actions.append(f"Weather action: {advice}")
        if price is not None:
            actions.append(f"Market: current configured modal price is ₹{price}.")
        actions.append(f"Crop: monitor {profile.get('current_crop') or 'your crop'} and check the field before irrigation or spraying.")
        actions.append("Verify local field conditions before taking any major farm action.")

        return {
            "source": "fast-fallback",
            "brief": " ".join(actions[:5]),
            "ai_fallback": True,
            "disclaimer": "AI brief timed out or was unavailable; this is a deterministic farm-context fallback.",
        }
