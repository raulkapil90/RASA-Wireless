// ============================================================================
// RASA NetOps AI — Multi-LLM Consensus Engine (Frontend)
// Fan-out: Gemini 2.0 Flash | Groq Llama-3.3-70B (parallel analysts)
// Fan-in: Gemini 2.0 Flash Consensus Synthesizer (authoritative JSON)
// ============================================================================

const API_BASE = "http://localhost:8000";

export const analyzeLogs = async (logData, onStep) => {
    const steps = [
        "Engaging RASA Consensus Engine...",
        "Analyst #1: Client/802.11 deep analysis via Groq...",
        "Analyst #2: Infrastructure/AP deep analysis via Groq...",
        "Both analysts running in parallel — waiting for results...",
        "Running Consensus Synthesis...",
        "Generating structured findings...",
    ];

    let stepIndex = 0;
    // Animate steps while the API request processes
    // Pace messages over ~15 seconds (2 steps per 5s) while API processes
    const stepInterval = setInterval(() => {
        if (stepIndex < steps.length) {
            onStep(steps[stepIndex++]);
        } else {
            clearInterval(stepInterval);
        }
    }, 2500);

    // Abort signal — cancel fetch if it takes > 120 seconds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
        const response = await fetch(`${API_BASE}/analyze-logs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logs: logData }),
            signal: controller.signal,
        });

        clearInterval(stepInterval);
        clearTimeout(timeout);

        if (!response.ok) {
            onStep(`HTTP Error ${response.status}: ${response.statusText}`);
            throw new Error(`Backend returned ${response.status}`);
        }

        onStep("Consensus Analysis Complete — Rendering findings...");
        const data = await response.json();
        return data.findings || [];

    } catch (error) {
        clearInterval(stepInterval);
        console.error("RASA Consensus Engine Error:", error);
        return [{
            title: "RASA Backend Unreachable",
            severity: "critical",
            category: "UNKNOWN_ERR",
            confidence: 0,
            phase: "Network Communication",
            diagnosis: "Failed to reach the RASA AI backend. Ensure the Python FastAPI server is running on port 8000.",
            evidence: error.message,
            remediation: [
                "Open a new Command Prompt window and run: uvicorn backend.main:app --reload --port 8000",
                "Check browser console (F12) for CORS or network-specific errors.",
                "Verify your .env file contains ANTHROPIC_API_KEY."
            ],
            consensus: { agreement: "N/A", note: "Backend connection failed before analysis could begin." }
        }];
    }
};

