with open("backend/DEPLOY.md", "a", encoding="utf-8") as f:
    f.write("""
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
""")
print("Done")
