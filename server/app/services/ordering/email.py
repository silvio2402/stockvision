import aiosmtplib
from email.message import EmailMessage
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def send_order_email(order: dict, db) -> bool:
    settings_doc = await db.settings.find_one({"_id": "app_settings"})
    
    if not settings_doc:
        return False
    
    smtp_host = settings_doc.get("smtp_host")
    smtp_port = settings_doc.get("smtp_port", 587)
    smtp_user = settings_doc.get("smtp_user")
    smtp_password = settings_doc.get("smtp_password")
    order_email = settings_doc.get("order_email")
    
    if not all([smtp_host, smtp_user, smtp_password, order_email]):
        return False
    
    items_text = "\n".join([
        f"  - {item.get('name', 'Unknown')} (Item Code: {item.get('item_code', 'N/A')}) x{item.get('order_amount', 1)}"
        for item in order.get("items", [])
    ])
    
    message = EmailMessage()
    message["From"] = smtp_user
    message["To"] = order_email
    message["Subject"] = f"StockVision Order Request - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
    
    body = f"""
New stock order requested from StockVision.

Order contains {len(order.get('items', []))} items:

{items_text}

Please approve and process this order.

---
StockVision Automated Stock Taking
"""
    
    message.set_content(body)
    
    try:
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
password=smtp_password,
                start_tls=True
            )
        return True
    except Exception as e:
        logger.error(f"Failed to send order email: {e}")
        return False