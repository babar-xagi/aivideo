"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RecorderPhase = "idle" | "requesting" | "recording" | "stopping" | "ready";

const MAX_SECONDS = 10 * 60;
const MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

function formatTime(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function captureErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Camera or microphone access was denied. Allow both in your browser settings, then try again.";
    }
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "A camera or microphone was not found. Connect both devices, then try again.";
    }
    if (error.name === "NotReadableError") {
      return "The camera or microphone is in use by another app. Close it and try again.";
    }
  }
  return "Recording could not start. Check your camera and microphone, then try again.";
}

function stopTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function Recorder({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const requestIdRef = useRef(0);
  const failedRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      stopTracks(streamRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function clearPreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    recordedBlobRef.current = null;
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setElapsedSeconds(Math.min(MAX_SECONDS, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    setPhase("stopping");
    recorder.stop();
  }

  async function startRecording() {
    if (phase === "requesting" || phase === "recording" || phase === "stopping" || uploading || uploaded) return;
    clearPreview();
    setElapsedSeconds(0);
    setError(null);
    setNotice(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser cannot record camera and microphone video. Use a current browser on localhost or HTTPS.");
      return;
    }

    const requestId = ++requestIdRef.current;
    setPhase("requesting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (captureError) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setError(captureErrorMessage(captureError));
        setPhase("idle");
      }
      return;
    }

    if (!mountedRef.current || requestId !== requestIdRef.current) {
      stopTracks(stream);
      return;
    }

    try {
      const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      failedRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        failedRef.current = true;
        if (mountedRef.current) setError("Recording was interrupted. Please try again.");
        if (recorder.state !== "inactive") stopRecording();
      };
      recorder.onstop = () => {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        stopTracks(stream);
        streamRef.current = null;
        recorderRef.current = null;
        if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
        if (!mountedRef.current) return;
        if (failedRef.current) {
          chunksRef.current = [];
          setPhase("idle");
          return;
        }
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || chunksRef.current[0]?.type || "video/webm",
        });
        chunksRef.current = [];
        if (blob.size === 0) {
          setError("No video was captured. Check your devices and try again.");
          setPhase("idle");
          return;
        }
        const url = URL.createObjectURL(blob);
        recordedBlobRef.current = blob;
        previewUrlRef.current = url;
        setPreviewUrl(url);
        setPhase("ready");
      };

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        void liveVideoRef.current.play().catch(() => {
          // The muted preview can still start when the browser permits playback.
        });
      }
      stream.getTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (recorder.state !== "inactive" && mountedRef.current) {
            setNotice("A camera or microphone disconnected, so recording stopped.");
            stopRecording();
          }
        });
      });

      recorder.start(1000);
      startedAtRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsedSeconds(Math.min(seconds, MAX_SECONDS));
        if (seconds >= MAX_SECONDS) {
          setNotice("The 10-minute recording limit was reached.");
          stopRecording();
        }
      }, 250);
      setPhase("recording");
    } catch (recordingError) {
      stopTracks(stream);
      streamRef.current = null;
      recorderRef.current = null;
      if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
      setError(captureErrorMessage(recordingError));
      setPhase("idle");
    }
  }

  function discardRecording() {
    if (uploading) return;
    clearPreview();
    setElapsedSeconds(0);
    setError(null);
    setNotice(null);
    setPhase("idle");
  }

  function cancelPermissionRequest() {
    requestIdRef.current += 1;
    setPhase("idle");
    setNotice("Camera and microphone request cancelled.");
  }

  async function saveRecording() {
    const blob = recordedBlobRef.current;
    if (!blob || uploading || uploaded) return;
    if (blob.size > 500 * 1024 * 1024) {
      setError("This recording is larger than 500 MB. Please record a shorter clip.");
      return;
    }
    const contentType = blob.type.split(";", 1)[0];
    if (contentType !== "video/webm" && contentType !== "video/mp4") {
      setError("This recording format cannot be uploaded. Try a different browser.");
      return;
    }

    setUploading(true);
    setError(null);
    setNotice("Uploading your recording. Keep this page open until it finishes.");
    try {
      const signedResponse = await fetch(`/sessions/${sessionId}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: contentType,
          size_bytes: blob.size,
          duration_seconds: Math.max(1, elapsedSeconds),
        }),
      });
      if (!signedResponse.ok) throw new Error("Could not prepare the upload.");
      const signed = (await signedResponse.json()) as {
        upload_url: string;
        headers: Record<string, string>;
      };
      const uploadResponse = await fetch(signed.upload_url, {
        method: "PUT",
        headers: signed.headers,
        body: blob,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!uploadResponse.ok) throw new Error("The recording upload failed.");
      const completeResponse = await fetch(`/sessions/${sessionId}/complete-upload`, {
        method: "POST",
      });
      if (!completeResponse.ok) throw new Error("The upload could not be verified.");
      recordedBlobRef.current = null;
      setUploaded(true);
      setNotice("Recording saved privately to your session.");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? `${uploadError.message} Try saving again.` : "Upload failed. Try saving again.");
      setNotice(null);
    } finally {
      setUploading(false);
    }
  }

  const live = phase === "recording" || phase === "stopping";

  return (
    <section aria-labelledby="recorder-heading" className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 pb-5 sm:p-7">
        <div>
          <h2 id="recorder-heading" className="text-xl font-semibold text-slate-900">Record your practice</h2>
          <p className="mt-2 text-sm text-slate-600">Speak naturally for up to 10 minutes. You can preview and try again.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
          <span role="status" aria-live="polite" className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${phase === "recording" ? "motion-safe:animate-pulse bg-rose-600" : "bg-slate-400"}`} aria-hidden="true" />
            {phase === "recording" ? "Recording" : phase === "requesting" ? "Waiting for permission" : phase === "stopping" ? "Finishing" : phase === "ready" ? "Ready to preview" : "Ready"}
          </span>
          {live && <time aria-label={`Elapsed time ${formatTime(elapsedSeconds)}`} className="tabular-nums">· {formatTime(elapsedSeconds)}</time>}
        </div>
      </div>

      <div className="relative mx-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-center text-slate-300 sm:mx-7">
        <video ref={liveVideoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${live ? "block" : "hidden"}`} aria-label="Live camera preview" />
        {phase === "ready" && previewUrl ? (
          <video key={previewUrl} src={previewUrl} controls playsInline preload="metadata" className="h-full w-full object-contain" aria-label="Recorded practice preview" />
        ) : !live ? (
          <p className="max-w-sm px-6 text-sm leading-6">
            {phase === "requesting" ? "Allow camera and microphone access in your browser to begin." : "Your camera preview will appear here when you start recording."}
          </p>
        ) : null}
      </div>

      <div className="p-4 sm:p-7">
        {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</p>}
        {notice && <p role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{notice}</p>}
        <div className="flex flex-wrap items-center gap-3">
          {phase === "idle" && (
            <button type="button" onClick={() => void startRecording()} className="rounded-xl bg-sky-800 px-6 py-3 font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">
              Start recording
            </button>
          )}
          {phase === "requesting" && (
            <button type="button" onClick={cancelPermissionRequest} className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">
              Cancel
            </button>
          )}
          {phase === "recording" && (
            <button type="button" onClick={stopRecording} className="rounded-xl bg-rose-700 px-6 py-3 font-semibold text-white hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">
              Stop recording
            </button>
          )}
          {phase === "ready" && (
            <>
              <button type="button" disabled={uploading || uploaded} onClick={() => void startRecording()} className="rounded-xl bg-sky-800 px-6 py-3 font-semibold text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">
                Record again
              </button>
              <button type="button" disabled={uploading || uploaded} onClick={discardRecording} className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">
                Discard recording
              </button>
              <button type="button" disabled={uploading || uploaded} onClick={() => void saveRecording()} className="rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                {uploading ? "Uploading…" : uploaded ? "Saved" : "Save recording"}
              </button>
            </>
          )}
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-500">
          Your preview stays in this browser tab until you choose Save recording. Leaving before it finishes discards the unsaved clip.
        </p>
      </div>
    </section>
  );
}
