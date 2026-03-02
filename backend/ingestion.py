"""
ARKS NetOps AI - Autonomous Ingestion Pipeline
================================================
Crawls Cisco documentation, support forums, and bug databases.
Converts raw HTML/PDF into clean Markdown, preserving CLI syntax.
Implements differential updates (only processes new/changed content).
"""

import hashlib
import logging
import re
from datetime import datetime, timezone
from typing import Optional

import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md

from .config import CISCO_URLS, BUG_SEARCH_URL
from .database import VectorDB

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Source registry – add new Cisco pages / categories here
# ---------------------------------------------------------------------------

SCRAPE_SOURCES = [
    # Catalyst 9800 WLC Configuration Guides
    {
        "url": "https://www.cisco.com/c/en/us/support/wireless/catalyst-9800-series-wireless-controllers/products-installation-and-configuration-guides-list.html",
        "type": "doc",
        "tags": ["9800", "WLC", "configuration"],
    },
    # IOS-XE Release Notes
    {
        "url": "https://www.cisco.com/c/en/us/support/wireless/catalyst-9800-series-wireless-controllers/products-release-notes-list.html",
        "type": "doc",
        "tags": ["9800", "IOS-XE", "release-notes"],
    },
    # Cisco Support Community – Wireless
    {
        "url": "https://community.cisco.com/t5/wireless/bd-p/discussions-wireless",
        "type": "forum",
        "tags": ["community", "wireless"],
    },
    # Best Practices for Catalyst 9800
    {
        "url": "https://www.cisco.com/c/en/us/products/collateral/wireless/catalyst-9800-series-wireless-controllers/guide-c07-743627.html",
        "type": "doc",
        "tags": ["9800", "best-practices"],
    },
]


# ---------------------------------------------------------------------------
# Text processing utilities
# ---------------------------------------------------------------------------

def _generate_doc_id(url: str) -> str:
    """Creates a deterministic, unique ID from a URL."""
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]


def _extract_title(soup: BeautifulSoup) -> str:
    """Pulls the page <title> or first <h1>."""
    if soup.title and soup.title.string:
        return soup.title.string.strip()
    h1 = soup.find("h1")
    if h1:
        return h1.get_text(strip=True)
    return "Untitled"


def _preserve_cli_blocks(html: str) -> str:
    """
    Pre-processes HTML so that CLI / config blocks survive the
    Markdown conversion intact.

    Cisco docs typically wrap CLI output in <pre>, <code>, or
    <div class="cisco-code-*"> blocks.  We normalise these to
    <pre><code> so markdownify renders them as fenced code blocks.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Cisco-specific code containers
    for tag in soup.find_all("div", class_=re.compile(r"cisco[-_]?code|output|cli", re.I)):
        pre = soup.new_tag("pre")
        code = soup.new_tag("code")
        code.string = tag.get_text()
        pre.append(code)
        tag.replace_with(pre)

    return str(soup)


def html_to_markdown(raw_html: str) -> str:
    """
    Converts raw HTML to clean Markdown while preserving CLI syntax
    and configuration blocks.
    """
    # Step 1 – protect CLI/config blocks
    processed = _preserve_cli_blocks(raw_html)

    # Step 2 – convert to markdown
    markdown_text = md(
        processed,
        heading_style="ATX",
        code_language="cisco",
        strip=["img", "script", "style", "nav", "footer", "header"],
    )

    # Step 3 – clean up excessive whitespace but keep code blocks intact
    lines = markdown_text.splitlines()
    cleaned: list[str] = []
    blank_run = 0
    for line in lines:
        if line.strip() == "":
            blank_run += 1
            if blank_run <= 2:
                cleaned.append("")
        else:
            blank_run = 0
            cleaned.append(line)

    return "\n".join(cleaned).strip()


def _chunk_text(text: str, max_chars: int = 2000) -> list[str]:
    """
    Splits a long document into smaller chunks suitable for embedding.
    Splitting is done on paragraph boundaries to preserve context.
    """
    paragraphs = text.split("\n\n")
    chunks: list[str] = []
    current_chunk: list[str] = []
    current_len = 0

    for para in paragraphs:
        para_len = len(para)
        if current_len + para_len > max_chars and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = [para]
            current_len = para_len
        else:
            current_chunk.append(para)
            current_len += para_len

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------

def fetch_page(url: str, timeout: int = 30) -> Optional[str]:
    """Fetches a page and returns raw HTML, or None on failure."""
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        return response.text
    except requests.RequestException as exc:
        logger.error("Failed to fetch %s: %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# Core ingestion logic
# ---------------------------------------------------------------------------

def ingest_source(db: VectorDB, source: dict) -> int:
    """
    Ingests a single source URL.

    Returns the number of *new* chunks added (0 means nothing changed).
    """
    url = source["url"]
    doc_type = source["type"]
    tags = source.get("tags", [])

    logger.info("Ingesting: %s", url)

    raw_html = fetch_page(url)
    if raw_html is None:
        return 0

    soup = BeautifulSoup(raw_html, "html.parser")
    title = _extract_title(soup)
    markdown = html_to_markdown(raw_html)

    if not markdown or len(markdown) < 50:
        logger.warning("Skipping %s — content too short after conversion.", url)
        return 0

    # ── Differential update ────────────────────────────────────────────
    # We hash the converted markdown.  If the hash matches an existing
    # document's content_hash metadata, we skip it entirely.
    content_hash = hashlib.sha256(markdown.encode("utf-8")).hexdigest()
    base_id = _generate_doc_id(url)

    # Check if we already have this exact content
    existing = db.collection.get(
        ids=[base_id + "_0"],
        include=["metadatas"],
    )
    if existing["ids"] and existing["metadatas"]:
        stored_hash = existing["metadatas"][0].get("content_hash", "")
        if stored_hash == content_hash:
            logger.info("No changes detected for %s — skipping.", url)
            return 0

    # ── Chunk and store ────────────────────────────────────────────────
    chunks = _chunk_text(markdown)
    now = datetime.now(timezone.utc).isoformat()
    added = 0

    for idx, chunk in enumerate(chunks):
        chunk_id = f"{base_id}_{idx}"
        metadata = {
            "source_url": url,
            "title": title,
            "type": doc_type,
            "tags": ", ".join(tags),
            "timestamp": now,
            "content_hash": content_hash,
            "chunk_index": idx,
            "total_chunks": len(chunks),
        }
        db.upsert_document(chunk_id, chunk, metadata)
        added += 1

    logger.info("Stored %d chunks for: %s", added, title)
    return added


def run_full_ingestion() -> dict:
    """
    Runs a full ingestion cycle over all registered sources.
    Returns a summary dict.
    """
    db = VectorDB()
    total_added = 0
    sources_processed = 0
    errors: list[str] = []

    for source in SCRAPE_SOURCES:
        try:
            added = ingest_source(db, source)
            total_added += added
            sources_processed += 1
        except Exception as exc:
            logger.exception("Error ingesting %s", source["url"])
            errors.append(f"{source['url']}: {exc}")

    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sources_processed": sources_processed,
        "chunks_added": total_added,
        "errors": errors,
    }
    logger.info("Ingestion complete: %s", summary)
    return summary


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_full_ingestion()
