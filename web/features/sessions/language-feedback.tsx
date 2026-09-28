import type { LanguageAnalysis } from "@/lib/sessions";

function Time({ seconds }: { seconds: number }) {
  const minutes = Math.floor(seconds / 60);
  return <span>{minutes}:{Math.floor(seconds % 60).toString().padStart(2, "0")}</span>;
}

export function LanguageFeedback({ analysis }: { analysis: LanguageAnalysis }) {
  return (
    <section aria-labelledby="language-heading" className="mt-8 rounded-2xl border border-sky-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">AI feedback from your transcript</p>
      <h2 id="language-heading" className="mt-3 text-2xl font-semibold text-slate-950">English language coach</h2>
      <p className="mt-4 leading-7 text-slate-700">{analysis.summary}</p>
      {analysis.strengths.length > 0 && <div className="mt-6"><h3 className="font-semibold text-slate-900">What worked well</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">{analysis.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      {analysis.major_improvements.length > 0 && <div className="mt-6"><h3 className="font-semibold text-slate-900">Main opportunities</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">{analysis.major_improvements.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      {analysis.grammar_issues.length > 0 && <div className="mt-6"><h3 className="font-semibold text-slate-900">Grammar</h3><ul className="mt-3 space-y-4">{analysis.grammar_issues.map((issue, index) => <li key={`${issue.timestamp_start}-${index}`} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-medium text-slate-900"><Time seconds={issue.timestamp_start} /> · {issue.original} → {issue.suggestion}</p><p className="mt-1">{issue.explanation}</p></li>)}</ul></div>}
      {analysis.clarity_suggestions.length > 0 && <div className="mt-6"><h3 className="font-semibold text-slate-900">Clarity</h3><ul className="mt-3 space-y-4">{analysis.clarity_suggestions.map((item, index) => <li key={`${item.timestamp_start}-${index}`} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-medium text-slate-900"><Time seconds={item.timestamp_start} /> · {item.original} → {item.suggestion}</p><p className="mt-1">{item.explanation}</p></li>)}</ul></div>}
      {analysis.vocabulary_suggestions.length > 0 && <div className="mt-6"><h3 className="font-semibold text-slate-900">Vocabulary</h3><ul className="mt-3 space-y-4">{analysis.vocabulary_suggestions.map((item, index) => <li key={`${item.timestamp_start}-${index}`} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-medium text-slate-900"><Time seconds={item.timestamp_start} /> · {item.original} → {item.alternative}</p><p className="mt-1">{item.explanation}</p></li>)}</ul></div>}
      <p className="mt-6 rounded-xl bg-sky-50 p-4 text-sm text-sky-950"><span className="font-semibold">Next practice:</span> {analysis.practice_exercise}</p>
      <p className="mt-4 text-xs text-slate-500">Based on automatic transcription. Review the transcript before applying corrections.</p>
    </section>
  );
}
