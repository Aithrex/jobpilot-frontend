import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import type { QDifficulty, MockEvaluation } from "@/types/resume";
import { DifficultyBadge, Spinner } from "./PracticeCards";
import { asStrArray, sanitize } from "./prepUtils";
import type { NormalizedPrep } from "./prepUtils";

// The model sometimes returns evaluation list fields as JSON-encoded strings
// or single strings. Normalise defensively so the render never crashes.
function normalizeEvaluation(raw: any): MockEvaluation {
  const scoreRaw = raw?.score;
  let score = 0;
  if (typeof scoreRaw === "number") score = Math.round(scoreRaw);
  else if (typeof scoreRaw === "string") {
    const m = scoreRaw.match(/\d+/);
    score = m ? Math.min(100, parseInt(m[0], 10)) : 0;
  }
  return {
    score: Math.max(0, Math.min(100, score)),
    verdict: raw?.verdict ? sanitize(String(raw.verdict)) : "",
    strengths: asStrArray(raw?.strengths),
    improvements: asStrArray(raw?.improvements),
    missing_points: asStrArray(raw?.missing_points),
    model_answer: raw?.model_answer ? sanitize(String(raw.model_answer)) : "",
  };
}

type Category =
  | "behavioral" | "technical" | "company"
  | "coding" | "system_design" | "case_study" | "data_challenge" | "mixed";

const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: "mixed",          label: "Mixed",        icon: "🎲" },
  { key: "behavioral",     label: "Behavioral",   icon: "🧠" },
  { key: "technical",      label: "Technical",    icon: "⚙" },
  { key: "coding",         label: "Coding",       icon: "💻" },
  { key: "system_design",  label: "System design", icon: "🏗" },
  { key: "case_study",     label: "Case study",   icon: "📊" },
  { key: "data_challenge", label: "Data",         icon: "🔢" },
  { key: "company",        label: "Company",      icon: "🏢" },
];

