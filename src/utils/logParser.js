export function parseLog(rawText) {
    const logs = rawText.trim();
    if (!logs) return [];

    const findings = [];

    // 1. AP JOIN FAILURES (WLC/AP Joining Issues)
    if (logs.includes('DTLS connection closed') || logs.includes('DTLS_HS_FAILURE') || logs.includes('Discovery Request')) {
        findings.push({
            title: 'AP Join Failure (AireOS)',
            severity: 'critical',
            category: 'JOIN_FAILURE',
            diagnosis: 'The Access Point is failing to establish a secure DTLS tunnel with the WLC. This usually prevents the AP from appearing as "Registered".',
            evidence: 'Detected "DTLS connection closed" or handshake failure patterns in logs.',
            remediation: [
                'Verify MTU size on the path; DTLS packets are often fragmented. Try lowering MTU to 1300.',
                'Check for Certificate Expiration (especially on older AP models like 3702/2702).',
                'Ensure the AP can reach the WLC on UDP ports 5246 (Control) and 5247 (Data).',
                'Check for firewall/IPS blocking the DTLS handshake.'
            ],
            proTip: 'Known Bug: CSCvb34988. Some APs may need a software upgrade to handle newer SHA2 certificates.'
        });
    }

    // 2. CLIENT DISCONNECTS (Deauth Reason Codes)
    const deauthMatch = logs.match(/Received DEAUTH from client.*reason (\d+)/i) ||
        logs.match(/Sent DEAUTH to client.*reason (\d+)/i) ||
        logs.match(/reason code (\d+)/i);

    if (deauthMatch) {
        const reasonCode = parseInt(deauthMatch[1]);
        const reasonMap = {
            1: 'Unspecified failure.',
            2: 'Previous authentication is no longer valid.',
            3: 'Station is leaving (standard roaming/disconnect).',
            4: 'Disassociated due to inactivity.',
            6: 'Class 2 frame received from nonauthenticated station (RSSI too low).',
            7: 'Class 3 frame received from nonassociated station.',
            15: '4-Way Handshake timeout (Possible Pre-shared Key mismatch).'
        };

        findings.push({
            title: `Client Disconnect (Reason ${reasonCode})`,
            severity: reasonCode === 15 ? 'critical' : 'warning',
            category: 'CLIENT_ISSUE',
            diagnosis: `The client disconnected with reason code ${reasonCode}: ${reasonMap[reasonCode] || 'Unknown reason code.'}`,
            evidence: `Found "DEAUTH" event with reason code ${reasonCode} in the log stream.`,
            remediation: [
                reasonCode === 15 ? 'Check if the Wi-Fi password (PSK) was recently changed.' : 'No action needed if this was a user-initiated disconnect (Reason 3).',
                'If Reason 6 is frequent, check for "coverage holes" and increase AP density.',
                'Verify client device drivers are up-to-date.'
            ],
            proTip: 'Reason 15 is almost always a credential/PSK mismatch. Check your RADIUS logs or pre-shared key config.'
        });
    }

    // 3. RADAR / DFS ISSUES
    if (logs.toLowerCase().includes('radar') || logs.toLowerCase().includes('dfs') || logs.includes('NON_OCCUPANCY_PERIOD')) {
        findings.push({
            title: 'DFS Radar Interference',
            severity: 'critical',
            category: 'RF_INTERFERENCE',
            diagnosis: 'The AP detected a Radar signal (likely from weather or airport radar) on a DFS channel and was forced to change channels immediately.',
            evidence: 'Log indicates a Radar event or entry into Non-Occupancy Period for the current channel.',
            remediation: [
                'Move static channel assignments to non-DFS channels (36-48, 149-161) if this is recurring.',
                'Check for external interferers like Doppler Weather systems near your facility.',
                'Use "Channel Planning" in RRM to avoid frequently impacted channels.'
            ],
            proTip: 'Cisco RRM will mark a DFS channel as "unusable" for 30 minutes (Quiet Period) after a radar hit.'
        });
    }

    // fallback for general errors
    if (findings.length === 0 && (logs.toLowerCase().includes('error') || logs.toLowerCase().includes('fail'))) {
        findings.push({
            title: 'System Error Detected',
            severity: 'warning',
            category: 'GENERAL',
            diagnosis: 'General error or failure detected in the syslog stream.',
            evidence: 'Keywords "error" or "fail" found in the input.',
            remediation: [
                'Review full syslog context for associated error codes.',
                'Check WLC health metrics and CPU utilization.',
                'Verify if any configuration changes were pushed recently.'
            ]
        });
    }

    return findings;
}
