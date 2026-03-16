"""Rule loader: parses YAML compliance rule files by vendor."""
import yaml
from pathlib import Path
from typing import List, Dict, Any

RULES_DIR = Path(__file__).parent / "rules"
VENDOR_FILE_MAP = {
    "cisco": "cisco_iosxe.yaml",
    "palo alto": "palo_alto.yaml",
    "palo_alto": "palo_alto.yaml",
    "arista": "arista_eos.yaml",
}

def load_rules(vendor: str) -> List[Dict[str, Any]]:
    """Load rules for a given vendor. Returns empty list if vendor not found."""
    key = vendor.lower().strip()
    filename = VENDOR_FILE_MAP.get(key)
    if not filename:
        return []
    path = RULES_DIR / filename
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("rules", [])

def list_all_rules() -> Dict[str, List[Dict[str, Any]]]:
    """Return all rules grouped by vendor."""
    return {
        "cisco": load_rules("cisco"),
        "palo_alto": load_rules("palo_alto"),
        "arista": load_rules("arista"),
    }
