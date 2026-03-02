"""
ARKS NetOps AI - Weekly Scheduler
===================================
Runs the ingestion pipeline on a configurable weekly schedule.

Usage:
    # Run as a daemon process:
    python -m backend.scheduler

    # Or trigger a one-off ingestion:
    python -m backend.scheduler --now
"""

import argparse
import logging
import time
from datetime import datetime, timezone

import schedule

from .config import SCRAPE_INTERVAL_DAYS, SCRAPE_TIME
from .ingestion import run_full_ingestion

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


def _job():
    """Wrapper around the ingestion that logs the summary."""
    logger.info("=" * 60)
    logger.info("Scheduled ingestion starting at %s", datetime.now(timezone.utc).isoformat())
    summary = run_full_ingestion()
    logger.info(
        "Ingestion finished — %d sources processed, %d chunks added, %d errors.",
        summary["sources_processed"],
        summary["chunks_added"],
        len(summary["errors"]),
    )
    if summary["errors"]:
        for err in summary["errors"]:
            logger.error("  • %s", err)
    logger.info("=" * 60)


def start_scheduler():
    """Starts the weekly scheduler loop."""
    # Schedule every SCRAPE_INTERVAL_DAYS days at SCRAPE_TIME
    # The `schedule` library doesn't natively support "every N days",
    # so we use a weekly job if interval == 7, otherwise a daily with a counter.
    if SCRAPE_INTERVAL_DAYS == 7:
        schedule.every().monday.at(SCRAPE_TIME).do(_job)
        logger.info("Scheduler armed — every Monday at %s UTC.", SCRAPE_TIME)
    else:
        counter = {"runs": 0}

        def _gated_job():
            counter["runs"] += 1
            if counter["runs"] % SCRAPE_INTERVAL_DAYS == 0:
                _job()

        schedule.every().day.at(SCRAPE_TIME).do(_gated_job)
        logger.info(
            "Scheduler armed — every %d days at %s UTC.",
            SCRAPE_INTERVAL_DAYS,
            SCRAPE_TIME,
        )

    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ARKS NetOps AI Scheduler")
    parser.add_argument(
        "--now",
        action="store_true",
        help="Run one full ingestion immediately and exit.",
    )
    args = parser.parse_args()

    if args.now:
        _job()
    else:
        start_scheduler()
