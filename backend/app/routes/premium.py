from fastapi import APIRouter, HTTPException
from app.schemas import PremiumRequest
from app.providers.ai import premium_report
from app.config import settings

router = APIRouter(prefix="/api/premium")

async def paid(service: str, req: PremiumRequest):
    # In production, x402 middleware runs before this handler. Without a
    # configured receiver address we fail closed instead of accidentally
    # exposing a paid endpoint for free.
    if not settings.avm_address:
        raise HTTPException(status_code=503, detail="Premium payments are not configured. Set AVM_ADDRESS in backend/.env.")
    report = await premium_report(service, req.profile.model_dump(), req.inputs)
    return {"service": service, "report": report}

@router.post("/soil-health")
async def soil_health(req: PremiumRequest):
    return await paid("soil-health", req)

@router.post("/water-quality")
async def water_quality(req: PremiumRequest):
    return await paid("water-quality", req)

@router.post("/pathogen-report")
async def pathogen(req: PremiumRequest):
    return await paid("pathogen-report", req)

@router.post("/fertilizer")
async def fertilizer(req: PremiumRequest):
    return await paid("fertilizer", req)
