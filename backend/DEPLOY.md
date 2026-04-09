# Railway Deployment Guide for ARKS NetOps AI Backend

This document details the step-by-step process to deploy the NetOps AI backend to Railway.app.

## Prerequisites
1. A GitHub account with the code repository containing this project.
2. A Railway.app account (you can sign up via GitHub).

## Deployment Steps

### 1. Create the Railway Project
1. Go to your Railway dashboard (https://railway.app/dashboard).
2. Click **+ New Project** and select **Deploy from GitHub repo**.
3. Select your RASA Wireless repository.
4. Railway will analyze the root of your project, but since our backend is in a specific folder, we need to configure the **Root Directory**.

### 2. Configure the Backend Service
1. Click on the project node that was just created to open its settings.
2. Navigate to the **Settings** tab.
3. Under **Deploy**, find **Root Directory** and set it to `/backend`.
4. Railway will automatically detect the `railway.toml` and `Procfile` present in this folder, and it will use the `nixpacks` builder to install everything from `requirements.txt`.
5. Under **Environment**, add your environment variables. You can find the required variables in `backend/.env.example`.

### 3. Setting Environment Variables
To get the backend running correctly, add the following variables in the **Variables** tab of your Railway service:

- `CCC_BASE_URL` (Optional for LIVE mode)
- `CCC_USERNAME` (Optional for LIVE mode)
- `CCC_PASSWORD` (Optional for LIVE mode)

> **Note on Demo Mode:** If you leave the `CCC_*` variables blank, the app will gracefully default to Demo Mode and use embedded mocked data exactly as it behaves locally.

If you have them, you should also configure the LLM keys:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

### 4. Deploy and Monitor
1. Once variables are set, Railway will automatically trigger a deployment.
2. In the **Variables** or **Settings** tab, generate a Public Domain (e.g., `netops-ai-production.up.railway.app`).
3. View the **Deployments** tab to watch the build logs.
4. Once deployed, test the health endpoint by navigating to:
   `https://[YOUR_RAILWAY_DOMAIN]/api/health`

### 5. Update the Frontend
Once your API is live and you have your Railway public domain:
1. Copy the domain URL.
2. Open your Frontend deployment on Vercel.
3. Go to the project **Settings -> Environment Variables**.
4. Set `VITE_API_BASE_URL` to `https://[YOUR_RAILWAY_DOMAIN]`.
5. Redeploy your frontend to apply the new API base URL.

## 6. Two-Tier Self-Learning Knowledge Base

The RASA Backend incorporates a natively persistent **Multi-Tier Knowledge Base** that intercepts Wi-Fi log analysis to save inference time, token length, and enforce deterministic consistency over time. 

### How it Works (Tiers)
*   **Tier 1 Responses:** Automatically fetched dynamically using exact `sha256` pattern-matching or `SentenceTransformer` Semantic Fallback via persistent local memory mapping. This bypasses generic LLM analysis, dropping processing time to milliseconds natively.
*   **Tier 2 Responses:** The standard **LLM Consensus Engine** execution pipeline. Used dynamically on unstructured or previously unseen telemetry. If its output confidence meets structural alignment vectors, it automatically seeds itself back into Tier 1!

### The Confidence Gate
Inside `backend/services/knowledge_base.py`, standard operations are shielded by a **Confidence Gate**. When a Tier-2 Groq Consensus result finishes: 
- If `confidence >= 0.80` (80%), the engine safely writes the log fingerprint, exact diagnostic array, and extracted context to persistent Chroma DB and internal SQLite memory. 
- The next time the identical log prints onto radius or infrastructure feeds, it natively intercepts as Tier 1.

### Maintenance (Reset / Export)
Because the DB is constructed on SQLite (`backend/db/netops.db`) and ChromaDB (`backend/chroma_store`), resetting the entire state is as trivial as deleting the individual persistent namespaces and restarting internal mapping files:
```bash
# Safely clear active persistent indices 
rm -rf backend/chroma_store
rm backend/db/netops.db

# Re-seed basic deterministic models
python backend/data/seed_resolutions.py
```

### 7. ChromaDB Persistence on Railway

When deploying to Railway, the container filesystem is ephemeral. This means ChromaDB will reset on every deployment if you do not attach a persistent volume to `CHROMA_DB_PATH`.

**To persist your RAG knowledge base & tier-1 deterministic cache:**
1. Go to your Railway project dashboard and open the `backend` service settings.
2. Navigate to the **Volumes** tab.
3. Click **+ New Volume** and give it a name (e.g. `chroma-data`).
4. Set the **Mount Path** to `/app/chroma_store` (or wherever your `CHROMA_DB_PATH` is set inside the container, matching your Railway Nixpacks working directory).
5. Ensure `CHROMA_DB_PATH=/app/chroma_store` is injected in the **Variables** tab.

**Warning:** Without a volume mounted, all stored vectors and autonomous resolutions will be completely wiped on every new container restart.

---

## 8. Sentry Error Tracking Setup

Sentry captures unhandled exceptions, slow transactions, and performance regressions in real-time. The backend is already instrumented — you just need to connect your DSN.

### Create a Free Account
1. Go to **https://sentry.io** and sign up for a free account (supports up to 5k errors/month).
2. Click **Create Project**, select **Python**, and name it `netops-ai-backend`.
3. Sentry will display a `dsn=` value — copy this (looks like `https://abc123@o123456.ingest.sentry.io/789`).

### Find Your DSN
1. In your Sentry project, navigate to **Settings → Projects → [Your Project] → Client Keys (DSN)**.
2. The **Default** DSN is the value you need.

### Set Railway Environment Variables
In the **Variables** tab of your Railway backend service, add:

| Variable | Value |
|---|---|
| `SENTRY_DSN` | `https://your-key@oXXXXX.ingest.sentry.io/XXXXXX` |
| `ENVIRONMENT` | `production` |

> **Note:** If `SENTRY_DSN` is left empty or not set, Sentry is silently disabled. The app runs normally without it — this is intentional for local development.

### Verify in Production
After deploying with the DSN set, hit `GET /api/sentry-test`. You should see that error appear in your Sentry dashboard within seconds.

> ⚠️ **Remove the `/api/sentry-test` route before going live to prevent accidental error spam.**
