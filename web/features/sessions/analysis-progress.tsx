"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisStatus } from "@/lib/sessions";

const stages: Array<{ status: AnalysisStatus; label: string }> = [
  { status: "queued", label: "Waiting for the worker" },
  { status: "transcribing", label: "Transcribing your recording" },
  { status: "analyzing_fluency", label: "Measuring speaking pace, pauses, and fillers" },
  { status: "analyzing_english", label: "Checking grammar, clarity, and vocabulary" },
  { status: "analyzing_vision", label: "Measuring visible head, hand, and body movement" },
  { status: "analyzing_presentation", label: "Preparing sample presentation stage" },
  { status: "creating_feedback", label: "Creating sample report" },
];

export function AnalysisProgress({ status }: { status: AnalysisStatus }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 1500);
    return () => window.clearInterval(timer);
  }, [router]);
  const currentIndex = stages.findIndex((stage) => stage.status === status);

  return (
    <section aria-labelledby="analysis-heading" className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <h2 id="analysis-heading" className="text-xl font-semibold text-slate-900">Transcribing and preparing your report</h2>
      <p className="mt-2 text-sm text-slate-600">Speech and visible movement measures come from your recording. Language feedback appears when the coach is configured; presentation coaching is still sample guidance.</p>
      <ol className="mt-6 space-y-3" aria-live="polite">
        {stages.map((stage, index) => (
          <li key={stage.status} className={`flex items-center gap-3 text-sm ${index === currentIndex ? "font-semibold text-sky-900" : "text-slate-600"}`}>
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${index < currentIndex ? "bg-emerald-600" : index === currentIndex ? "bg-sky-700" : "bg-slate-300"}`} />
            {stage.label}{index === currentIndex ? " — in progress" : index < currentIndex ? " — complete" : ""}
          </li>
        ))}
      </ol>
    </section>
  );
}
