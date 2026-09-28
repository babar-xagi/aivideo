# Background worker

The worker polls persisted PostgreSQL analysis jobs outside HTTP requests. It downloads private recordings to temporary storage, extracts audio with FFmpeg, transcribes English with faster-whisper, saves timestamped segments and words, calculates fluency metrics, then writes clearly labeled sample English and presentation coaching suggestions. It renews leases during long jobs and can recover jobs after a crash. Run it from the repository root:

```bash
PYTHONPATH=.:backend uv run --project backend --env-file .env python -m worker.worker
```

The default `tiny.en` model downloads on first use into `.cache/models`. Completed sessions from earlier milestones can be queued again to add the new fluency measures.
