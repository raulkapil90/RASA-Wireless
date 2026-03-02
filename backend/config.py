import os

# Base Directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Database Configuration
CHROMA_DB_PATH = os.path.join(BASE_DIR, "data", "chroma_db")
COLLECTION_NAME = "cisco_docs"

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