const DIFFICULTIES: { key: QDifficulty | "mixed"; label: string }[] = [
  { key: "mixed",  label: "Mixed" },
  { key: "easy",   label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard",   label: "Hard" },
];

// Convert any question-like object into plain text for display + eval
interface CurrentQ {
  text: string;
  kind: Category;
  difficulty?: QDifficulty;
  meta?: any;
}

export default function MockInterview({
  recordId, prep,
}: {
  recordId: string;
  prep: NormalizedPrep | null;
}) {
  const [cat, setCat] = useState<Category>("mixed");
  const [diff, setDiff] = useState<QDifficulty | "mixed">("mixed");
  const [current, setCurrent] = useState<CurrentQ | null>(null);
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [evaluation, setEvaluation] = useState<MockEvaluation | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [history, setHistory] = useState<{ q: string; score: number; cat: Category }[]>([]);

  // Derive banks from the existing prep for cheap (free) questions
  const banks = useMemo(() => {
    if (!prep) return null;
    return {
      behavioral: prep.behavioral,
      technical: prep.technical,
      company: prep.company,
      coding: prep.coding,
      system_design: prep.systemDesign,
      case_study: prep.cases,
      data_challenge: prep.data,
    } as Record<string, any[]>;
  }, [prep]);

  // Timer
  useEffect(() => {
    if (!timerActive) return;
    const t = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [timerActive]);

  const avgScore = useMemo(() => {
    if (history.length === 0) return null;
    return Math.round(history.reduce((a, b) => a + b.score, 0) / history.length);
  }, [history]);

  const pickFromBank = (chosenCat: Category, chosenDiff: QDifficulty | "mixed"): CurrentQ | null => {
    if (!banks) return null;
    const tryCat = (c: Category): CurrentQ | null => {
      const items = banks[c] || [];
      const pool = items.filter((it: any) => {
        const title = it.question || it.title;
        if (!title) return false;
        if (chosenDiff !== "mixed" && it.difficulty && it.difficulty !== chosenDiff) return false;
        return !seen.includes(title);
      });
      if (pool.length === 0) return null;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const text = (pick.question || `${pick.title || ""}\n\n${pick.problem_statement || pick.scenario || pick.scope || ""}`).trim();
      return { text, kind: c, difficulty: pick.difficulty, meta: pick };
    };
    if (chosenCat === "mixed") {
      const pool: Category[] = ["behavioral", "technical", "company", "coding", "system_design", "case_study", "data_challenge"];
      const shuffled = pool.sort(() => Math.random() - 0.5);
      for (const c of shuffled) {
        const q = tryCat(c);
        if (q) return q;
      }
      return null;
    }
    return tryCat(chosenCat);
  };

  const fetchFresh = async (chosenCat: Category, chosenDiff: QDifficulty | "mixed"): Promise<CurrentQ | null> => {
    const category = chosenCat === "mixed" ? "behavioral" : chosenCat;
    const difficulty = (chosenDiff === "mixed" ? "medium" : chosenDiff) as QDifficulty;
    const r = await apiService.getPracticeQuestion(recordId, {
      category: category as any,
      difficulty,
      seen_titles: seen.slice(0, 20),
    });
    if (r.error || !r.data) return null;

    // The model returns one of several shapes depending on category. Accept all:
    //  1. {category, difficulty, question: {...}} - the preferred wrap
    //  2. {category, difficulty, ...fields} - fields at top level
    //  3. {...fields} directly - no metadata wrap
    const raw: any = r.data;
    let q: any = raw.question;
    if (!q || typeof q !== "object") {
      // Strip metadata and use the remaining fields as the question object
      const { category: _c, difficulty: _d, ...rest } = raw as any;
      q = rest;
    }
    // Unwrap if the model double-wrapped (e.g. {question: {question: "..."}})
    if (q && typeof q === "object" && typeof q.question === "object") {
      q = q.question;
    }
    if (!q || (typeof q !== "object")) return null;

    // Build the display text - works for every category shape
    let text = "";
    if (typeof q.question === "string") {
      text = q.question;
    } else {
      const title = q.title ? `${q.title}\n\n` : "";
      const body = q.problem_statement || q.scenario || q.scope || q.deliverable || "";
      text = `${title}${body}`.trim();
    }
    if (!text) return null;

    return { text, kind: category as Category, difficulty, meta: q };
  };

  const nextQuestion = async () => {
    setEvaluation(null); setAnswer(""); setTimerSeconds(0); setTimerActive(false);
    setGenerating(true);
    let q = pickFromBank(cat, diff);
    if (!q) q = await fetchFresh(cat, diff);
    setGenerating(false);
    if (!q) { toast.error("Couldn't get a question. Try another category."); return; }
    setCurrent(q);
    setSeen(prev => [...prev, (q!.meta.question || q!.meta.title || q!.text).slice(0, 200)]);
    setTimerActive(true);
  };

  const submit = async () => {
    if (!current || !answer.trim()) return;
    setEvaluating(true); setTimerActive(false);
    const r = await apiService.evaluateMockAnswer(recordId, {
      question: current.text,
      user_answer: answer,
      category: current.kind,
    });
    setEvaluating(false);
    if (r.error || !r.data?.evaluation) {
      toast.error("Evaluation failed", { description: r.error });
      return;
    }
    const evalNorm = normalizeEvaluation(r.data.evaluation);
    setEvaluation(evalNorm);
    setHistory(prev => [{ q: current.text.slice(0, 80), score: evalNorm.score, cat: current.kind }, ...prev].slice(0, 20));
  };

  // Meaning-coded on semantic tokens: strong=success, okay=warning, weak=destructive.
  const scoreColor = (s: number) =>
    s >= 80 ? "text-success" : s >= 60 ? "text-warning" : "text-destructive";

  const mmss = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      {/* Header setup bar */}
      <div className="rounded-xl border border-border bg-card/60 shadow-soft p-3 space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all ${
                  cat === c.key
                    ? "bg-primary text-primary-foreground border-transparent shadow-soft"
                    : "bg-card/80 text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                <span>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Difficulty</span>
          <div className="inline-flex rounded-md bg-muted p-0.5 border border-border">
            {DIFFICULTIES.map(d => (
              <button
                key={d.key}
                onClick={() => setDiff(d.key)}
                className={`px-3 py-1.5 text-[13px] font-medium rounded capitalize ${
                  diff === d.key ? "bg-background text-foreground shadow-soft" : "text-muted-foreground"
                }`}
              >{d.label}</button>
            ))}
          </div>
          <div className="flex-1" />
          {history.length > 0 && (
            <span className="text-sm text-muted-foreground">
              <b>{history.length}</b> answered · avg{" "}
              <span className={`font-bold tabular-nums ${avgScore !== null ? scoreColor(avgScore) : ""}`}>{avgScore ?? " - "}</span>
            </span>
          )}
          <button
            onClick={nextQuestion}
            disabled={generating || evaluating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 shadow-soft"
          >
            {generating ? <Spinner /> : <span>▶</span>} {current ? "Next question" : "Start mock"}
          </button>
        </div>
      </div>

      {/* Question card */}
      {current && (
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card shadow-soft p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Q</span>
            <DifficultyBadge d={current.difficulty} />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{current.kind.replace("_", " ")}</span>
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground tabular-nums">
              ⏱ <b className={timerSeconds > 120 ? "text-warning" : ""}>{mmss(timerSeconds)}</b>
            </span>
            <button
              onClick={() => setTimerActive(t => !t)}
              className="text-xs px-2 py-0.5 rounded text-muted-foreground hover:text-foreground"
            >{timerActive ? "Pause" : "Resume"}</button>
          </div>
          <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap">{current.text}</p>

          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Type your answer here. Aim for structured, specific, grounded in your real experience. The coach scores it on relevance, clarity, specificity, and structure."
            rows={8}
            disabled={evaluating || !!evaluation}
            className="w-full px-3.5 py-3 rounded-lg bg-card border border-input text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-y font-sans leading-relaxed"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">{answer.length} chars · ~{Math.max(1, Math.round(answer.split(/\s+/).filter(Boolean).length / 150))} min read</span>
            <div className="flex-1" />
            {!evaluation && (
              <button
                onClick={submit}
                disabled={!answer.trim() || evaluating}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-white bg-success hover:bg-success/90 disabled:opacity-50 shadow-soft"
              >
                {evaluating ? <Spinner /> : <span>✓</span>} {evaluating ? "Grading..." : "Grade my answer"}
              </button>
            )}
            {evaluation && (
              <button
                onClick={nextQuestion}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90"
              >Next question →</button>
            )}
          </div>

          {/* Evaluation */}
          {evaluation && (
            <div className="mt-4 rounded-xl border border-border bg-card shadow-panel p-5 space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className={`text-4xl font-bold tabular-nums ${scoreColor(evaluation.score)}`}>
                  {evaluation.score}<span className="text-xl text-muted-foreground">/100</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verdict</p>
                  <p className="text-[15px] text-foreground mt-0.5">{evaluation.verdict}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {evaluation.strengths?.length > 0 && (
                  <div className="rounded-lg bg-success/5 border border-success/20 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-success mb-1.5">💚 Strengths</p>
                    <ul className="space-y-1">
                      {evaluation.strengths.map((s, i) => <li key={i} className="text-[13.5px] text-foreground/90 leading-relaxed">• {s}</li>)}
                    </ul>
                  </div>
                )}
                {evaluation.improvements?.length > 0 && (
                  <div className="rounded-lg bg-warning/5 border border-warning/20 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-warning mb-1.5">🎯 Improve</p>
                    <ul className="space-y-1">
                      {evaluation.improvements.map((s, i) => <li key={i} className="text-[13.5px] text-foreground/90 leading-relaxed">• {s}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {evaluation.missing_points?.length > 0 && (
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-destructive mb-1.5">⚠ Missing points</p>
                  <ul className="space-y-1">
                    {evaluation.missing_points.map((s, i) => <li key={i} className="text-[13.5px] text-foreground/90 leading-relaxed">• {s}</li>)}
                  </ul>
                </div>
              )}

              {evaluation.model_answer && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">🏆 Model answer</p>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{evaluation.model_answer}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!current && !generating && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-base font-semibold text-foreground">Ready to practice?</p>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">Pick a category + difficulty, click <b>Start mock</b>, answer in your own words. Your coach grades on relevance, clarity, specificity, and structure.</p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-xl border border-border bg-card/40 shadow-soft p-3.5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">This session · {history.length} graded</p>
          <div className="space-y-1.5">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px]">
                <span className={`tabular-nums font-bold ${scoreColor(h.score)} w-9`}>{h.score}</span>
                <span className="text-muted-foreground/80 uppercase text-[10px] tracking-wider w-28 shrink-0">{h.cat.replace("_", " ")}</span>
                <span className="text-foreground/80 truncate flex-1">{h.q}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
