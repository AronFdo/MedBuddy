# MedBuddy Monorepo

MedBuddy is a dual-application workspace that pairs an Express backend with an Expo Router frontend to deliver medication tracking, appointment management, OCR-assisted data entry, and AI-powered chat guidance on top of a Supabase stack. This document explains how a new contributor can clone the repository, configure local development, and understand the moving pieces quickly.

## Project Snapshot

- Backend: Node 22+, Express, Supabase service-role access, OpenAI integrations, deployable to Google Cloud Run via Docker.
- Frontend: Expo Router (React Native 0.81), Supabase client, targeting iOS, Android, and web via Expo tooling.
- Database: Managed by Supabase (Postgres) with SQL definition files stored under the repo root.
- Key Services: OCR ingestion (`/api/ocr/*`), AI chat (`/api/ai-chat`), secure report delivery (`/api/serve-pdf/:id`).

## Getting Started Checklist

1. Clone the repo and open a terminal at the repo root `MedBuddy/`.
2. Install dependencies separately for backend and frontend (`npm install` in each directory).
3. Create the required `.env` files (see tables below) or export environment variables.
4. Start the backend (`npm run dev` in `backend/`) and hit `http://localhost:8080/health` to confirm.
5. Start the Expo app (`npm run start` in `frontend/`) and choose a simulator or Expo Go client.
6. Run smoke checks (frontend Jest tests, manual API health endpoint) before pushing changes.

## Repository Layout

```
MedBuddy/
├── backend/                 # Express API (Cloud Run ready)
│   ├── api/                 # Route handlers (AI chat, OCR, PDF serving)
│   ├── scripts/             # Helper scripts (version checks)
│   ├── Dockerfile           # Container entry point for Cloud Run
│   ├── cloudbuild.yaml      # GCP build definition
│   ├── render.yaml          # Render deployment sample
│   └── *.md / *.sh          # Deployment + env var docs
├── frontend/                # Expo Router application (React Native)
│   ├── app/                 # Screens and routing definitions
│   ├── components/          # Shared UI components
│   ├── lib/                 # Config, Supabase client, context providers
│   └── scripts/             # Utility scripts (reset project, etc.)
├── docs/                    # Reserved for additional documentation
├── *.sql                    # Supabase schema helpers and migration snippets
└── README.md                # You are here
```

## Backend (`backend/`)

### Features

- `index.js` bootstraps an Express server with CORS, JSON body limits, health checks, and robust error handling.
- `api/ai-chat.js` fetches medication, appointment, and conversation context from Supabase and calls OpenAI (GPT-4) for responses; results are persisted back to Supabase.
- `api/ocr.js` exposes medication OCR and manual-entry endpoints; uses OpenAI Vision (`gpt-4o`) and enforces ownership via Supabase JWT verification.
- `api/serve-pdf.js` validates user access, generates Supabase storage signed URLs, and streams protected PDF reports securely.
- `supabaseClient.js` centralizes Supabase client instantiation, auto-loading local `.env` variants during development.

### Environment Variables

Create `backend/.env` (never commit secrets). Minimum values are required for the service to start:

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xyz.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service-role key for server-side Supabase access (falls back to `SUPABASE_ANON_KEY` if present). |
| `OPENAI_API_KEY` | Yes for AI/OCR | Enables GPT-4 chat responses and OCR extraction. |
| `SUPABASE_JWT_SECRET` | Required for `/api/medications/manual` | Used to validate Supabase-issued JWTs. |
| `NODE_ENV` | Recommended | Controls dotenv loading and log verbosity (`development` by default). |
| `BODY_SIZE_LIMIT` | Optional | Override default `10mb` request body limit. |
| `PORT` | Optional | Defaults to `8080` (Cloud Run also sets this). |

> Cloud Run environment setup instructions live in `backend/SET_ENV_VARS.md`. Use `set-env-vars.sh` or the documented `gcloud` commands to keep Cloud Run revisions in sync.

### Dependency Setup

```bash
cd backend
npm install
```

- `npm run dev`: Start with `nodemon` for local iteration.
- `npm start`: Production-style start with Node.
- `npm run check-versions`: Ensures local Node/NPM meet the pinned `engines` field (Node >= 22, npm >= 10).

### API Smoke Tests

- `GET http://localhost:8080/health` should return `{ status: "OK" }`.
- `POST http://localhost:8080/api/ai-chat` expects body `{ user_id, profile_id, message }` and requires OpenAI credentials.
- `POST http://localhost:8080/api/ocr/medication` expects base64 image payload, user/profile IDs, and uses OpenAI Vision.
- `GET http://localhost:8080/api/serve-pdf/:recordId` must be called with `Authorization: Bearer <Supabase JWT>`.

### Deployment Notes

