# English Coach

An AI-powered English speaking coach. This repository implements **Milestones 1–11** from [project.md](project.md): foundation, authentication, practice sessions, browser recording, private signed uploads, a persistent analysis worker, timestamped English transcription, measured fluency, structured language coaching, an interactive report, and basic MediaPipe video measurements. Presentation coaching suggestions are still sample output.

## Structure

- `web/` — Next.js App Router frontend with TypeScript and Tailwind CSS
- `backend/` — FastAPI, PostgreSQL models and migrations, Supabase token verification, and the analysis job queue
- `worker/` — separate process that advances persisted analysis jobs
- `ai/` — independent FFmpeg/faster-whisper transcription, deterministic speech metrics, an LLM language coach interface and OpenAI adapter, and a mock presentation coaching generator
- `supabase/` — local Supabase Auth configuration
- `docker-compose.yml` — application PostgreSQL and private S3-compatible storage for local development

The frontend protects `/dashboard` and `/sessions` with a verified Supabase session. It sends the access token from its server to FastAPI, which independently verifies it with Supabase Auth. Every session query is scoped to the verified user ID. The browser never receives the application database credentials or a Supabase secret key.

## Prerequisites

Run commands in Ubuntu WSL from `/mnt/d/aivideo`. You need Bun 1.4+, uv 0.12+, Docker with Compose, and internet access for initial downloads. `uv` installs the requested Python 3.12 interpreter when needed. Use `uv --version` to check uv itself. The `imageio-ffmpeg` dependency provides the FFmpeg binary, so a separate system FFmpeg installation is not required.

MediaPipe also needs the Ubuntu `libgles2` runtime (`sudo apt install libgles2`). The worker reports video analysis as unavailable if this library or the model bundles are missing; speech analysis still completes.

## Local setup without a cloud account

Start the application database, private object storage, and a minimal local Supabase Auth stack:

```bash
cd /mnt/d/aivideo
cp .env.example .env
python3 scripts/configure_local_storage.py
docker compose up -d db storage
bunx supabase@2.118.0 start -x realtime,storage-api,imgproxy,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
python3 scripts/configure_local_supabase.py
python3 scripts/download_vision_models.py
```

The storage setup script writes SeaweedFS credentials from the ignored `.env` into ignored `storage/s3.json`. The Supabase setup script writes the local Supabase URL and **publishable key only** to the ignored `.env` and `web/.env.local` files. The vision setup downloads Google's face, hand, and pose task models into ignored `.cache/models/vision`. Local sign-up does not require email confirmation. The application database uses host port `5433`, leaving `5432` available for an existing PostgreSQL service.

In a second WSL terminal, start FastAPI:

```bash
cd /mnt/d/aivideo/backend
uv sync
uv run --env-file ../.env alembic upgrade head
uv run --env-file ../.env python ../scripts/init_storage.py
uv run --env-file ../.env uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

In a third WSL terminal, start Next.js:

```bash
cd /mnt/d/aivideo/web
bun install
bun run dev
```

In a fourth WSL terminal, start the analysis worker:

```bash
cd /mnt/d/aivideo
PYTHONPATH=.:backend uv run --project backend --env-file .env python -m worker.worker
```

Open <http://localhost:3000>, create an account at `/auth/sign-up`, and verify the dashboard shows **Identity verified by the API**. Choose **Start practice**, select a style, enter a topic, and create a session. Record and preview a clip, then choose **Save recording**. The browser uploads directly to the private object store using a five-minute signed URL. The API verifies the stored file before marking the session uploaded. Then choose **Transcribe recording**. The worker downloads the private object to a temporary directory, extracts audio with FFmpeg, transcribes English speech with faster-whisper, and saves timestamped segments and words. It calculates speaking pace, pauses, hesitation words, and immediate repetitions. With an OpenAI key configured, it also sends transcript text, timestamps, topic, and speech metrics to the language coach for structured grammar, clarity, and vocabulary feedback. The audio and video are not sent to that provider. The worker removes its temporary files when finished. The page refreshes while the worker runs. The completed report places the video above a timeline of measured hesitations, long pauses, repetitions, and available language suggestions. Timeline markers, transcript rows, and correction timestamps jump to the corresponding video moment. The report also shows the metrics and next-practice advice; presentation suggestions remain labeled sample guidance. Existing completed sessions can use **Measure saved recording** or **Analyze saved transcript** to add newer results. If the worker is stopped, the job remains queued and resumes when it starts. Sign out, then revisit `/dashboard` or `/sessions/new`: they should redirect to sign-in. `GET http://localhost:8000/health` returns `{"status":"ok","database":"connected"}` while the database is healthy.

The worker uses `tiny.en` on CPU with 8-bit computation by default. Its model downloads on first use to the ignored `.cache/models` directory; this may take a few minutes. Set `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE`, `WHISPER_CPU_THREADS`, or `WHISPER_MODEL_CACHE` in the root `.env` to change it, then restart the worker. A larger model may improve recognition but needs more memory and processing time. Transcription may still make mistakes, especially with noise, overlapping voices, or unclear audio.

