import os
import re

print("Running Task 3 updates...")

# Update backend/.env.example
with open("backend/.env.example", "a") as f:
    f.write("\nCHROMA_DB_PATH=./chroma_store\n")
print("Updated backend/.env.example")

# Update root .env.example
with open(".env.example", "a") as f:
    f.write("\nRASA_API_KEY=your-secure-api-key-here\n")
print("Updated .env.example")

# Update root .env and backend/.env to include the test-key
for env_path in [".env", "backend/.env"]:
    if os.path.exists(env_path):
        with open(env_path, "a") as f:
            f.write("\nRASA_API_KEY=test-key\nAPI_KEY_ENABLED=true\n")

# Update backend/DEPLOY.md
deploy_append = """
### 7. ChromaDB Persistence on Railway

When deploying to Railway, the container filesystem is ephemeral. This means ChromaDB will reset on every deployment if you do not attach a persistent volume to `CHROMA_DB_PATH`.

**To persist your RAG knowledge base & tier-1 deterministic cache:**
1. Go to your Railway project dashboard and open the `backend` service settings.
2. Navigate to the **Volumes** tab.
3. Click **+ New Volume** and give it a name (e.g. `chroma-data`).
4. Set the **Mount Path** to `/app/chroma_store` (or wherever your `CHROMA_DB_PATH` is set inside the container, matching your Railway Nixpacks working directory).
5. Ensure `CHROMA_DB_PATH=/app/chroma_store` is injected in the **Variables** tab.

**Warning:** Without a volume mounted, all stored vectors and autonomous resolutions will be completely wiped on every new container restart.
"""
with open("backend/DEPLOY.md", "a") as f:
    f.write(deploy_append)
print("Updated DEPLOY.md")

# Update knowledge_base.py
with open("backend/services/knowledge_base.py", "r") as f:
    kb = f.read()

# Replace import and client usage
if "chromadb.PersistentClient" in kb:
    kb = kb.replace("from backend.db.models import RasaResolution", "from backend.db.models import RasaResolution\nfrom backend.database import db as vector_db")
    
    old_func = """def get_chroma_res_collection():
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL
    )
    return client.get_or_create_collection(
        name=COLLECTION_NAME_RES,
        embedding_function=embedding_fn,
        metadata={"hnsw:space": "cosine"}
    )"""
    new_func = """def get_chroma_res_collection():
    return vector_db.client.get_or_create_collection(
        name=COLLECTION_NAME_RES,
        embedding_function=vector_db.embedding_fn,
        metadata={"hnsw:space": "cosine"}
    )"""
    kb = kb.replace(old_func, new_func)

    with open("backend/services/knowledge_base.py", "w") as f:
        f.write(kb)
    print("Unified ChromaDB Client in knowledge_base.py")

print("Done.")
