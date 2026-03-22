#!/usr/bin/env node
import { execSync } from "child_process";

// ─── Variables ───
const PROJECT_ID = "sancho-488710";
const REGION = "us-central1";
const REGISTRY = `${REGION}-docker.pkg.dev/${PROJECT_ID}/sancho`;
const SUPABASE_URL = "https://nskvesjqksuotmflalim.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Y5ktNVAWxe8R_33bKqnn3A_Q8luiWB0";
const FRONTEND_URL = "https://sancho.weavers.cz";

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  return execSync(cmd, { stdio: "inherit", cwd: "D:/Sancho" });
}

function runCapture(cmd) {
  console.log(`\n> ${cmd}\n`);
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

// ─── 1. Update backend CORS to allow the new domain ───
run(
  `gcloud run services update sancho-api` +
    ` --project=${PROJECT_ID}` +
    ` --region=${REGION}` +
    ` --update-env-vars=Cors__AllowedOrigins=${FRONTEND_URL}` +
    ` --quiet`
);

// ─── 2. Get backend URL ───
const BACKEND_URL = runCapture(
  `gcloud run services describe sancho-api` +
    ` --project=${PROJECT_ID}` +
    ` --region=${REGION}` +
    ` --format=value(status.url)`
);
console.log(`Backend: ${BACKEND_URL}`);

// ─── 3. Rebuild frontend with correct backend URL baked in ───
run(
  `docker build` +
    ` --build-arg NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}` +
    ` --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}` +
    ` --build-arg NEXT_PUBLIC_API_URL=${BACKEND_URL}` +
    ` -t ${REGISTRY}/sancho-frontend:latest` +
    ` ./frontend`
);

// ─── 4. Push & redeploy frontend ───
run(`docker push ${REGISTRY}/sancho-frontend:latest`);

run(
  `gcloud run deploy sancho-frontend` +
    ` --image=${REGISTRY}/sancho-frontend:latest` +
    ` --project=${PROJECT_ID}` +
    ` --region=${REGION}` +
    ` --platform=managed` +
    ` --allow-unauthenticated` +
    ` --port=8080` +
    ` --memory=256Mi` +
    ` --cpu=1` +
    ` --min-instances=0` +
    ` --max-instances=1` +
    ` --set-env-vars=HOSTNAME=0.0.0.0` +
    ` --quiet`
);

// ─── Done ───
console.log(`\nFrontend: ${FRONTEND_URL}`);
console.log(`Backend:  ${BACKEND_URL}`);
