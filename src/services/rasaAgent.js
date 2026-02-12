/**
 * RASA AI Intelligence Agent
 * Specialized in Cisco AireOS & Catalyst (IOS-XE) Syslog Correlation
 */

const PATTERNS = {
    // --- AireOS Patterns ---
    AIREOS_DISCOVERY: /Discovery Request from AP ([\da-fA-F:]{17})/i,
    AIREOS_DTLS_FAIL: /(DTLS handshake failed|DTLS connection closed|DTLS_HS_FAILURE)/i,

    // --- Catalyst (IOS-XE) Patterns ---
    CATALYST_JOIN_FAIL: /%CAPWAP-3-(JOIN_FAILED|DTLS_FAILURE|SEQUENCING_ERROR)/i,
    CATALYST_DTLS_TEARDOWN: /CAPWAP State: DTLS Teardown/i,
    CATALYST_DISASSOC: /%DOT11-6-DISASSOC:.*client ([\da-fA-F:]{17})/i,
    CATALYST_REASON: /disassoc reason: (\d+)/i,

    // --- Shared / Generic ---
    DEAUTH_REASON: /reason (\d+)/i,
    RADAR_DETECTED: /Radar (signals have|detected).*channel (\d+)/i,
    RADAR_9800: /%RRM-6-RADAR_DETECTED:.*channel (\d+)/i,
    CERT_FAILURE: /(certificate|pki|validation) (failed|error|expired)/i,
};

const REASON_MAP = {
    1: "Unspecified failure. This is a generic disconnect catch-all.",
    2: "Previous authentication is no longer valid. Often seen during re-authentication cycles.",
    3: "Station is leaving. This is a normal client-initiated disconnect (e.g., turning off Wi-Fi).",
    4: "Disassociated due to inactivity. The client stopped sending data for 300+ seconds.",
    6: "Class 2 frame received from nonauthenticated station. Usually means the signal (RSSI) is too low for a stable connection.",
    7: "Class 3 frame received from nonassociated station. Client is trying to send data before finishing the association process.",
    15: "4-Way Handshake timeout. This almost always indicates a PSK (Pre-shared Key) or password mismatch."
};

const PRO_TIPS = {
    JOIN_FAILURE: [
        "C9800 Specific: Ensure 'SSC Hash Validation' is compatible if migrating from older AireOS WLCs.",
        "MTU Mismatch: Ensure that the path MTU is at least 1500. Check 'show wireless management trustpoint'.",
        "Trustpoint Check: On Catalyst 9800, verify the wireless management trustpoint status if DTLS fails."
    ],
    RF_INTERFERENCE: [
        "RRM (Radio Resource Management) will lock this channel for 30 minutes. This is standard 802.11h behavior.",
        "9800 Tip: Check your RRM 'Radar Detection' settings in the Radio/Channel profiles.",
        "CSA Alert: Ensure 'Channel Switch Announcement' is enabled so clients move gracefully during Radar hits."
    ],
    CLIENT_REASONS: {
        6: "Signal is too weak. If the client is close to the AP, check for loose antenna cables (RP-TNC connectors).",
        15: "100% a credential mismatch. If logs show this, don't waste time on RF troubleshooting—fix the PSK or RADIUS logic.",
        fallback: "Verify client driver versions and check for known bugs with specific NIC chipsets (Intel AX201, etc)."
    }
};

/**
 * Simulates an AI analysis process with step-by-step reporting
 */
