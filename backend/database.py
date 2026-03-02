import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from .config import CHROMA_DB_PATH, COLLECTION_NAME, EMBEDDING_MODEL
import os

class VectorDB:
    def __init__(self):
        # Ensure the data directory exists
        os.makedirs(os.path.dirname(CHROMA_DB_PATH), exist_ok=True)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        
        # Define embedding function
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL
        )
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )

    def upsert_document(self, doc_id: str, content: str, metadata: dict):
        """
        Inserts or updates a document in the collection.
        """
        self.collection.upsert(
            ids=[doc_id],
            documents=[content],
            metadatas=[metadata]
        )

    def query_documents(self, query_text: str, n_results: int = 5, where: dict = None):
        """
        Queries the collection for relevant documents.
        """
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results,
            where=where
        )
        return results

    def get_existing_ids(self):
        """
        Retrieves all existing document IDs for differential updates.
        """
        # This is a simplified way to get all IDs; for very large datasets, 
        # we might need pagination, but Chroma's get() handles reasonable sizes.
        return self.collection.get(include=[])['ids']

    def delete_document(self, doc_id: str):
        """
        Deletes a document by ID.
        """
        self.collection.delete(ids=[doc_id])

# Global instance
db = VectorDB()
