import asyncio, base64, json, logging
from io import BytesIO

import httpx
from PIL import Image, ImageOps, UnidentifiedImageError
from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM = """You are Krishi Saathi, an agricultural assistant for Indian farmers. Be practical, concise, multilingual when requested, and explain uncertainty. Never claim a crop disease is confirmed from an image. Do not provide unsafe chemical instructions; encourage label-compliant and local expert guidance. Use provided farmer/weather/market context and clearly distinguish demo data from live data."""

GEMINI_IMAGE_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.8-flash"]
GEMINI_TEXT_FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.8-flash"]
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_DIMENSION = 1600
GEMINI_IMAGE_TIMEOUT = 30
GEMINI_RETRIES = 2


def _gemini_generate(client, model: str, contents):
    return client.models.generate_content(model=model, contents=contents)


def _normalize_image(image_bytes: bytes):
    """Convert browser uploads to a small, Gemini-friendly JPEG."""
    if not image_bytes:
        raise ValueError("Empty image upload")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("Image is larger than 10 MB")

    try:
        with Image.open(BytesIO(image_bytes)) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)
            output = BytesIO()
            image.save(output, format="JPEG", quality=85, optimize=True)
            return output.getvalue(), "image/jpeg"
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError("Uploaded file is not a supported image") from exc


def _error_details(exc: Exception) -> str:
    """Extract useful provider diagnostics without ever logging the API key."""
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    status = getattr(exc, "status", None)
    message = str(exc).strip().replace("\n", " ")
    if len(message) > 300:
        message = message[:300] + "..."
    return f"code={code or status or 'unknown'} error={type(exc).__name__}: {message}"


def _is_retryable_gemini_error(exc: Exception) -> bool:
    if isinstance(exc, (asyncio.TimeoutError, TimeoutError, httpx.TimeoutException)):
        return True
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None) or getattr(exc, "status", None)
    if code in (408, 409, 429, 500, 502, 503, 504):
        return True
    text = str(exc).lower()
    return any(token in text for token in ("429", "500", "502", "503", "504", "rate limit", "temporarily unavailable", "overloaded", "high demand"))


async def _generate_with_retry(client, model: str, contents, timeout: int):
    last_error = None
    for attempt in range(1, GEMINI_RETRIES + 1):
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(_gemini_generate, client, model, contents),
                timeout=timeout,
            )
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Gemini request failed model=%s attempt=%s/%s retryable=%s %s",
                model,
                attempt,
                GEMINI_RETRIES,
                _is_retryable_gemini_error(exc),
                _error_details(exc),
            )
            if attempt >= GEMINI_RETRIES or not _is_retryable_gemini_error(exc):
                raise
            await asyncio.sleep(attempt * 1.5)
    raise last_error or RuntimeError("Gemini request failed")


async def gemini_text(prompt: str):
    if not settings.gemini_api_key:
        return None
    from google import genai
    client = genai.Client(api_key=settings.gemini_api_key)
    models = [settings.gemini_model] + [m for m in GEMINI_TEXT_FALLBACK_MODELS if m != settings.gemini_model]
    last_error = None
    for model in models:
        try:
            response = await _generate_with_retry(client, model, f"{SYSTEM}\n\n{prompt}", timeout=45)
            text = getattr(response, "text", None)
            if text:
                return text.strip()
        except Exception as exc:
            last_error = exc
            logger.exception("Gemini text generation failed with model=%s", model)
    if last_error:
        raise last_error
    return None


async def gemini_image(prompt: str, image_bytes: bytes, mime_type: str):
    if not settings.gemini_api_key:
        raise RuntimeError("Gemini API key is not configured")

    image_bytes, mime_type = _normalize_image(image_bytes)

    from google import genai
    from google.genai import types
    client = genai.Client(api_key=settings.gemini_api_key)
    contents = [
        types.Part.from_text(text=f"{SYSTEM}\n\n{prompt}"),
        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
    ]

    configured = settings.gemini_model.strip() if settings.gemini_model else ""
    models = []
    for model in [configured, "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.8-flash"]:
        if model and model not in models:
            models.append(model)

    last_error = None
    for model in models:
        try:
            logger.info("Running Gemini crop image analysis with model=%s", model)
            response = await _generate_with_retry(client, model, contents, timeout=GEMINI_IMAGE_TIMEOUT)
            text = getattr(response, "text", None)
            if text:
                return text.strip()
            logger.warning("Gemini returned no text for image analysis with model=%s", model)
        except Exception as exc:
            last_error = exc
            logger.exception("Gemini image analysis failed with model=%s: %s", model, _error_details(exc))

    if last_error:
        raise last_error
    return None


async def claude_text(prompt: str):
    if not settings.anthropic_api_key:
        return None
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    msg = await client.messages.create(model=settings.claude_model, max_tokens=900, system=SYSTEM, messages=[{"role": "user", "content": prompt}])
    return "".join(block.text for block in msg.content if getattr(block, "type", "") == "text").strip()


async def ollama_text(prompt: str):
    if not settings.ollama_enabled:
        return None
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(f"{settings.ollama_base_url}/api/generate", json={"model": settings.ollama_model, "prompt": f"{SYSTEM}\n\n{prompt}", "stream": False})
        r.raise_for_status()
        return (r.json().get("response") or "").strip()


async def ai_text(prompt: str):
    """Generate a live answer without blocking FastAPI's event loop."""
    errors = []
    for name, fn in (("Gemini", gemini_text), ("Ollama", ollama_text), ("Claude", claude_text)):
        try:
            result = await fn(prompt)
            if result:
                return result
            if name == "Gemini" and not settings.gemini_api_key:
                errors.append("Gemini API key is not configured")
        except asyncio.TimeoutError:
            errors.append(f"{name}: timeout")
        except Exception as exc:
            errors.append(f"{name}: {type(exc).__name__}")

    detail = "; ".join(errors) if errors else "No AI provider returned a response"
    return f"I can't generate a live AI answer right now. Provider status: {detail}. Please check the AI provider configuration on the backend."


async def crop_health(image_bytes: bytes, mime_type: str):
    prompt = "Analyze this crop/leaf image for visible symptoms. Return: observed signs, possible issues (not a confirmed diagnosis), uncertainty, safe next steps, and when to seek local agricultural expert/lab confirmation."
    try:
        result = await gemini_image(prompt, image_bytes, mime_type)
        return result or "AI image analysis returned no result. Please try a clearer image."
    except ValueError as exc:
        logger.warning("Invalid crop image upload: %s", exc)
        return f"I couldn't read that image: {exc}. Please upload a clear JPG or PNG photo of the leaf."
    except Exception as exc:
        logger.exception("Crop health Gemini analysis failed: %s", exc)
        return "AI image analysis is temporarily unavailable. Please try again in a moment."


async def premium_report(kind: str, profile: dict, inputs: dict):
    prompt = f"Generate a structured {kind} report for this Indian farm. Farmer profile: {json.dumps(profile)}. Measurements/user inputs: {json.dumps(inputs)}. Clearly mark missing measurements, assumptions, uncertainty and expert/lab verification requirements. Do not invent test results."
    return await ai_text(prompt)
