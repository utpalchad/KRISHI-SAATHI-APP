import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    app_name = os.getenv("APP_NAME", "Krishi Saathi API")
    app_env = os.getenv("APP_ENV", "development")
    cors_origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if x.strip()]
    upload_dir = os.getenv("UPLOAD_DIR", "./uploads")

    gemini_api_key = os.getenv("GEMINI_API_KEY", "")
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")
    claude_model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5")
    ollama_enabled = os.getenv("OLLAMA_ENABLED", "false").lower() == "true"
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

    bhashini_api_url = os.getenv("BHASHINI_API_URL", "")
    bhashini_api_key = os.getenv("BHASHINI_API_KEY", "")
    bhashini_user_id = os.getenv("BHASHINI_USER_ID", "")
    bhashini_asr_pipeline_id = os.getenv("BHASHINI_ASR_PIPELINE_ID", "")
    bhashini_tts_pipeline_id = os.getenv("BHASHINI_TTS_PIPELINE_ID", "")
    bhashini_translate_pipeline_id = os.getenv("BHASHINI_TRANSLATE_PIPELINE_ID", "")

    openweather_api_key = os.getenv("OPENWEATHER_API_KEY", "")
    openweather_base_url = os.getenv("OPENWEATHER_BASE_URL", "https://api.openweathermap.org/data/2.5")

    data_gov_api_key = os.getenv("DATA_GOV_API_KEY", "")
    data_gov_resource_url = os.getenv("DATA_GOV_RESOURCE_URL", "")

    agmarknet_base_url = os.getenv("AGMARKNET_BASE_URL", "")
    agmarknet_api_key = os.getenv("AGMARKET_API_KEY", "")
    agmarknet_daily_path = os.getenv("AGMARKET_DAILY_PATH", "/api/daily")

    avm_address = os.getenv("AVM_ADDRESS", "")
    facilitator_url = os.getenv("FACILITATOR_URL", "https://facilitator.goplausible.xyz")
    algorand_testnet_caip2 = os.getenv("ALGORAND_TESTNET_CAIP2", "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=")
    usdc_testnet_asa_id = os.getenv("USDC_TESTNET_ASA_ID", "10458941")

    soil_health_price = os.getenv("SOIL_HEALTH_PRICE", "$0.05")
    water_quality_price = os.getenv("WATER_QUALITY_PRICE", "$0.05")
    pathogen_price = os.getenv("PATHOGEN_REPORT_PRICE", "$0.10")
    fertilizer_price = os.getenv("FERTILIZER_PRICE", "$0.10")

settings = Settings()