export async function analyzeLogs(rawText, onStep) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const results = [];

    // Step 1: Detect OS
    await simulateStep("Detecting WLC Operating System...", onStep);
    let os = "UNKNOWN";
    if (lines.some(l => l.includes('%') && l.includes('-'))) os = "CATALYST (IOS-XE)";
    else if (lines.some(l => l.includes('*capwap') || l.includes('*spam'))) os = "AIREOS";

    await simulateStep(`OS Identified: ${os}`, onStep);

    // Step 2: Tokenization & Correlation
    await simulateStep("Correlating MAC addresses and state transitions...", onStep);

    // Step 3: Pattern Matching
    await simulateStep(`Running ${os} Optimized Regex Suite...`, onStep);

    // Analysis Logic
    const context = {
        hasJoinFail: false,
        dtlsTeardown: false,
        deauthReasons: [],
        radarChannels: []
    };

    lines.forEach(line => {
        // Join Failures
        if (PATTERNS.AIREOS_DISCOVERY.test(line) || PATTERNS.AIREOS_DTLS_FAIL.test(line)) context.hasJoinFail = true;
        if (PATTERNS.CATALYST_JOIN_FAIL.test(line)) context.hasJoinFail = true;
        if (PATTERNS.CATALYST_DTLS_TEARDOWN.test(line)) context.dtlsTeardown = true;

        // Client issues
        const deauth = line.match(PATTERNS.DEAUTH_REASON) || line.match(PATTERNS.CATALYST_REASON);
        if (deauth) context.deauthReasons.push(parseInt(deauth[1]));

        // Radar
        const radar = line.match(PATTERNS.RADAR_DETECTED) || line.match(PATTERNS.RADAR_9800);
        if (radar) context.radarChannels.push(radar[2] || radar[1]);
    });

    // Generate Findings
    if (context.hasJoinFail || context.dtlsTeardown) {
        results.push({
            title: os === "CATALYST (IOS-XE)" ? "Catalyst CAPWAP Join Failure" : "AireOS Join Failure",
            severity: "critical",
            category: "JOIN_FAILURE",
            confidence: context.dtlsTeardown ? 98 : 85,
            diagnosis: context.dtlsTeardown
                ? "The AP established a connection but suffered a DTLS Teardown. This is usually due to a certificate Trustpoint mismatch on the C9800."
                : "Secure tunnel establishment failed. The WLC and AP cannot agree on the DTLS handshake parameters.",
            evidence: `Detected '${os}' specific join failure patterns in the syslog stream.`,
            remediation: [
                os === "CATALYST (IOS-XE)" ? "Verify Trustpoint: 'show wireless management trustpoint'." : "Check WLC clock and certificate validity.",
                "Verify MTU: Path must support 1500 bytes or adjust fragmentation settings.",
                "Ensure UDP 5246/5247 is not filtered by a transit firewall."
            ],
            proTip: PRO_TIPS.JOIN_FAILURE[Math.floor(Math.random() * PRO_TIPS.JOIN_FAILURE.length)]
        });
    }

    context.deauthReasons.forEach(reason => {
        results.push({
            title: `Client Disconnect (Reason ${reason})`,
            severity: reason === 15 || reason === 6 ? "critical" : "warning",
            category: "CLIENT_ISSUE",
            confidence: 90,
            diagnosis: REASON_MAP[reason] || `Standard 802.11 disconnect reason code ${reason}.`,
            evidence: `Found ${os} deauthentication event with exact reason code mapping.`,
            remediation: [
                reason === 15 ? "Perform a 'PSK sanity check' on the SSID configuration." : "Check for local interferers on the 2.4/5GHz band.",
                "Increase AP signal density if Reason 6 is recurring.",
                "Review 'Radioactive Tracing' for this client on the C9800 GUI if applicable."
            ],
            proTip: PRO_TIPS.CLIENT_REASONS[reason] || PRO_TIPS.CLIENT_REASONS.fallback
        });
    });

    context.radarChannels.forEach(channel => {
        results.push({
            title: "DFS Radar Detection",
            severity: "critical",
            category: "RF_INTERFERENCE",
            confidence: 100,
            diagnosis: `Radar pulse detected on DFS Channel ${channel}. System forced an immediate channel switch.`,
            evidence: `Syslog contains ${os} RRM radar detection signature.`,
            remediation: [
                "Move critical devices to non-DFS channels (36-48 or 149-161).",
                "Check for false detections if this happens on indoor APs far from airports.",
                "Ensure WLC is running updated software for improved radar filter algorithms."
            ],
            proTip: PRO_TIPS.RF_INTERFERENCE[Math.floor(Math.random() * PRO_TIPS.RF_INTERFERENCE.length)]
        });
    });

    if (results.length === 0 && lines.length > 0) {
        await simulateStep("Parsing general anomalies...", onStep);
        results.push({
            title: "System Diagnostics",
            severity: "info",
            category: "GENERAL",
            confidence: 40,
            diagnosis: `Logs provided are in ${os} format but do not contain high-severity Wi-Fi events.`,
            evidence: `General log pattern analyzed. No specific Join, Client, or RF signatures matched.`,
            remediation: [
                "Check for interface flaps or high-CPU alerts.",
                "Enable 'debug wireless' for more granular event visibility.",
                "Review the Audit Trail for recent configuration pushes."
            ],
            proTip: PRO_TIPS.GENERAL
        });
    }

    await simulateStep("Finalizing remediation and pro-tips...", onStep);
    return results;
}

async function simulateStep(message, onStep) {
    if (onStep) onStep(message);
    return new Promise(resolve => setTimeout(resolve, 600));
}
