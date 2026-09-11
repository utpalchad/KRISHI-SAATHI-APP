from app.providers.ai import ai_text

DEMO_CROPS = [
    {"crop": "Wheat", "score": 92, "reasons": ["Soil compatibility", "Rabi-season fit", "Irrigation available"]},
    {"crop": "Chickpea", "score": 87, "reasons": ["Soil compatibility", "Lower water requirement", "Season fit"]},
    {"crop": "Mustard", "score": 78, "reasons": ["Season fit", "Suitable water profile"]},
]

def recommendations(profile: dict):
    return {"source": "demo-rule-engine", "profile": profile, "recommendations": DEMO_CROPS}

async def farm_brief(profile: dict, weather: dict | None = None, market: dict | None = None):
    context = {"profile": profile, "weather": weather, "market": market}
    prompt = "Create a short Today's Farm Brief with 3-5 prioritized actions for the farmer using this context. Do not invent data. Label demo sources.\n" + str(context)
    return {"source": "AI", "brief": await ai_text(prompt)}