For live language feedback, add `OPENAI_API_KEY` to the ignored root `.env` and restart the worker. `OPENAI_MODEL` defaults to `gpt-4o-mini`, which supports structured outputs. The worker sends only transcript text, segment timestamps, topic, practice type, and speech metrics to the OpenAI Responses API with `store: false`; the key never goes to the browser. Provider failures, refusals, or invalid output leave the transcript, metrics, and sample presentation report available, with language feedback marked unavailable. Without a key, this panel shows that language coaching is not configured. Adding a key later lets you retry saved sessions from their existing transcript. Language suggestions may still be mistaken, especially when transcription is wrong.

Session APIs require a valid Supabase bearer token: `POST /api/sessions`, `GET /api/sessions`, `GET /api/sessions/{id}`, `DELETE /api/sessions/{id}`, `POST /api/sessions/{id}/upload-url`, `POST /api/sessions/{id}/complete-upload`, `GET /api/sessions/{id}/recording-url`, `POST /api/sessions/{id}/analysis`, and `GET /api/sessions/{id}/analysis`. Every operation is scoped to the owner. Uploads accept WebM or MP4 up to 500 MB and a reported duration up to 10 minutes. Deleting a session also deletes its stored recording and job. Run `uv run --env-file ../.env alembic upgrade head` after future database updates.

To stop local services later, run `bunx supabase@2.118.0 stop` and `docker compose down` from the repository root. The application PostgreSQL volume is retained.

MediaPipe samples up to 120 frames at five-second intervals and reports a rough head orientation, camera-facing proxy, hand visibility, and torso position changes. These estimates depend on framing and lighting; they do not measure eye contact, confidence, or personality. Only aggregate measurements are saved, not landmark coordinates or extracted frames. Earlier completed sessions can use **Measure saved video** to add vision results.

## Use a hosted Supabase project later

Set the following in the ignored root `.env`:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Set the same project in the ignored `web/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Configure the hosted project's Site URL for the web app. If email confirmation is enabled, set the confirmation email template link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` so the server can exchange the token hash for a session. Restart both servers after changing environment files. Never put a Supabase secret or service-role key in `web/.env.local`.

For hosted S3-compatible storage such as Cloudflare R2, set `S3_ENDPOINT_URL`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` in the ignored root `.env`. For R2, the region is `auto` and the endpoint is the account's S3 API endpoint. Configure bucket CORS to allow the web app's origin, `PUT` with `Content-Type`, and `GET` for playback. Keep the bucket private. These storage credentials belong on FastAPI only, never in `web/.env.local`. Local development uses SeaweedFS with development-only credentials in `storage/s3.json`; replace them for any deployment.

## Checks

```bash
cd /mnt/d/aivideo/backend
uv run pytest tests ../ai/tests
uv run ruff check .
uv run ruff format --check .
PYTHONPATH=. uv run --env-file ../.env python ../scripts/check_storage.py
PYTHONPATH=. uv run --env-file ../.env python ../scripts/check_upload_flow.py

# One-time public English test fixture (stored only in ignored local_data/):
cd /mnt/d/aivideo
mkdir -p local_data
curl -fL https://raw.githubusercontent.com/openai/whisper/main/tests/jfk.flac -o local_data/jfk.flac
cd backend
PYTHONPATH=.:.. uv run --env-file ../.env python ../scripts/check_transcription.py
PYTHONPATH=.:.. uv run --env-file ../.env python ../scripts/check_analysis_flow.py

cd /mnt/d/aivideo/web
bun run test
bun run lint
bunx tsc --noEmit
bun run build
```

The backend tests cover tokens, session validation, owner isolation, signed upload completion, job stages, retry, transcript, metric and language feedback persistence, fallback output, and deletion. AI tests cover invalid media, timestamp mapping, deterministic fluency calculations, valid structured language output, and malformed or ungrounded provider responses. Frontend tests cover recording, private upload, report rendering, event mapping, and seeking from the timeline, transcript, and corrections. The storage checks exercise the real local S3 service, CORS, unsigned read denial, PostgreSQL session lifecycle, and deletion. The transcription checks use [OpenAI Whisper's JFK test clip](https://github.com/openai/whisper/blob/main/tests/jfk.flac) to verify real English speech and word timestamps, including the full private upload and worker path. The full worker check requires the worker to be running.

## Configuration

| Variable | Used by | Purpose |
| --- | --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Docker Compose | Application database credentials |
| `POSTGRES_PORT` | Docker Compose | Local host port, default `5433` |
| `DATABASE_URL` | FastAPI | Application database connection |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | FastAPI | Verify user access tokens |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Next.js | Supabase Auth client |
| `BACKEND_URL` | Next.js server | Optional FastAPI address override |
| `S3_ENDPOINT_URL`, `S3_REGION`, `S3_BUCKET` | FastAPI | Private S3-compatible object store |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | FastAPI | Server-side storage credentials |
| `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE`, `WHISPER_CPU_THREADS` | Worker | Speech model and inference settings |
| `WHISPER_MODEL_CACHE` | Worker | Optional model cache path; defaults to ignored `.cache/models` |
| `OPENAI_API_KEY` | Worker | Optional server-side key for live language coaching |
| `OPENAI_MODEL` | Worker | Structured-output model; defaults to `gpt-4o-mini` |

If you change `POSTGRES_PORT`, update the port in `DATABASE_URL` too. Changing the database password after its volume has been initialized requires updating or recreating that volume.

## Next milestone

Milestone 12 improves loading, errors, responsive behavior, accessibility, security, privacy controls, tests, and documentation.
