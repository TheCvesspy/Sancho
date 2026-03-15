#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ───
# Change these to match your GCP setup
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID env var}"
REGION="${GCP_REGION:-us-central1}"
REPO_NAME="${GAR_REPO:-sancho}"

# Supabase config (required)
SUPABASE_URL="${SUPABASE_URL:?Set SUPABASE_URL env var}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:?Set SUPABASE_ANON_KEY env var}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY env var}"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

echo "=== Sancho — Google Cloud Run Deployment ==="
echo "Project:  $PROJECT_ID"
echo "Region:   $REGION"
echo "Registry: $REGISTRY"
echo ""

# ─── Ensure Artifact Registry repo exists ───
echo "→ Ensuring Artifact Registry repository exists..."
gcloud artifacts repositories describe "$REPO_NAME" \
  --project="$PROJECT_ID" \
  --location="$REGION" &>/dev/null || \
gcloud artifacts repositories create "$REPO_NAME" \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  --repository-format=docker \
  --description="Sancho container images"

# ─── Configure Docker auth ───
echo "→ Configuring Docker authentication..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ─── Build & push backend ───
echo ""
echo "=== Building backend ==="
docker build -t "${REGISTRY}/sancho-api:latest" ./backend
docker push "${REGISTRY}/sancho-api:latest"

# ─── Deploy backend to Cloud Run ───
echo ""
echo "=== Deploying backend to Cloud Run ==="
gcloud run deploy sancho-api \
  --image="${REGISTRY}/sancho-api:latest" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=1 \
  --set-env-vars="ASPNETCORE_ENVIRONMENT=Production" \
  --set-env-vars="Supabase__Url=${SUPABASE_URL}" \
  --set-env-vars="Supabase__ServiceRoleKey=${SUPABASE_SERVICE_ROLE_KEY}" \
  --quiet

# Get the backend URL
BACKEND_URL=$(gcloud run services describe sancho-api \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format="value(status.url)")

echo "✓ Backend deployed at: $BACKEND_URL"

# ─── Build & push frontend ───
echo ""
echo "=== Building frontend ==="
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_API_URL="$BACKEND_URL" \
  -t "${REGISTRY}/sancho-frontend:latest" \
  ./frontend
docker push "${REGISTRY}/sancho-frontend:latest"

# ─── Deploy frontend to Cloud Run ───
echo ""
echo "=== Deploying frontend to Cloud Run ==="
gcloud run deploy sancho-frontend \
  --image="${REGISTRY}/sancho-frontend:latest" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=1 \
  --set-env-vars="PORT=8080,HOSTNAME=0.0.0.0" \
  --quiet

FRONTEND_URL=$(gcloud run services describe sancho-frontend \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format="value(status.url)")

echo "✓ Frontend deployed at: $FRONTEND_URL"

# ─── Update backend CORS to allow frontend origin ───
echo ""
echo "=== Updating backend CORS for frontend URL ==="
gcloud run services update sancho-api \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --update-env-vars="Cors__AllowedOrigins=${FRONTEND_URL}" \
  --quiet

echo ""
echo "=== Deployment complete! ==="
echo "  Frontend: $FRONTEND_URL"
echo "  Backend:  $BACKEND_URL"
