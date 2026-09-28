You are a senior full-stack engineer, AI/ML engineer, product architect, and UX engineer.

Your task is to build the first production-quality MVP of an AI-powered English speaking coach web application.

The application allows a user to record themselves speaking English using their webcam and microphone. After recording, the application analyzes their speech, language usage, delivery, and presentation behavior, then provides clear and constructive feedback to help them improve their spoken English.

Do not over-engineer the first version. Build a clean architecture that can grow later into desktop and mobile applications.

# 1. Product Goal

Build a web application where a user can:

1. Open the website.
2. Start a speaking practice session.
3. Choose a speaking topic or enter their own topic.
4. Allow camera and microphone permissions.
5. Record themselves speaking for approximately 1–10 minutes.
6. Preview the recording.
7. Submit the recording for AI analysis.
8. See analysis progress.
9. Receive a detailed speaking report.
10. Review specific moments in the video where improvements are suggested.
11. Repeat the exercise and compare improvement between sessions.

The application should feel like a personal English-speaking coach, not an exam grading system.

Feedback must be supportive, specific, measurable, and actionable.

Never criticize the user's physical appearance, attractiveness, body shape, facial features, accent identity, or other personal characteristics.

Analyze communication behavior only.

Examples of appropriate feedback:

- speaking pace
- pauses
- filler words
- repeated words
- pronunciation clarity
- grammar
- vocabulary
- sentence structure
- fluency
- eye direction toward the camera
- head movement
- hand movement frequency
- posture consistency
- speaking confidence indicators based on measurable behavior

Avoid statements such as:

"You look bad."
"Your gestures are ugly."
"Your accent is bad."
"You don't look confident."

Prefer measurable feedback such as:

"You looked toward the camera during approximately 68% of the analyzed frames."

"You used 'like' 9 times."

"Your average speaking pace was approximately 118 words per minute."

"There were 5 pauses longer than 2 seconds."

# 2. Technology Stack

Use the following stack.

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui where useful

Backend:

- Python
- FastAPI
- Pydantic
- SQLAlchemy or another clean Python ORM

Database:

- PostgreSQL

Authentication:

- Supabase Auth

Object storage:

- Cloudflare R2 or another S3-compatible object storage provider

AI / media processing:

- Python
- FFmpeg
- faster-whisper for transcription
- MediaPipe for face, hand, and pose landmark analysis
- OpenCV where useful
- an LLM provider through a clean abstraction for grammar, vocabulary, clarity, and coaching feedback

Background jobs:

Start with a simple background-job abstraction.

The architecture should make it easy to later use:

- Redis
- Celery
- Dramatiq
- RQ

Do not introduce Rust, Zig, Kotlin, Electron, or native mobile code in this MVP.

# 3. High-Level Architecture

Use this architecture:

Browser
    |
    | HTTPS
    |
Next.js frontend
    |
    | REST API
    |
FastAPI backend
    |
    +---- PostgreSQL
    |
    +---- Object Storage
    |
    +---- Analysis Job Queue
             |
             v
       Python AI Worker
             |
             +---- FFmpeg
             +---- faster-whisper
             +---- MediaPipe
             +---- OpenCV
             +---- LLM
             |
             v
       Structured Analysis Report
             |
             v
         PostgreSQL
             |
             v
          Frontend

The frontend should never run the heavy AI models.

Heavy analysis happens on the Python worker/backend.

# 4. Monorepo Structure

Create a repository approximately like this:

english-coach/
|
├── web/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── recorder/
│   │   ├── sessions/
│   │   ├── reports/
│   │   └── dashboard/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   └── public/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   └── tests/
│
├── ai/
│   ├── speech/
│   ├── pronunciation/
│   ├── vision/
│   ├── language/
│   ├── scoring/
│   ├── pipeline/
│   └── tests/
│
├── worker/
│   ├── jobs/
│   └── worker.py
│
├── scripts/
│
├── docs/
│
├── docker/
│
├── .env.example
├── docker-compose.yml
├── README.md
└── Makefile

Keep AI logic separate from HTTP/API logic.

The AI pipeline must be usable independently from FastAPI.

For example:

python -m ai.pipeline.analyze sample.mp4

should eventually be able to generate a JSON analysis report.

# 5. MVP User Experience

Create these primary screens.

## Landing Page

Simple explanation:

"Practice English. Record yourself. Get AI feedback."

Primary actions:

- Start practicing
- Sign in

Explain key features:

- speaking analysis
- grammar feedback
- filler-word detection
- pronunciation feedback
- delivery analysis
- progress tracking

