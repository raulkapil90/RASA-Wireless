import chromadb
c = chromadb.PersistentClient('./chroma_store')
print([x.name for x in c.list_collections()])
