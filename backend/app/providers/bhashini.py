import httpx
from app.config import settings


def _headers():
    if not settings.sarvam_api_key:
        return {}
    return {"Authorization": f"Bearer {settings.sarvam_api_key}"}


def _code(language: str) -> str:
    if not language:
        return "en-IN"
    value = language.strip()
    if value in {"auto", "unknown"}:
        return "unknown"
    return value if "-" in value else f"{value}-IN"


async def translate(text: str, source_language: str, target_language: str):
    if not settings.sarvam_api_key:
        return {"source": "unconfigured", "text": text, "translated_text": text, "error": "SARVAM_API_KEY is not configured."}
    payload = {"input": text, "source_language_code": _code(source_language), "target_language_code": _code(target_language), "model": settings.sarvam_translate_model, "mode": "formal"}
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(f"{settings.sarvam_base_url}/translate", json=payload, headers=_headers())
        response.raise_for_status()
        data = response.json()
    return {"source": "sarvam", "text": text, "translated_text": data.get("translated_text", ""), "source_language_code": data.get("source_language_code", _code(source_language)), "request_id": data.get("request_id")}


async def speech_to_text(audio: bytes, language: str, mime_type: str = "audio/wav"):
    if not settings.sarvam_api_key:
        return {"source": "unconfigured", "text": "", "error": "SARVAM_API_KEY is not configured."}
    files = {"file": ("audio", audio, mime_type)}
    data = {"model": settings.sarvam_stt_model, "language_code": _code(language)}
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(f"{settings.sarvam_base_url}/speech-to-text", files=files, data=data, headers=_headers())
        response.raise_for_status()
        result = response.json()
    transcript = result.get("transcript", "")
    return {"source": "sarvam", "text": transcript, "transcript": transcript, "language_code": result.get("language_code"), "request_id": result.get("request_id")}


async def text_to_speech(text: str, language: str):
    if not settings.sarvam_api_key:
        return {"source": "unconfigured", "audioContent": None, "error": "SARVAM_API_KEY is not configured."}
    payload = {"text": text, "target_language_code": _code(language), "model": settings.sarvam_tts_model, "speaker": "shubh", "speech_sample_rate": 24000}
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(f"{settings.sarvam_base_url}/text-to-speech", json=payload, headers=_headers())
        response.raise_for_status()
        result = response.json()
    audio = result.get("audios", [None])[0]
    return {"source": "sarvam", "audioContent": audio, "audio_content": audio, "request_id": result.get("request_id")}