Do not make exaggerated claims about AI accuracy.

## Authentication

Support:

- sign up
- sign in
- sign out

Use Supabase Auth.

Keep authentication implementation cleanly separated.

## Dashboard

Show:

- Start Practice button
- Recent sessions
- practice streak if implemented later
- recent speaking pace
- recent filler-word count
- recent practice duration

Do not create unnecessary gamification in V1.

## New Practice Session

Allow the user to select a practice type.

Examples:

- Talk about your day
- Explain something you learned
- Tell a story
- Describe a picture
- Give a short presentation
- Job interview answer
- IELTS-style speaking practice
- Free speaking

Allow:

- generated topic
- custom topic

Show preparation timer optionally.

Then show:

Start Recording

## Recorder

The browser recorder should support:

- microphone
- webcam
- timer
- start
- pause if technically reliable
- stop
- recording indicator
- camera preview
- microphone level indicator if practical

Use browser APIs such as MediaRecorder where appropriate.

Handle permission denial gracefully.

Handle unsupported browsers gracefully.

Do not upload anything until the user confirms submission.

After recording:

- playback video
- restart recording
- submit for analysis

## Processing Screen

After submission show analysis stages such as:

Uploading recording

Transcribing speech

Analyzing fluency

Analyzing English

Analyzing presentation

Creating feedback

Do not fake progress percentages if they are not based on actual job state.

Use real pipeline states.

## Report Screen

This is the most important screen.

Organize results into sections.

# 6. Report Structure

## Overview

Show:

- recording duration
- total words
- words per minute
- filler words
- long pauses
- transcript confidence if available

Provide a short AI-generated summary.

Example:

"Your speech was generally clear and easy to follow. The biggest opportunities are reducing repeated filler words and using past-tense verbs more consistently."

Do not produce an arbitrary overall intelligence or personality score.

## Transcript

Show the full transcript with timestamps.

Each transcript segment should be clickable.

Clicking a segment should seek the video player to that moment.

Highlight:

- grammar suggestions
- filler words
- repeated phrases
- pronunciation issues where reliable

## Fluency Analysis

Calculate:

- total words
- words per minute
- average pause duration
- number of long pauses
- filler-word frequency
- repeated words
- self-corrections if detectable

Default filler-word list may include:

- um
- uh
- like
- you know
- actually
- basically
- literally
- I mean

Allow filler-word configuration later.

Do not assume every use of words such as "like" or "actually" is automatically a filler.

Use context when possible.

## Grammar Analysis

The LLM should identify meaningful spoken-English issues.

For each issue return structured data:

{
  "timestamp_start": 12.4,
  "timestamp_end": 15.8,
  "original": "Yesterday I go to school",
  "suggestion": "Yesterday I went to school",
  "explanation": "Because the event happened yesterday, use the past tense 'went'.",
  "category": "verb_tense",
  "severity": "medium"
}

Avoid correcting intentional informal spoken English unnecessarily.

Focus on mistakes that affect clarity or natural English usage.

## Vocabulary

Provide:

- repeated vocabulary
- possible alternative words
- useful phrases
- natural expressions

Do not encourage unnecessarily complex vocabulary.

Prefer clearer language over impressive-sounding language.

## Pronunciation

Design the module so pronunciation analysis can be added incrementally.

Initial version may use:

- Whisper confidence
- word timestamps
- acoustic signals
- optional pronunciation-specific model later

Do not claim exact pronunciation mistakes unless the model supports them reliably.

Store pronunciation issues using structured objects such as:

{
  "word": "comfortable",
  "timestamp": 34.1,
  "confidence": 0.64,
  "suggestion": "Practice this word slowly and compare it with a reference pronunciation."
}

Do not encourage users to erase their native accent.

The goal is understandable, clear speech.

## Delivery

Analyze measurable audio patterns:

- speaking speed
- silence
- volume consistency
- excessive volume variation
- speaking rhythm

Possible future features:

- pitch variation
- vocal energy
- monotone detection

Do not label personality or confidence based only on voice.

## Camera / Presentation Analysis

Use MediaPipe.

Analyze:

- face detection availability
- approximate head orientation
- approximate gaze/camera-facing direction
- hand landmark visibility
- hand movement frequency
- body pose movement

Generate metrics such as:

- camera-facing percentage
- excessive head movement events
- hand gesture frequency
- large body movement frequency

Do not analyze attractiveness.

Do not classify body type.

Do not judge facial features.

Do not infer personality, mental health, intelligence, gender, ethnicity, or emotional state.

