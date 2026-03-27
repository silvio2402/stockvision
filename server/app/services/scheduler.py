import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from ..dependencies import get_db
from ..websocket import ws_manager
from .ordering.service import check_and_create_orders

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def scan_job():
    import asyncio
    asyncio.run(run_periodic_scan())


async def run_periodic_scan():
    logger.info("Running periodic scan via scheduler")
    await ws_manager.broadcast("scan_started", {"camera_id": "camera-1", "scheduled": True})


def order_check_job():
    import asyncio
    asyncio.run(run_periodic_order_check())


async def run_periodic_order_check():
    logger.info("Running periodic order check")
    db = await get_db()
    await check_and_create_orders(db)


def start_scheduler():
    try:
        scheduler.add_job(
            scan_job,
            trigger=IntervalTrigger(minutes=10),
            id="periodic_scan",
            name="Periodic Camera Scan",
            replace_existing=True
        )
        
        scheduler.add_job(
            order_check_job,
            trigger=IntervalTrigger(minutes=30),
            id="periodic_order_check",
            name="Periodic Order Check",
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("Scheduler started")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down")


def update_scan_interval(minutes: int):
    job_id = "periodic_scan"
    job = scheduler.get_job(job_id)
    if job:
        scheduler.remove_job(job_id)
    
    scheduler.add_job(
        scan_job,
        trigger=IntervalTrigger(minutes=minutes),
        id=job_id,
        name="Periodic Camera Scan",
        replace_existing=True
    )
    logger.info(f"Updated scan interval to {minutes} minutes")