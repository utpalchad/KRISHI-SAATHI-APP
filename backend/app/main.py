from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes.public import router as public_router
from app.routes.premium import router as premium_router
from app.services.x402 import build_x402_middleware
from app.db import init_db, db_status


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
    except Exception as exc:
        print(f"[database] initialization failed: {exc}")
    yield


app = FastAPI(title=settings.app_name, version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "PAYMENT-SIGNATURE", "PAYMENT-REQUIRED"],
    expose_headers=["PAYMENT-RESPONSE", "PAYMENT-REQUIRED"],
)

# Official x402 AVM middleware protects only the four premium routes.
# Public AI/data endpoints remain free.
X402Middleware, X402_ROUTES, X402_SERVER = build_x402_middleware()
if X402Middleware is not None:
    app.add_middleware(X402Middleware, routes=X402_ROUTES, server=X402_SERVER)

app.include_router(public_router)
app.include_router(premium_router)

@app.get("/")
async def root():
    return {
        "name": "Krishi Saathi",
        "tagline": "From Soil to Sale",
        "payment": "x402 / Algorand Testnet / USDC",
        "payment_mode": "live" if X402Middleware is not None else "demo-unconfigured",
        "docs": "/docs",
    }

@app.get("/api/status")
async def status():
    return {
        "ok": True,
        "ai": bool(settings.gemini_api_key or settings.anthropic_api_key or settings.ollama_enabled),
        "weather": bool(settings.openweather_api_key),
        "market": bool(settings.agmarknet_base_url),
        "bhashini": bool(settings.bhashini_api_url),
        "x402": X402Middleware is not None,
        "database": db_status(),
    }