- Cloud Run: Build using `cloudbuild.yaml` or `Dockerfile`; follow `DEPLOY.md` and `SET_ENV_VARS.md` for environment management.
- Render: `render.yaml` contains a reference configuration if you prefer Render as an alternative.
- Pre-deployment: `pre-deploy-check.js` provides a placeholder for gating logic (run manually before pushing to production).

## Frontend (`frontend/`)

### Features

- Expo Router navigation with tabs (`app/(tabs)/*`), authentication flow (`app/Auth/*`), and dashboards for medications, appointments, chat, and profile management.
- Shared component library under `components/` (e.g., `Collapsible`, `NotificationSettings`, `ParallaxScrollView`).
- Supabase client in `lib/supabase.ts` and global profile context in `lib/ProfileContext.tsx`.
- Notifications, file uploads, and PDF viewing configured via Expo modules.

### Environment Variables

Create `frontend/.env` (Expo automatically loads `.env` entries prefixed with `EXPO_PUBLIC_`):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- `lib/config.ts` currently pins `BACKEND_URL` to the Cloud Run production endpoint (`https://medbuddy-backend-200167278829.asia-south1.run.app`). Update this file if you need the frontend to talk to a local backend during development.

### Dependency Setup

```bash
cd frontend
npm install
```

- `npm run start`: Launch Expo CLI. Pick your target (Android emulator, iOS simulator, web, or Expo Go).
- `npm run android` / `npm run ios` / `npm run web`: Platform-specific shorthands.
- `npm run lint`: Expo-flavored ESLint.
- `npm test`: Jest tests (configured via `jest.config.js`, `jest.setup.js`).
- `npm run reset-project`: Utility to reset the Expo project scaffold (use cautiously).

### Testing & QA

- Unit/UI tests use `@testing-library/react-native` and `jest-expo`. Add coverage for new components in `frontend/__tests__/` (create folder if needed).
- `TESTING.md` documents broader testing conventions; review before modifying test suites.
- `verify-tests.js` and `run-tests.js` provide scripted test runners; integrate them into CI as needed.

## Database & Supabase

- SQL files at the repo root (`Table_definitions.sql`, `add_appointments_columns.sql`, `link_prescriptions_to_appointments.sql`, etc.) capture schema changes and debugging queries. Apply them in Supabase SQL Editor or via `psql` migrations.
- Ensure Row Level Security (RLS) policies (`service_role_rls_policies.sql`) remain updated when altering access patterns.
- When adding new tables or columns, commit accompanying SQL scripts so other engineers can replay schema changes.

## AI & Third-Party Services

- OpenAI: Both AI chat and OCR rely on GPT endpoints (`gpt-4` and `gpt-4o`). Monitor usage and rate limits. Consider introducing timeouts and retries when extending functionality.
- Supabase Storage: `reports` bucket stores uploaded PDFs; signed URLs expire after one hour. Check bucket policies before tweaking access patterns.
- Notifications: Expo notification service uses credentials defined in Expo developer settings (not stored in repo). Configure via Expo dashboard.

## Development Workflow

- Branching: Prefer feature branches off `main`. Keep commits scoped and well-described.
- Linters/formatters: There is no enforced formatter; follow project conventions (TypeScript + ESLint in frontend; Standard JS style for backend).
- Secrets: Never commit `.env` files. Share via secure channels or Secret Manager.
- Commit hooks: None included. Consider adding Husky if you need local enforcement.

## Troubleshooting

- Missing Supabase vars: `frontend/lib/supabase.ts` logs explicit warnings when `EXPO_PUBLIC_SUPABASE_*` values are missing.
- Backend fails on start: Check console for missing env vars or port conflicts (`EADDRINUSE`). Use `BODY_SIZE_LIMIT` if OCR payloads exceed default limits.
- OCR errors: Confirm `OPENAI_API_KEY` scope includes vision models (GPT-4o); inspect backend logs for full stack traces.
- Signed URL failures: Ensure the `reports` bucket contains expected files and the stored `attachment_url` matches Supabase storage path conventions.

## Useful Commands

- `npm run dev` (backend) – Nodemon-powered API server with auto reload.
- `npm run start` (frontend) – Expo CLI with QR code for devices.
- `gcloud run services logs read medbuddy-backend --region asia-south1 --tail 50` – Tail Cloud Run logs.
- `npx expo-doctor` – Diagnose Expo project issues.

## Additional Documentation

- Backend deployment playbooks: `backend/DEPLOY.md`, `backend/SET_ENV_VARS.md`, and `backend/gcp-config.sh`.
- Node/npm upgrade guides: `NODE_UPGRADE_GUIDE.md`, `NPM_VERSION_GUIDE.md`.
- Database debugging aids: `debug_queries.sql`, `debug_user_profiles.sql`.
- Tests and QA: `frontend/TESTING.md`.

Keep this README up to date as new services, scripts, or environments are introduced. When adding new features, include setup notes, dependencies, and testing instructions so the next engineer can stay productive.


