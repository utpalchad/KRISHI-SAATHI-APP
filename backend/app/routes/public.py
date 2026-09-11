from fastapi import APIRouter, UploadFile, File, Request
from app.schemas import *
from app.providers.weather import current_weather
from app.providers.market import market_data
from app.providers.gov import government_data
from app.providers.bhashini import speech_to_text, text_to_speech, translate
from app.providers.ai import ai_text, crop_health
from app.services.farm import recommendations, farm_brief

router = APIRouter(prefix="/api")

@router.get("/health")
async def health():
    return {"status": "ok", "service": "Krishi Saathi"}

@router.post("/chat")
async def chat(req: ChatRequest):
    prompt = f"Farmer profile: {req.profile.model_dump()}\nFarmer question: {req.message}\nAnswer in the farmer's language ({req.profile.language}) unless asked otherwise."
    return {"answer": await ai_text(prompt)}

@router.post("/recommendations")
async def crop_recommendations(req: RecommendationRequest):
    return recommendations(req.profile.model_dump())

@router.post("/farm-brief")
async def brief(req: FarmBriefRequest):
    weather = await current_weather(req.profile.district)
    market = await market_data(req.profile.current_crop or "Wheat", req.profile.state, req.profile.district)
    return await farm_brief(req.profile.model_dump(), weather, market)

@router.post("/weather")
async def weather(req: WeatherRequest):
    return await current_weather(req.city, req.country)

@router.post("/market")
async def market(req: MarketRequest):
    return await market_data(req.commodity, req.state, req.district)

@router.get("/government")
async def government(request: Request):
    return await government_data(dict(request.query_params))

@router.post("/translate")
async def translate_route(req: TranslateRequest):
    return await translate(req.text, req.source_language, req.target_language)

@router.post("/voice/tts")
async def tts(req: TTSRequest):
    return await text_to_speech(req.text, req.language)

@router.post("/voice/stt")
async def stt(language: str = "hi", file: UploadFile = File(...)):
    data = await file.read()
    return await speech_to_text(data, language, file.content_type or "audio/wav")

@router.post("/crop-health")
async def health_analysis(file: UploadFile = File(...)):
    data = await file.read()
    return {"analysis": await crop_health(data, file.content_type or "image/jpeg"), "disclaimer": "Prototype AI-assisted analysis; not a confirmed diagnosis."}
