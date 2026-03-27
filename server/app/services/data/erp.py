import httpx


class ERPClient:
    """Fetches product master data from SAP via Make.com webhooks."""
    
    def __init__(self, product_url: str, list_url: str):
        self.product_url = product_url
        self.list_url = list_url
    
    async def get_product(self, item_code: str) -> dict | None:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.product_url,
                    params={"ItemCode": item_code},
                    timeout=30.0
                )
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        return data[0]
                    return data
                return None
            except Exception:
                return None
    
    async def get_all_products(self) -> list[dict]:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.list_url, timeout=60.0)
                if response.status_code == 200:
                    return response.json()
                return []
            except Exception:
                return []