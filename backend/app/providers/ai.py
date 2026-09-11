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
    return response.text

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
    return response.text

async def claude_text(prompt: str):
    if not settings.anthropic_api_key:
        return None
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    msg = await client.messages.create(model=settings.claude_model, max_tokens=900, system=SYSTEM, messages=[{"role":"user", "content": prompt}])
    return "".join(block.text for block in msg.content if getattr(block, "type", "") == "text")

async def ollama_text(prompt: str):
    if not settings.ollama_enabled:
        return None
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(f"{settings.ollama_base_url}/api/generate", json={"model": settings.ollama_model, "prompt": f"{SYSTEM}\n\n{prompt}", "stream": False})
        r.raise_for_status()
        return r.json().get("response")

async def ai_text(prompt: str):
    # Primary -> local fallback -> optional Claude -> deterministic fallback.
    for fn in (gemini_text, ollama_text, claude_text):
        try:
            result = await fn(prompt)
            if result:
                return result
        except Exception:
            continue
    return "I can help with your farm profile, crop, weather and cultivation questions. For this prototype, connect an AI provider to enable live reasoning."

async def crop_health(image_bytes: bytes, mime_type: str):
    prompt = "Analyze this crop/leaf image for visible symptoms. Return: observed signs, possible issues (not a confirmed diagnosis), uncertainty, safe next steps, and when to seek local agricultural expert/lab confirmation."
    result = await gemini_image(prompt, image_bytes, mime_type)
    return result or "Demo analysis: possible leaf spot. This is not a confirmed diagnosis. Inspect nearby plants and seek local agricultural guidance if symptoms persist."

async def premium_report(kind: str, profile: dict, inputs: dict):
    prompt = f"Generate a structured {kind} report for this Indian farm. Farmer profile: {json.dumps(profile)}. Measurements/user inputs: {json.dumps(inputs)}. Clearly mark missing measurements, assumptions, uncertainty and expert/lab verification requirements. Do not invent test results."
    return await ai_text(prompt)
