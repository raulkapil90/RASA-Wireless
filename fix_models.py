with open('backend/db/models.py', 'r') as f:
    text = f.read()

import re
# Find the line with confidence_score = Column(Column(...
text = re.sub(
    r'.*confidence_score = Column\(Column.*',
    '    confidence_score = Column(Float, nullable=False)\n    times_validated = Column(Integer, default=0)\n    source = Column(String, default="llm_consensus")\n    client_env_tags = Column(JSON, nullable=True)\n    created_at = Column(DateTime, default=datetime.utcnow)\n    last_seen = Column(DateTime, default=datetime.utcnow)\n    is_deleted = Column(Boolean, default=False)',
    text,
    flags=re.DOTALL
)

with open('backend/db/models.py', 'w') as f:
    f.write(text)
print("Models fixed.")
