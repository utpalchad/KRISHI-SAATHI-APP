import base64
from app.config import settings
from app.services.http import post_json

# Bhashini exposes multiple pipelines. The exact pipeline/service payload is assigned by the
# Bhashini account. Keep it configurable rather than hard-coding a guessed pipeline contract.

def _headers():
    h = {"Content-Type": "application/json"}
    if settings.bhashini_api_key:
        h["Authorization"] = settings.bhashini_api_key
    if settings.bhashini_user_id:
        h["userID"] = settings.bhashini_user_id
    return h

async def translate(text: str, source_language: str, target_language: str):
    if not settings.bhashini_api_url or not settings.bhashini_translate_pipeline_id:
        return {"source": "demo", "text": text, "translated_text": text, "note": "Configure Bhashini pipeline credentials."}
    payload = {
        "pipelineId": settings.bhashini_translate_pipeline_id,
        "input": [{"source": source_language, "target": target_language, "text": text}],
    }
    return await post_json(settings.bhashini_api_url, json=payload, headers=_headers())

async def speech_to_text(audio: bytes, language: str, mime_type: str = "audio/wav"):
    if not settings.bhashini_api_url or not settings.bhashini_asr_pipeline_id:
        return {"source": "demo", "text": "", "note": "Configure Bhashini ASR pipeline credentials."}
    payload = {
        "pipelineId": settings.bhashini_asr_pipeline_id,
        "audio": [{"audioContent": base64.b64encode(audio).decode()}],
        "config": {"language": {"sourceLanguage": language}, "audioFormat": mime_type}
    }
    return await post_json(settings.bhashini_api_url, json=payload, headers=_headers())

async def text_to_speech(text: str, language: str):
    if not settings.bhashini_api_url or not settings.bhashini_tts_pipeline_id:
        return {"source": "demo", "audioContent": None, "note": "Configure Bhashini TTS pipeline credentials."}
    payload = {
        "pipelineId": settings.bhashini_tts_pipeline_id,
        "input": [{"source": language, "text": text}],
    }
    return await post_json(settings.bhashini_api_url, json=payload, headers=_headers())
