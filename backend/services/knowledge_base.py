import re
import hashlib
from datetime import datetime
import chromadb
from chromadb.utils import embedding_functions

from backend.config import CHROMA_DB_PATH, EMBEDDING_MODEL
from backend.db.database import SessionLocal
from backend.db.models import RasaResolution

# Centralize the DB collection definition for resolutions
COLLECTION_NAME_RES = "rasa_resolutions"

def get_chroma_res_collection():
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL
    )
    return client.get_or_create_collection(
        name=COLLECTION_NAME_RES,
        embedding_function=embedding_fn,
        metadata={"hnsw:space": "cosine"}
    )

def log_fingerprint(log_text: str) -> str:
    """
    Normalizes the log text to strip unique identifiers and returns a SHA-256 hash.
    """
    if not log_text:
        return ""
    
    text = log_text
    
    # Strip sequence numbers at start (e.g. 000012: or just 12:)
    text = re.compile(r'^\s*\d+:\s*', re.MULTILINE).sub('', text)

    # Strip AireOS / Catalyst timestamps (e.g. *Mar  1 00:01:23.456: or Apr  9 14:23:11.456)
    text = re.compile(r'^\*?[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2}(?:\.\d{3,})?:?\s*', re.MULTILINE).sub('', text)

    # Strip basic date times YYYY-MM-DD HH:MM:SS
    text = re.compile(r'\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}:\d{2}\s*').sub('', text)

    # Strip Uptime timestamps (e.g. 1w2d, 00:01:23)
    text = re.compile(r'\b\d+w\d+d\b', re.IGNORECASE).sub('[UPTIME]', text)
    text = re.compile(r'\b\d{2}:\d{2}:\d{2}\b').sub('[UPTIME_TIME]', text)

    # Strip MAC addresses
    text = re.compile(r'([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})', re.IGNORECASE).sub('[MAC]', text)
    text = re.compile(r'([0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4})', re.IGNORECASE).sub('[MAC]', text)

    # Strip IP addresses
    text = re.compile(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b').sub('[IP]', text)

    # Strip common interface names
    text = re.compile(r'\b(Gi|Te|FastEthernet|GigabitEthernet|TenGigabitEthernet|Vlan|Port-channel)[a-zA-Z]*[\d/]+\b', re.IGNORECASE).sub('[INT]', text)
    text = re.compile(r'\b(Wlan-GigE|BVI\d+|Dot11Radio\d+)\b', re.IGNORECASE).sub('[INT]', text)

    # Strip AP name patterns
    text = re.compile(r'\bAP[A-Za-z0-9._-]+\b', re.IGNORECASE).sub('[AP_NAME]', text)
    
    text = text.strip()
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def lookup_internal(log_text: str, threshold: float = 0.75) -> dict | None:
    """
    Tier-1 Lookup:
    1. Check exact hash match.
    2. Fallback to semantic similarity search on root cause + resolution.
    Returns dict if found, else None.
    """
    fingerprint = log_fingerprint(log_text)
    
    db = SessionLocal()
    try:
        # First: precise exact hash match
        match = db.query(RasaResolution).filter(
            RasaResolution.log_fingerprint == fingerprint,
            RasaResolution.is_deleted == False
        ).first()
        
        if match:
            # Update last_seen
            match.last_seen = datetime.utcnow()
            db.commit()
            return {
                "id": match.id,
                "title": match.issue_category,
                "severity": "high",  # Inherited/fallback or map from category
                "category": match.issue_category,
                "confidence": int(match.confidence_score * 100),
                "phase": "Historical DB",
                "diagnosis": match.root_cause,
                "evidence": "Log matched exactly to historical fingerprint.",
                "remediation": match.resolution_steps,
                "proTip": f"Matched previously resolved template (validated {match.times_validated}x).",
                "consensus": {"agreement": "high", "note": "Tier-1 Auto-Match"},
                "advancedReason": {"fault": match.root_cause, "impact": [{"label": "DB Match", "status": "ok", "value": "Validated"}]}
            }
            
        # Second: semantic similarity fallback if no exact match
        collection = get_chroma_res_collection()
        results = collection.query(
            query_texts=[log_text],
            n_results=1
        )
        
        if results and results['distances'] and len(results['distances'][0]) > 0:
            distance = results['distances'][0][0]
            similarity_score = 1.0 - distance
            if similarity_score >= threshold:
                matched_id = results['ids'][0][0]
                semantic_match = db.query(RasaResolution).filter(
                    RasaResolution.id == matched_id,
                    RasaResolution.is_deleted == False
                ).first()
                if semantic_match:
                    semantic_match.last_seen = datetime.utcnow()
                    db.commit()
                    return {
                        "id": semantic_match.id,
                        "title": semantic_match.issue_category,
                        "severity": "medium",
                        "category": semantic_match.issue_category,
                        "confidence": int(semantic_match.confidence_score * 100),
                        "phase": "Semantic Search",
                        "diagnosis": semantic_match.root_cause,
                        "evidence": "Log is semantically similar to historical pattern.",
                        "remediation": semantic_match.resolution_steps,
                        "proTip": f"Semantic Match (Score: {similarity_score:.2f}). Validated {semantic_match.times_validated}x.",
                        "consensus": {"agreement": "medium", "note": "Tier-1 Semantic Match"},
                        "advancedReason": {"fault": semantic_match.root_cause, "impact": [{"label": "Similarity", "status": "warning", "value": f"{similarity_score:.2f}"}]}
                    }
    finally:
        db.close()
        
    return None

def store_resolution(
    log_text: str,
    device_type: str,
    issue_category: str,
    root_cause: str,
    resolution_steps: list,
    confidence_score: float,
    client_env_tags: dict = None,
    source: str = "llm_consensus"
) -> bool:
    """
    Only stores if confidence >= 0.80 and duplicate fingerprint doesn't exist.
    Also indexes into ChromaDB.
    """
    if confidence_score < 0.80:
        return False
        
    fingerprint = log_fingerprint(log_text)
    
    db = SessionLocal()
    try:
        # Check for duplicate
        existing = db.query(RasaResolution).filter(RasaResolution.log_fingerprint == fingerprint).first()
        if existing:
            return False
            
        new_res = RasaResolution(
            log_fingerprint=fingerprint,
            device_type=device_type,
            issue_category=issue_category,
            root_cause=root_cause,
            resolution_steps=resolution_steps,
            confidence_score=confidence_score,
            source=source,
            client_env_tags=client_env_tags or {}
        )
        db.add(new_res)
        db.commit()
        db.refresh(new_res)
        
        # Index to ChromaDB
        collection = get_chroma_res_collection()
        doc_text = f"{issue_category}\n{root_cause}\n{' '.join(resolution_steps)}"
        collection.upsert(
            ids=[new_res.id],
            documents=[doc_text],
            metadatas=[{"issue_category": issue_category, "device": device_type}]
        )
        return True
    finally:
        db.close()

def confirm_resolution(resolution_id: str) -> bool:
    """
    Increments times_validated for a given resolution ID when clients confirm it worked.
    """
    db = SessionLocal()
    try:
        res = db.query(RasaResolution).filter(RasaResolution.id == resolution_id).first()
        if res:
            res.times_validated += 1
            db.commit()
            return True
        return False
    finally:
        db.close()
