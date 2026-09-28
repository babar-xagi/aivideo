# Background worker

The worker polls persisted PostgreSQL analysis jobs outside HTTP requests. It downloads private recordings to temporary storage, extracts audio with FFmpeg, transcribes English with faster-whisper, saves timestamped segments and words, calculates fluency metrics, optionally calls the language coach for validated grammar, clarity and vocabulary feedback, then writes clearly labeled sample presentation coaching suggestions. It renews leases during long jobs and can recover jobs after a crash. Run it from the repository root:

```bash
PYTHONPATH=.:backend uv run --project backend --env-file .env python -m worker.worker
```

The default `tiny.en` model downloads on first use into `.cache/models`. Add `OPENAI_API_KEY` to the ignored root `.env` and restart the worker to enable language feedback; `OPENAI_MODEL` defaults to `gpt-4o-mini`. Completed sessions from earlier milestones can be queued again to add new feedback from their saved transcripts. Missing configuration or invalid provider output does not fail the rest of the job.
