import os
from backend.db.database import SessionLocal
from backend.db.models import RasaResolution
from backend.services.knowledge_base import get_chroma_res_collection

def index_all():
    db = SessionLocal()
    records = db.query(RasaResolution).all()
    collection = get_chroma_res_collection()
    
    count = 0
    for res in records:
        doc_text = f"{res.issue_category}\n{res.root_cause}\n{' '.join(res.resolution_steps)}"
        collection.upsert(
            ids=[res.id],
            documents=[doc_text],
            metadatas=[{"issue_category": res.issue_category, "device": res.device_type}]
        )
        count += 1
        
    print(f"Indexed {count} records into Chroma.")

if __name__ == "__main__":
    index_all()
