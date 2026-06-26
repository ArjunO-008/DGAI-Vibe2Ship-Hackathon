# Deploying Deadline Guardian AI to Google Cloud Run

This deploys the built Vite SPA as a containerized Nginx server on Cloud Run — fast, free-tier friendly, and satisfies the hackathon's "deployed on Google Cloud" requirement.

Files already added to the repo for this:
- `Dockerfile` — multi-stage build (Node build → Nginx serve)
- `nginx.conf` — serves the SPA on port 8080 with client-side routing fallback
- `.dockerignore`

## Prerequisites

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) if you don't have it.
2. Have a Google Cloud project. Create one free at https://console.cloud.google.com if needed.
3. Make sure billing is enabled on the project (Cloud Run has a generous free tier — a small app like this will cost effectively nothing).

## Steps

```bash
# 1. Login and set your project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Enable the required APIs (one-time)
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# 3. From the repo root (where the Dockerfile is), deploy directly with one command:
gcloud run deploy deadline-guardian-ai \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080
```

`gcloud run deploy --source .` builds the container using Cloud Build and deploys it — no need to manually build/push images.

When it finishes, it prints a **Service URL** like:
```
https://deadline-guardian-ai-xxxxxxxxxx.asia-south1.run.app
```

That's your **Deployed Application Link** for the BlockseBlock submission form.

## Setting the Gemini API key on the deployed app

The app reads the key from `VITE_GEMINI_API_KEY` at **build time** (Vite env vars are baked into the static bundle), or the user can paste it into the in-app Settings page at runtime (stored in their browser's localStorage — no server involved).

If you want the deployed demo to come pre-configured with a key so judges don't have to enter one:

```bash
gcloud run deploy deadline-guardian-ai \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-build-env-vars VITE_GEMINI_API_KEY=YOUR_GEMINI_KEY
```

⚠️ Since this bakes the key into the public JS bundle, only do this with a key that has restricted quota/usage, or just leave it unset — the app's local-simulation fallback mode is fully functional for demo purposes and won't break the evaluation.

## Redeploying after changes

Just re-run the same `gcloud run deploy --source .` command — it rebuilds and creates a new revision automatically, keeping the same URL.

## Verifying

Visit the printed Service URL in a browser. You should see the Deadline Guardian AI onboarding screen. The link must stay live through the evaluation period, so don't delete the Cloud Run service or the project until results are out.