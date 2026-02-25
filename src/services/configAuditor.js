/**
 * Config Doctor - Cisco 9800 WLC Configuration Auditor
 * JavaScript port of lib/config_auditor.py for browser-side analysis.
 */

class ConfigAuditor {
    constructor() {
        this.rules = [
            this._auditDataRates.bind(this),
            this._auditTpcRrm.bind(this),
            this._auditSecurityFt.bind(this)
        ];
    }

    /**
     * Main entry point for auditing configuration text.
     * @param {string} configText 
     * @returns {Array} Structured list of findings
     */
    checkBestPractices(configText) {
        const findings = [];

        // Pre-process: Identify functional blocks
        // We split by '!' which is the standard IOS-XE delimiter
        const blocks = configText.split('!');

        this.rules.forEach(rule => {
            const ruleFindings = rule(blocks);
            if (ruleFindings && ruleFindings.length > 0) {
                findings.push(...ruleFindings);
            }
        });

        return findings;
    }

    _auditDataRates(blocks) {
        const findings = [];
        const lowRatesPattern = /data-rate (1\.0|2\.0|5\.5) (enable|mandatory)/;
        const mandatoryOptimalPattern = /data-rate (12\.0|24\.0) mandatory/;

        blocks.forEach(block => {
            // Check within WLAN or AP Profile blocks
            if (block.includes("wlan") || block.includes("ap profile")) {
                const nameMatch = block.match(/wlan (\S+)|ap profile (\S+)/);
                const context = nameMatch ? (nameMatch[1] || nameMatch[2]) : "Global/Unknown";

                if (lowRatesPattern.test(block)) {
                    findings.push({
                        severity: "HIGH",
                        category: "RF Hygiene",
                        issue: `Low Data Rates Enabled on ${context}`,
                        impact: "High Airtime Utilization / Sticky Clients. Legacy rates slow down the entire cell.",
                        remediation_cmd: `conf t; wlan profile ${context} (or ap profile); no data-rate 1.0; no data-rate 2.0; no data-rate 5.5; end`
                    });
                }

                // If it's a 5GHz profile, we really want 12 or 24 mandatory
                // Using a simpler check for '5ghz' string
                if (block.toLowerCase().includes("5ghz") && !mandatoryOptimalPattern.test(block)) {
                    findings.push({
                        severity: "MEDIUM",
                        category: "RF Optimization",
                        issue: `Non-Optimal Mandatory Rate on 5GHz (${context})`,
                        impact: "Management frames may be sent at suboptimal rates. 12Mbps or 24Mbps is recommended for high density.",
                        remediation_cmd: `conf t; ap profile ${context}; dot11 5ghz data-rate 24.0 mandatory; end`
                    });
                }
            }
        });
        return findings;
    }

    _auditTpcRrm(blocks) {
        const findings = [];
        // Support both old-style 'tx-power-min' and new-style 'tpc-threshold-min'
        const tpcMinPattern = /(tx-power-min|tpc-threshold-min) (-?\d+)/;

        blocks.forEach(block => {
            if (block.includes("ap profile") || block.includes("ap dot11")) {
                const nameMatch = block.match(/ap profile (\S+)/);
                const context = nameMatch ? nameMatch[1] : "Global/Unknown";

                const match = block.match(tpcMinPattern);
                if (match) {
                    const tpcMin = parseInt(match[2], 10);
                    if (tpcMin < -10) {
                        findings.push({
                            severity: "MEDIUM",
                            category: "Roaming",
                            issue: `Aggressive TPC-Min Setting (${tpcMin} dBm) on ${context}`,
                            impact: "APs may shrink their coverage too much, creating 'coverage holes' or 'black holes' where clients cannot roam.",
                            remediation_cmd: `conf t; ap profile ${context}; dot11 5ghz rrm tpc-threshold-min -10; end`
                        });
                    }
                }
            }
        });
        return findings;
    }

    _auditSecurityFt(blocks) {
        const findings = [];
        const wlanPattern = /wlan (\S+)/;
        const securityPattern = /security (wpa akm dot1x|wpa akm psk)/;
        const ftPattern = /ft enable/;

        blocks.forEach(block => {
            if (block.includes("wlan")) {
                const wlanMatch = block.match(wlanPattern);
                if (wlanMatch) {
                    const wlanName = wlanMatch[1];
                    // If it looks like a corporate/voice SSID (has security but no FT)
                    if (securityPattern.test(block) && !ftPattern.test(block)) {
                        findings.push({
                            severity: "HIGH",
                            category: "Mobility",
                            issue: `Fast Transition (802.11r) Disabled on ${wlanName}`,
                            impact: "Voice calls or real-time apps will experience audio gaps (>150ms) during roams due to full 802.1X re-authentication.",
                            remediation_cmd: `conf t; wlan ${wlanName}; ft; end`
                        });
                    }
                }
            }
        });
        return findings;
    }
}

export const configAuditor = new ConfigAuditor();
