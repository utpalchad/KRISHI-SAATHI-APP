import base64, json
import httpx
from app.config import settings

SYSTEM = """You are Krishi Saathi, an agricultural assistant for Indian farmers. Be practical, concise, multilingual when requested, and explain uncertainty. Never claim a crop disease is confirmed from an image. Do not provide unsafe chemical instructions; encourage label-compliant and local expert guidance. Use provided farmer/weather/market context and clearly distinguish demo data from live data."""

async def gemini_text(prompt: str):
    if not settings.gemini_api_key:
        return None
    from google import genai
    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(model=settings.gemini_model, contents=f"{SYSTEM}\n\n{prompt}")
    return (response.text or "").strip()

async def gemini_image(prompt: str, image_bytes: bytes, mime_type: str):
    if not settings.gemini_api_key:
        return None
    from google import genai
    client = genai.Client(api_key=settings.gemini_api_key)
    from google.genai import types
    contents = [
        types.Part.from_text(text=f"{SYSTEM}\n\n{prompt}"),
        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
    ]
    response = client.models.generate_content(model=settings.gemini_model, contents=contents)
    return (response.text or "").strip()

async def claude_text(prompt: str):
    if not settings.anthropic_api_key:
        return None
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    msg = await client.messages.create(model=settings.claude_model, max_tokens=900, system=SYSTEM, messages=[{"role":"user", "content": prompt}])
    return "".join(block.text for block in msg.content if getattr(block, "type", "") == "text").strip()

async def ollama_text(prompt: str):
    if not settings.ollama_enabled:
        return None
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(f"{settings.ollama_base_url}/api/generate", json={"model": settings.ollama_model, "prompt": f"{SYSTEM}\n\n{prompt}", "stream": False})
        r.raise_for_status()
        return (r.json().get("response") or "").strip()

async def ai_text(prompt: str):
    """Generate an actual answer, trying configured providers in order."""
    errors = []
    for name, fn in (("Gemini", gemini_text), ("Ollama", ollama_text), ("Claude", claude_text)):
        try:
            result = await fn(prompt)
            if result:
                return result
            if name == "Gemini" and not settings.gemini_api_key:
                errors.append("Gemini API key is not configured")
        except Exception as exc:
            errors.append(f"{name}: {type(exc).__name__}")

    # Do not pretend a fixed prototype sentence is an AI answer. Return a
    # useful diagnostic so deployment configuration can be corrected.
    detail = "; ".join(errors) if errors else "No AI provider returned a response"
    return f"Krishi AI is temporarily unable to generate a live answer. Provider status: {detail}. Please check the AI provider configuration on the backend."

async def crop_health(image_bytes: bytes, mime_type: str):
    prompt = "Analyze this crop/leaf image for visible symptoms. Return: observed signs, possible issues (not a confirmed diagnosis), uncertainty, safe next steps, and when to seek local agricultural expert/lab confirmation."
    result = await gemini_image(prompt, image_bytes, mime_type)
    return result or "AI image analysis is currently unavailable. Please check the Gemini provider configuration and try again."

async def premium_report(kind: str, profile: dict, inputs: dict):
    prompt = f"Generate a structured {kind} report for this Indian farm. Farmer profile: {json.dumps(profile)}. Measurements/user inputs: {json.dumps(inputs)}. Clearly mark missing measurements, assumptions, uncertainty and expert/lab verification requirements. Do not invent test results."
    return await ai_text(prompt)
