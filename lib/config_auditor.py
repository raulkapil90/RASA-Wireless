import re
import json

class ConfigAuditor:
    """
    Config Doctor - Cisco 9800 WLC Configuration Auditor
    Analyzes IOS-XE configurations against industry best practices.
    """

    def __init__(self):
        self.rules = [
            self._audit_data_rates,
            self._audit_tpc_rrm,
            self._audit_security_ft
        ]

    def check_best_practices(self, config_text):
        """
        Main entry point for auditing configuration text.
        Returns a structured list of findings.
        """
        findings = []
        
        # Pre-process: Identify functional blocks
        # We split by '!' which is the standard IOS-XE delimiter
        blocks = config_text.split('!')
        
        for rule in self.rules:
            findings.extend(rule(blocks))
            
        return findings

    def _audit_data_rates(self, blocks):
        """
        Rule 1: Data Rates Audit
        Checks for legacy rates (1/2/5.5) and mandatory high rates (12/24).
        """
        findings = []
        low_rates_pattern = re.compile(r"data-rate (1\.0|2\.0|5\.5) (enable|mandatory)")
        mandatory_optimal_pattern = re.compile(r"data-rate (12\.0|24\.0) mandatory")
        
        for block in blocks:
            # Check within WLAN or AP Profile blocks
            if "wlan" in block or "ap profile" in block:
                # Find the profile/WLAN name for context
                name_match = re.search(r"wlan (\S+)|ap profile (\S+)", block)
                context = name_match.group(1) or name_match.group(2) if name_match else "Global/Unknown"

                if low_rates_pattern.search(block):
                    findings.append({
                        "severity": "HIGH",
                        "category": "RF Hygiene",
                        "issue": f"Low Data Rates Enabled on {context}",
                        "impact": "High Airtime Utilization / Sticky Clients. Legacy rates slow down the entire cell.",
                        "remediation_cmd": f"conf t; wlan profile {context} (or ap profile); no data-rate 1.0; no data-rate 2.0; no data-rate 5.5; end"
                    })
                
                # If it's a 5GHz profile, we really want 12 or 24 mandatory
                if "5ghz" in block.lower() and not mandatory_optimal_pattern.search(block):
                    findings.append({
                        "severity": "MEDIUM",
                        "category": "RF Optimization",
                        "issue": f"Non-Optimal Mandatory Rate on 5GHz ({context})",
                        "impact": "Management frames may be sent at suboptimal rates. 12Mbps or 24Mbps is recommended for high density.",
                        "remediation_cmd": f"conf t; ap profile {context}; dot11 5ghz data-rate 24.0 mandatory; end"
                    })
                    
        return findings

    def _audit_tpc_rrm(self, blocks):
        """
        Rule 2: RRM/TPC Audit
        Detects aggressive power settings.
        """
        findings = []
        # Support both old-style 'tx-power-min' and new-style 'tpc-threshold-min'
        tpc_min_pattern = re.compile(r"(tx-power-min|tpc-threshold-min) (-?\d+)")
        
        for block in blocks:
            if "ap profile" in block or "ap dot11" in block:
                name_match = re.search(r"ap profile (\S+)", block)
                context = name_match.group(1) if name_match else "Global/Unknown"
                
                match = tpc_min_pattern.search(block)
                if match:
                    tpc_min = int(match.group(2))
                    if tpc_min < -10:
                        findings.append({
                            "severity": "MEDIUM",
                            "category": "Roaming",
                            "issue": f"Aggressive TPC-Min Setting ({tpc_min} dBm) on {context}",
                            "impact": "APs may shrink their coverage too much, creating 'coverage holes' or 'black holes' where clients cannot roam.",
                            "remediation_cmd": f"conf t; ap profile {context}; dot11 5ghz rrm tpc-threshold-min -10; end"
                        })
                        
        return findings

    def _audit_security_ft(self, blocks):
        """
        Rule 3: Security/FT Audit
        Detects missing Fast Transition (802.11r) on potential voice/mobile SSIDs.
        """
        findings = []
        # Look for WLANs with WPA2/WPA3 but no FT
        wlan_pattern = re.compile(r"wlan (\S+)")
        security_pattern = re.compile(r"security (wpa akm dot1x|wpa akm psk)")
        ft_pattern = re.compile(r"ft enable")
        
        for block in blocks:
            if "wlan" in block:
                wlan_match = wlan_pattern.search(block)
                if wlan_match:
                    wlan_name = wlan_match.group(1)
                    # If it looks like a corporate/voice SSID
                    if security_pattern.search(block) and not ft_pattern.search(block):
                        findings.append({
                            "severity": "HIGH",
                            "category": "Mobility",
                            "issue": f"Fast Transition (802.11r) Disabled on {wlan_name}",
                            "impact": "Voice calls or real-time apps will experience audio gaps (>150ms) during roams due to full 802.1X re-authentication.",
                            "remediation_cmd": f"conf t; wlan {wlan_name}; ft; end"
                        })
                        
        return findings

# Example Usage
if __name__ == "__main__":
    sample_config = """
wlan Corporate 1
 security wpa akm dot1x
 no ft
!
ap profile HighDensity
 dot11 5ghz data-rate 1.0 enable
 dot11 5ghz data-rate 2.0 enable
 dot11 5ghz data-rate 12.0 mandatory
!
ap profile Warehouse
 dot11 5ghz rrm tpc-threshold-min -20
!
"""
    auditor = ConfigAuditor()
    results = auditor.check_best_practices(sample_config)
    print(json.dumps(results, indent=2))
