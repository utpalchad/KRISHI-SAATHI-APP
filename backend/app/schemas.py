from typing import Any, Optional
from pydantic import BaseModel, Field

class FarmProfile(BaseModel):
    name: str = "Demo Farmer"
    state: str = "Uttar Pradesh"
    district: str = "Kanpur"
    soil_type: str = "Loamy"
    land_size_acres: float = 2
    irrigation: bool = True
    current_crop: Optional[str] = "Wheat"
    season: Optional[str] = "Rabi"
    language: str = "en-IN"

class ChatRequest(BaseModel):
    message: str
    profile: FarmProfile = Field(default_factory=FarmProfile)

class RecommendationRequest(BaseModel):
    profile: FarmProfile = Field(default_factory=FarmProfile)

class FarmBriefRequest(BaseModel):
    profile: FarmProfile = Field(default_factory=FarmProfile)

class WeatherRequest(BaseModel):
    city: str
    country: str = "IN"

class MarketRequest(BaseModel):
    commodity: str = "Wheat"
    state: Optional[str] = None
    district: Optional[str] = None

class TranslateRequest(BaseModel):
    text: str
    source_language: str
    target_language: str

class TTSRequest(BaseModel):
    text: str
    language: str = "hi-IN"

class PremiumRequest(BaseModel):
    profile: FarmProfile = Field(default_factory=FarmProfile)
    inputs: dict[str, Any] = Field(default_factory=dict)