Camera analysis should focus only on presentation behavior.

# 7. Video Timeline

Create a timeline under the video player.

Timeline markers can represent:

- grammar issue
- filler word
- long pause
- pronunciation issue
- presentation event

Example:

0:00 ------------------------------ 3:42
      G     F       P       G

G = grammar
F = filler
P = pronunciation

Clicking a marker seeks the video.

Use accessible labels rather than relying only on color.

# 8. AI Report JSON Schema

Create a strongly typed schema.

Example:

{
  "session_id": "uuid",
  "duration_seconds": 182.4,

  "speech": {
    "total_words": 341,
    "words_per_minute": 112.2,

    "filler_words": [
      {
        "word": "um",
        "count": 5,
        "timestamps": [4.2, 18.7, 44.2]
      }
    ],

    "pauses": [
      {
        "start": 12.1,
        "end": 14.9,
        "duration": 2.8
      }
    ]
  },

  "language": {
    "grammar_issues": [],
    "vocabulary_suggestions": [],
    "summary": ""
  },

  "pronunciation": {
    "issues": []
  },

  "presentation": {
    "camera_facing_percent": 71.4,
    "hand_movement_events": 14,
    "large_body_movement_events": 3
  },

  "transcript": [
    {
      "start": 0.0,
      "end": 4.6,
      "text": "Today I want to talk about..."
    }
  ],

  "recommendations": []
}

Use Pydantic models for this schema.

Create corresponding TypeScript types.

# 9. Database Design

Create tables approximately like:

users

profiles

practice_sessions

recordings

analysis_jobs

transcript_segments

analysis_reports

grammar_issues

pronunciation_issues

practice_topics

Suggested session fields:

id

user_id

topic

practice_type

status

created_at

started_at

completed_at

duration_seconds

recording_object_key

thumbnail_object_key

analysis_version

Job statuses:

created

uploading

queued

processing_audio

transcribing

processing_video

language_analysis

generating_report

completed

failed

Design statuses so retries are possible.

# 10. API Design

Create REST endpoints approximately like:

POST /api/sessions

GET /api/sessions

GET /api/sessions/{session_id}

DELETE /api/sessions/{session_id}

POST /api/sessions/{session_id}/upload-url

POST /api/sessions/{session_id}/complete-upload

POST /api/sessions/{session_id}/analyze

GET /api/sessions/{session_id}/status

GET /api/sessions/{session_id}/report

GET /api/sessions/{session_id}/transcript

Authentication should protect user resources.

A user must never be able to access another user's recording or report.

# 11. Upload Architecture

Do not proxy large video files unnecessarily through the Next.js server.

Preferred flow:

Browser

→ request signed upload URL

→ upload directly to R2/S3-compatible storage

→ tell FastAPI upload finished

→ FastAPI creates analysis job

→ worker processes recording

Use temporary signed URLs.

Object keys should use non-guessable identifiers.

Example:

users/{user_uuid}/sessions/{session_uuid}/recording.webm

# 12. Media Processing Pipeline

Implement the pipeline as independent stages.

Stage 1:

Validate video.

Stage 2:

Use FFmpeg to extract normalized audio.

Example output:

audio.wav

Stage 3:

Transcribe using faster-whisper.

Return:

- text
- word timestamps
- segment timestamps

Stage 4:

Calculate speech metrics.

Examples:

- WPM
- silence
- filler words
- repeated phrases

Stage 5:

Sample video frames.

Do not analyze every frame unnecessarily.

Example:

5–10 frames per second depending on computational cost.

Stage 6:

Run MediaPipe models.

Extract:

- face landmarks
- pose landmarks
- hand landmarks

Stage 7:

Aggregate landmarks into meaningful session-level metrics.

Do not store every raw landmark forever unless needed.

Stage 8:

Send transcript plus speech metrics to language-analysis service.

Stage 9:

Create structured report.

Stage 10:

Persist report.

Each stage should log errors and execution duration.

# 13. LLM Architecture

Create an interface such as:

class LanguageCoach:
    async def analyze(
        transcript,
        speech_metrics,
        practice_context
    ) -> LanguageAnalysis:
        ...

Do not tightly couple the application to one AI provider.

Create provider adapters.

For example:

OpenAILanguageCoach

MockLanguageCoach

LocalLanguageCoach

The LLM must return structured JSON validated with Pydantic.

Never directly trust raw LLM output.

Validate it.

Retry malformed responses carefully.

# 14. Prompting Rules for the English Coach

The coaching prompt should instruct the model to:

- preserve the user's intended meaning
- focus on spoken English
- distinguish grammar mistakes from natural informal speech
- explain corrections simply
- give examples
- prioritize the most important issues
- avoid overwhelming the learner
- avoid mocking language mistakes
- avoid trying to remove the user's accent
- prioritize intelligibility
- avoid unnecessary advanced vocabulary
- never judge intelligence from English ability

Generate approximately:

3 major improvements

3 strengths

a small set of grammar issues

useful vocabulary suggestions

one practice exercise for the next session

# 15. Privacy

Privacy is important because recordings contain:

- face video
- voice
- spoken content

Build the architecture with privacy in mind.

Include:

- explicit recording consent
- clear upload state
- delete recording function
- delete account data support architecture
- signed object URLs
- authorization checks
- private object storage
- no publicly exposed recording URLs

Never use uploaded recordings for training unless explicit consent exists.

Do not implement automatic training-data collection.

# 16. Security

Implement:

- authentication validation
- authorization on every resource
- file size limits
- video duration limits
- MIME validation
- safe object names
- rate limits where appropriate
- signed upload URLs
- server-side validation
- CORS configuration
- safe environment variable handling

Never expose:

- database credentials
- Supabase service key
- R2 secrets
- LLM API keys

to the browser.

# 17. Local Development

The application must be easy to run locally.

Provide:

docker-compose.yml

for:

- PostgreSQL
- Redis if introduced

Provide:

.env.example

Example variables:

DATABASE_URL=

SUPABASE_URL=

SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

R2_ACCOUNT_ID=

R2_ACCESS_KEY_ID=

R2_SECRET_ACCESS_KEY=

R2_BUCKET_NAME=

R2_ENDPOINT=

AI_PROVIDER=

AI_API_KEY=

REDIS_URL=

Create a README with exact setup instructions.

# 18. Development Mode Without Paid Services

The entire UI should be developable without spending money.

Create mock services.

For example:

STORAGE_PROVIDER=local

AI_PROVIDER=mock

TRANSCRIPTION_PROVIDER=mock

Allow a local recording to be stored under a local development folder.

Create a sample analysis JSON.

The report UI must work with this sample data.

This allows frontend development before GPU/AI infrastructure is ready.

# 19. Testing

Frontend:

- unit tests for utility logic
- recorder state tests where practical
- report rendering tests
- API client tests

Backend:

- API tests
- authorization tests
- schema validation tests
- session lifecycle tests

AI:

- filler-word tests
- WPM calculation tests
- pause-detection tests
- transcript parsing tests
- JSON schema tests

Critical test:

User A must never access User B's session.

# 20. Error Handling

Support cases such as:

microphone denied

camera denied

camera unavailable

microphone unavailable

browser does not support MediaRecorder

upload failure

network interruption

invalid recording

FFmpeg failure

transcription failure

AI provider failure

vision analysis failure

job timeout

Allow retry where appropriate.

If vision analysis fails, speech analysis should still complete.

If language analysis fails, transcript should still be available.

Design the pipeline to degrade gracefully.

# 21. Performance

Do not block web requests while running AI analysis.

All expensive processing must run asynchronously.

Avoid downloading large video files multiple times.

Cache intermediate outputs during one analysis job.

Delete temporary files after processing.

Use streaming or efficient file handling where practical.

# 22. UI Design

The product should look:

clean

modern

calm

professional

focused

Avoid making it look like a complicated analytics dashboard.

The recording screen should have very few distractions.

The report should visually emphasize:

"What should I improve next?"

instead of displaying dozens of meaningless scores.

Suggested report navigation:

Overview

Transcript

English

Fluency

Pronunciation

Presentation

Next Practice

# 23. Accessibility

Implement:

- keyboard navigation
- focus indicators
- proper labels
- semantic HTML
- accessible buttons
- accessible form controls
- captions/transcript support
- non-color indicators for timeline events

# 24. Responsive Design

The MVP is primarily a desktop/laptop web experience because users need webcam speaking practice.

Still make dashboard and reports responsive for tablets and phones.

Do not prioritize phone recording UX in V1.

# 25. MVP Scope

Build these features first:

AUTH

RECORD

UPLOAD

TRANSCRIBE

FILLER WORDS

WPM

PAUSES

GRAMMAR FEEDBACK

TRANSCRIPT

REPORT PAGE

SESSION HISTORY

Then add:

BASIC MEDIAPIPE ANALYSIS

Then:

PRONUNCIATION

Then:

ADVANCED BODY-LANGUAGE METRICS

