/**
 * ATS score display atoms — shared across the Tailor and Batch flows.
 *
 * Extracted verbatim from the ResumeParser monolith so both the classic
 * workspace (`/app`) and the new app-shell Tailor page render identical score
 * visuals from one source. These are pure presentational components (score in →
 * bar/ring/parseability card out) with no data fetching.
 */
import type {
  PdfParseabilityChecks,
  VendorCompatEntry,
  CheckStatus,
} from "@/types/resume";

// ─── Score bar ───────────────────────────────────────────────────────────────
export function ScoreBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color?: string;
}) {
  const bg =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
        ? "bg-amber-500"
        : "bg-red-500";
  const scoreColor =
    score >= 80
      ? "text-emerald-500 dark:text-emerald-400"
      : score >= 60
        ? "text-amber-500 dark:text-amber-400"
        : "text-red-500 dark:text-red-400";
  const badge =
    score >= 90
      ? {
          text: "Excellent",
          cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
        }
      : score >= 80
        ? {
            text: "Strong",
            cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          }
        : score >= 70
          ? {
              text: "Good",
              cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
            }
          : score >= 50
            ? {
                text: "Needs work",
                cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
              }
            : {
                text: "Weak",
                cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
              };
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center gap-2">
        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold tabular-nums ${scoreColor}`}>
            {score}
          </span>
          <span
            className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${badge.cls}`}
          >
            {badge.text}
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-gray-200 dark:bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-out ${color || bg}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Score ring ─────────────────────────────────────────────────────────────
export function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = (size - 10) / 2,
    c = 2 * Math.PI * r,
    o = c - (score / 100) * c;
  const col = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="stroke-gray-200 dark:stroke-gray-800"
          strokeWidth="5"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={col}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={o}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: col }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

// ─── PDF parseability card ────────────────────────────────────────────────────
export function PDFParseabilityCard({
  score,
  checks,
  warnings,
}: {
  score: number;
  checks: PdfParseabilityChecks;
  warnings: string[];
}) {
  const tone =
    score >= 90
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"
      : score >= 75
      ? "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300"
      : "border-rose-400/40 bg-rose-400/10 text-rose-700 dark:text-rose-300";

  const Row = ({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) => (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 font-medium ${
          ok ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />
        {ok ? "Pass" : "Fail"}
        {detail ? <span className="text-gray-500 dark:text-gray-400 ml-1">({detail})</span> : null}
      </span>
    </div>
  );

  const skillsFound = Number(checks.skills_keywords_found ?? 0);
  const skillsTotal = Number(checks.skills_keywords_total ?? 0);
  const datesFound = Number(checks.experience_dates_parseable ?? 0);
  const datesTotal = Number(checks.experience_dates_total ?? 0);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Real ATS Parseability
        </p>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>
          {score}/100
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Deterministic round-trip through pypdf (same library used by Workday,
        Greenhouse, Taleo) — verifies what a real ATS will actually read.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Row label="PDF text extraction" ok={!!checks.extraction_ok} />
        <Row
          label="Single page"
          ok={!!checks.single_page}
          detail={`${checks.page_count ?? "?"} page${checks.page_count === 1 ? "" : "s"}`}
        />
        <Row label="Name extracts cleanly" ok={!!checks.contact_name_found} />
        <Row label="Email extracts cleanly" ok={!!checks.contact_email_found} />
        <Row label="Phone extracts cleanly" ok={!!checks.contact_phone_found} />
        <Row label="Contact at top of page" ok={!!checks.contact_at_top} />
        <Row
          label="All sections found"
          ok={Array.isArray(checks.sections_missing) && checks.sections_missing.length === 0}
          detail={`${checks.sections_found?.length || 0}/4`}
        />
        <Row label="Section order correct" ok={!!checks.sections_in_order} />
        <Row
          label="Skills survive extraction"
          ok={skillsTotal === 0 || skillsFound / skillsTotal >= 0.9}
          detail={skillsTotal > 0 ? `${skillsFound}/${skillsTotal}` : "n/a"}
        />
        <Row
          label="Dates parseable (ATS pattern)"
          ok={datesTotal === 0 || datesFound === datesTotal}
          detail={datesTotal > 0 ? `${datesFound}/${datesTotal}` : "n/a"}
        />
        <Row label="No glyph corruption" ok={!!checks.no_glyph_corruption} />
        <Row
          label="No word-join issues"
          ok={!checks.word_join_issues || checks.word_join_issues.length === 0}
        />
      </div>
      {warnings.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {warnings.slice(0, 4).map((w, i) => (
            <p key={i} className="text-[11px] text-amber-700 dark:text-amber-300/90">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vendor parse-compat checklist ──────────────────────────────────────────
// v2 replacement for the fake per-vendor "scanner scores": each vendor gets a
// deterministic pass/warn/fail checklist derived from the real PDF round-trip.
const STATUS_TONE: Record<CheckStatus, { dot: string; text: string; label: string }> = {
  pass: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    label: "Pass",
  },
  warn: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    label: "Check",
  },
  fail: {
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    label: "Fail",
  },
};

export function VendorChecklistCard({
  vendor,
  entry,
}: {
  vendor: string;
  entry: VendorCompatEntry;
}) {
  const tone = STATUS_TONE[entry.status] ?? STATUS_TONE.warn;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 p-3.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
          {vendor}
        </p>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${tone.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {tone.label}
        </span>
      </div>
      <ul className="space-y-1">
        {entry.checks.map((chk) => {
          const rowTone = STATUS_TONE[chk.status] ?? STATUS_TONE.warn;
          return (
            <li key={chk.id} className="flex items-start gap-1.5 text-[11px] leading-snug">
              <span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${rowTone.dot}`} />
              <span className="text-gray-600 dark:text-gray-400">{chk.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
