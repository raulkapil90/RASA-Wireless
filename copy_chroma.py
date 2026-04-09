import shutil, os
if os.path.exists("backend/chroma_store"):
    shutil.copytree("backend/chroma_store", "chroma_store", dirs_exist_ok=True)
    print("Copied from backend/chroma_store")
elif os.path.exists("backend/data/chroma_db"):
    shutil.copytree("backend/data/chroma_db", "chroma_store", dirs_exist_ok=True)
    print("Copied from backend/data/chroma_db")
elif os.path.exists("chroma_store"):
    print("chroma_store already exists.")
else:
    print("No source ChromaDB folder found.")