Do not attempt every advanced AI feature in the first implementation.

# 26. Development Milestones

Work in milestones.

Do not jump ahead until the previous milestone builds and tests successfully.

## Milestone 1 — Foundation

Create monorepo.

Configure:

Next.js

FastAPI

PostgreSQL

environment variables

Docker development environment

Basic health endpoint.

Acceptance criteria:

Frontend runs.

Backend runs.

Database connects.

GET /health returns success.

## Milestone 2 — Authentication

Integrate Supabase.

Implement:

signup

signin

signout

protected dashboard

Backend verifies user identity.

Acceptance criteria:

Unauthenticated users cannot access dashboard.

Authenticated user can access dashboard.

## Milestone 3 — Practice Sessions

Create database models.

Create session APIs.

Dashboard shows session history.

Acceptance criteria:

User can create a session.

User only sees their own sessions.

## Milestone 4 — Recorder

Implement webcam/microphone recorder.

Acceptance criteria:

User can:

start

stop

preview

discard

record again

No upload yet.

## Milestone 5 — Storage

Create signed upload flow.

Acceptance criteria:

Recording uploads.

Session contains storage object identifier.

Recording remains private.

## Milestone 6 — Analysis Infrastructure

Create worker architecture.

Create job states.

Initially use mock AI.

Acceptance criteria:

User submits session.

Status progresses.

Mock report appears.

## Milestone 7 — Real Transcription

Add FFmpeg.

Add faster-whisper.

Acceptance criteria:

Recorded English speech produces timestamped transcript.

## Milestone 8 — Speech Metrics

Implement:

WPM

fillers

pauses

repetitions

Acceptance criteria:

Metrics are derived from transcript/timestamps.

Unit tests pass.

## Milestone 9 — Language Coach

Add LLM abstraction.

Analyze:

grammar

clarity

vocabulary

Return structured JSON.

Acceptance criteria:

Invalid LLM output cannot break report generation.

## Milestone 10 — Report UI

Build polished report.

Include:

video player

timeline

transcript

metrics

corrections

recommendations

Clicking timestamp jumps video.

## Milestone 11 — Vision

Add MediaPipe.

Analyze basic:

head orientation

camera-facing estimate

hands

body movement

Do not introduce personality judgments.

## Milestone 12 — Polish

Improve:

loading

errors

responsive behavior

accessibility

security

privacy controls

tests

documentation

# 27. Coding Standards

Use TypeScript strict mode.

Use Python type hints.

Use Pydantic models.

Prefer small functions.

Prefer explicit names.

Avoid giant components.

Avoid giant service classes.

Keep business logic independent from frameworks where practical.

Use consistent formatting.

Add linting.

Add tests for meaningful logic.

Do not generate thousands of lines before checking whether the application builds.

# 28. Agent Working Rules

You are an autonomous coding agent, but follow these rules.

Before changing code:

1. Inspect the existing project.
2. Understand the architecture.
3. Identify the current milestone.
4. Create a short implementation plan.

While working:

1. Make small coherent changes.
2. Run relevant tests.
3. Run type checks.
4. Run linting.
5. Fix errors before moving forward.

Do not:

- rewrite working architecture unnecessarily
- introduce random libraries
- change frameworks without a strong reason
- create fake implementations and call them complete
- hide errors
- disable TypeScript errors
- use `any` everywhere
- remove tests just to make CI pass
- hardcode secrets
- commit API keys
- claim AI capabilities that are not actually implemented

When an AI capability is not yet implemented, clearly mark it as unavailable or mocked.

# 29. Decision-Making Rule

When deciding between:

clever architecture

and

simple maintainable architecture

choose simple maintainable architecture.

When deciding between:

more features

and

finishing the existing feature properly

finish the existing feature properly.

When deciding between:

an unreliable AI metric

and

not showing the metric

do not show the unreliable metric.

# 30. First Task

Start with Milestone 1 only.

Do not attempt to build the entire product in one response.

Perform these steps:

1. Create the monorepo structure.
2. Initialize Next.js with TypeScript.
3. Initialize FastAPI.
4. Add PostgreSQL development configuration.
5. Add Docker Compose.
6. Add environment configuration.
7. Implement backend `/health`.
8. Create a simple frontend page that verifies backend connectivity.
9. Add README setup instructions.
10. Run the application and fix build/type errors.
11. Report:

- files created
- commands used
- architecture decisions
- test/build status
- next milestone

The final result of Milestone 1 must be a runnable development environment.

Do not proceed to Milestone 2 until Milestone 1 is working.
