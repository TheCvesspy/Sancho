#!/usr/bin/env node
/**
 * Full release script — builds and deploys backend + frontend to Google Cloud Run.
 *
 * Usage:
 *   node scripts/deploy.mjs                # deploy both
 *   node scripts/deploy.mjs --backend      # deploy backend only
 *   node scripts/deploy.mjs --frontend     # deploy frontend only
 *   node scripts/deploy.mjs --skip-build   # redeploy existing images without rebuilding
 */
import { execSync } from "child_process";

// ─── Config ───
const PROJECT_ID = "sancho-488710";
const REGION = "us-central1";
const REGISTRY = `${REGION}-docker.pkg.dev/${PROJECT_ID}/sancho`;
const SUPABASE_URL = "https://nskvesjqksuotmflalim.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Y5ktNVAWxe8R_33bKqnn3A_Q8luiWB0";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const FRONTEND_DOMAIN = "https://sancho.weavers.cz";
const ROOT_DIR = "D:/Sancho";

const BACKEND_IMAGE = `${REGISTRY}/sancho-api:latest`;
const FRONTEND_IMAGE = `${REGISTRY}/sancho-frontend:latest`;

// ─── Parse flags ───
const args = process.argv.slice(2);
const backendOnly = args.includes("--backend");
const frontendOnly = args.includes("--frontend");
const skipBuild = args.includes("--skip-build");
const deployBackend = !frontendOnly;
const deployFrontend = !backendOnly;

// ─── Helpers ───
function run(cmd) {
  console.log(`\n\x1b[36m> ${cmd}\x1b[0m\n`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT_DIR });
}

function runCapture(cmd) {
  console.log(`\n\x1b[36m> ${cmd}\x1b[0m\n`);
  return execSync(cmd, { encoding: "utf-8", cwd: ROOT_DIR }).trim();
}

function step(label) {
  console.log(`\n\x1b[33m════ ${label} ════\x1b[0m`);
}

// ─── Preflight checks ───
step("Preflight");
if (deployBackend && !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "\x1b[31mError: SUPABASE_SERVICE_ROLE_KEY env var is not set.\x1b[0m\n" +
      "Set it before running:\n" +
      '  $env:SUPABASE_SERVICE_ROLE_KEY = "your-key"\n' +
      "  node scripts/deploy.mjs"
  );
  process.exit(1);
}

// Ensure docker auth is configured
run(`gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet`);

// ─── Backend ───
let backendUrl = "";

if (deployBackend) {
  if (!skipBuild) {
    step("Build backend image");
    run(`docker build -t ${BACKEND_IMAGE} ./backend`);

    step("Push backend image");
    run(`docker push ${BACKEND_IMAGE}`);
  }

  step("Deploy backend to Cloud Run");
  const backendEnvVars = [
    `ASPNETCORE_ENVIRONMENT=Production`,
    `Supabase__Url=${SUPABASE_URL}`,
    `Supabase__ServiceRoleKey=${SUPABASE_SERVICE_ROLE_KEY}`,
    `Cors__AllowedOrigins=${FRONTEND_DOMAIN}`,
  ].join("||");
  run(
    `gcloud run deploy sancho-api` +
      ` --image=${BACKEND_IMAGE}` +
      ` --project=${PROJECT_ID}` +
      ` --region=${REGION}` +
      ` --platform=managed` +
      ` --allow-unauthenticated` +
      ` --port=8080` +
      ` --memory=256Mi` +
      ` --cpu=1` +
      ` --min-instances=0` +
      ` --max-instances=1` +
      ` --set-env-vars="^||^${backendEnvVars}"` +
      ` --quiet`
  );
}

// Build the new-format Cloud Run URL: https://{service}-{projectNumber}.{region}.run.app
step("Fetch backend URL");
const projectNumber = runCapture(
  `gcloud projects describe ${PROJECT_ID} --format=value(projectNumber)`
);
backendUrl = `https://sancho-api-${projectNumber}.${REGION}.run.app`;
console.log(`Backend URL: ${backendUrl}`);

// ─── Frontend ───
if (deployFrontend) {
  if (!skipBuild) {
    step("Build frontend image");
    run(
      `docker build` +
        ` --build-arg NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}` +
        ` --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}` +
        ` --build-arg NEXT_PUBLIC_API_URL=${backendUrl}` +
        ` -t ${FRONTEND_IMAGE}` +
        ` ./frontend`
    );

    step("Push frontend image");
    run(`docker push ${FRONTEND_IMAGE}`);
  }

  step("Deploy frontend to Cloud Run");
  run(
    `gcloud run deploy sancho-frontend` +
      ` --image=${FRONTEND_IMAGE}` +
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
}

// ─── Summary ───
step("Deploy complete");
console.log(`Frontend: ${FRONTEND_DOMAIN}`);
console.log(`Backend:  ${backendUrl}`);
