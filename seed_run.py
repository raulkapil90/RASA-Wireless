import os

# Initialize DB tables
try:
    from backend.db.database import Base, engine
    from backend.db.models import RasaResolution
    Base.metadata.create_all(bind=engine)
    print("Database tables ensured.")
except Exception as e:
    print(f"Error creating tables: {e}")

# Initialize DB tables
try:
    from backend.db.database import Base, engine
    from backend.db.models import RasaResolution
    Base.metadata.create_all(bind=engine)
    print("Database tables ensured.")
except Exception as e:
    print(f"Error creating tables: {e}")

# Seed Data
try:
    from backend.data.seed_resolutions import seed
    seed()
except Exception as e:
    print(f"Error seeding: {e}")
