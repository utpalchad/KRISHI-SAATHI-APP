import httpx

async def get_json(url: str, *, params=None, headers=None, timeout=30):
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.get(url, params=params, headers=headers)
        r.raise_for_status()
        return r.json()

async def post_json(url: str, *, json=None, headers=None, timeout=60):
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, json=json, headers=headers)
        r.raise_for_status()
        return r.json()

async def post_bytes(url: str, *, content: bytes, headers=None, timeout=120):
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, content=content, headers=headers)
        r.raise_for_status()
        return r
