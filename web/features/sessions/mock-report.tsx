import type { MockReport as MockReportType } from "@/lib/sessions";

export function MockReport({ report }: { report: MockReportType }) {
  return (
    <section aria-labelledby="report-heading" className="mt-8 rounded-2xl border border-sky-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
        {report.transcription_available ? "Sample coaching · Transcript is real" : "Demo output · No recording analysis"}
      </p>
      <h2 id="report-heading" className="mt-3 text-2xl font-semibold text-slate-950">{report.title}</h2>
      <p className="mt-4 leading-7 text-slate-700">{report.summary}</p>
      <h3 className="mt-7 font-semibold text-slate-900">Practice ideas for your next session</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
        {report.practice_suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
      </ul>
      <p className="mt-6 text-sm text-slate-500">
        {report.transcription_available ? "Speech metrics and language feedback appear separately above when available. These presentation ideas remain general examples." : "Transcription and measured feedback will be added in later milestones."}
      </p>
    </section>
  );
}
