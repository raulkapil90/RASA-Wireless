import os

# Base Directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Database Configuration
CHROMA_DB_PATH = "./chroma_store"
COLLECTION_NAME = "rasa_knowledge"

# Scraping Configuration
CISCO_URLS = [
    "https://www.cisco.com/c/en/us/support/wireless/catalyst-9800-series-wireless-controllers/series.html",
    # Add more specific documentation URLs here
]
BUG_SEARCH_URL = "https://bst.cloudapps.cisco.com/bugsearch/"

# Scheduling Configuration
SCRAPE_INTERVAL_DAYS = 7
SCRAPE_TIME = "02:00"  # 2 AM

# Model Configuration
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# ── Cisco Catalyst Center (CCC) Configuration ────────────────────────────
# All values read from environment variables — never hardcoded.
CCC_BASE_URL = os.getenv("CCC_BASE_URL", "")
CCC_USERNAME = os.getenv("CCC_USERNAME", "")
CCC_PASSWORD = os.getenv("CCC_PASSWORD", "")
CCC_VERIFY_SSL = os.getenv("CCC_VERIFY_SSL", "true").lower() == "true"
CCC_WEBHOOK_SECRET = os.getenv("CCC_WEBHOOK_SECRET", "")
