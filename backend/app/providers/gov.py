from app.config import settings
from app.services.http import get_json

async def government_data(params: dict):
    if not settings.data_gov_resource_url:
        return {"source": "demo", "records": [], "message": "Configure DATA_GOV_RESOURCE_URL for the selected government dataset."}
    query = dict(params)
    if settings.data_gov_api_key:
        query["api-key"] = settings.data_gov_api_key
    query["format"] = "json"
    return await get_json(settings.data_gov_resource_url, params=query)
