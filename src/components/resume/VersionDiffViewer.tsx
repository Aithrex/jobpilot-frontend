import { useMemo, useState } from "react";
import type { TailoringRecord, TailoringVersion, TailoredFullResume } from "@/types/resume";
import { apiService } from "@/lib/api";

// Minimal line-level diff. We avoid pulling in a heavy diff library — simple
// longest-common-subsequence over array elements (strings / bullets) gives a
// clear-enough view for resumes. "diff" package listed in node_modules is not
// always available at runtime in all build configs, so we roll our own.
type DiffOp = { kind: "same" | "add" | "del"; text: string };

function lcsDiff(a: string[], b: string[]): DiffOp[] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { ops.push({ kind: "same", text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ kind: "del", text: a[i] }); i++; }
    else { ops.push({ kind: "add", text: b[j] }); j++; }
  }
  while (i < m) { ops.push({ kind: "del", text: a[i++] }); }
  while (j < n) { ops.push({ kind: "add", text: b[j++] }); }
  return ops;
}

function DiffBlock({ title, left, right }: { title: string; left: string[]; right: string[] }) {
  const ops = useMemo(() => lcsDiff(left, right), [left, right]);
  if (ops.length === 0) return null;
  if (ops.every(o => o.kind === "same")) {
    return (
      <div>
        <p className="overline mb-1">{title}</p>
        <p className="text-[11px] italic text-muted-foreground">No changes</p>
      </div>
    );
  }
  return (
    <div>
      <p className="overline mb-1">{title}</p>
      <ul className="space-y-0.5 text-[11px] leading-relaxed">
        {ops.map((o, i) => {
          const cls =
            o.kind === "add"
              ? "border-l-2 border-success/50 bg-success/10 text-success"
              : o.kind === "del"
              ? "border-l-2 border-destructive/50 bg-destructive/10 text-destructive line-through"
              : "text-muted-foreground";
          const prefix = o.kind === "add" ? "+ " : o.kind === "del" ? "− " : "  ";
          return <li key={i} className={`pl-2 pr-2 py-0.5 ${cls}`}>{prefix}{o.text}</li>;
        })}
      </ul>
    </div>
  );
}

interface Props {
  record: TailoringRecord;
  onClose: () => void;
}

export default function VersionDiffViewer({ record, onClose }: Props) {
  const versions = (record.versions || []).slice().sort((a, b) => a.version_number - b.version_number);
  const [leftId, setLeftId] = useState<string>(versions[Math.max(0, versions.length - 2)]?.version_id || "");
  const [rightId, setRightId] = useState<string>(versions[versions.length - 1]?.version_id || "");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState<Map<string, TailoredFullResume>>(new Map());
  const [error, setError] = useState("");

  const getResume = async (v: TailoringVersion): Promise<TailoredFullResume | null> => {
    if (v.tailored_resume) return v.tailored_resume;
    const cached = hydrated.get(v.version_id);
    if (cached) return cached;
    setLoading(true);
    const resp = await apiService.getTailoringRecord(record.record_id);
    setLoading(false);
    if (resp.error || !resp.data?.record) {
      setError("Failed to load version content");
      return null;
    }
    const full = resp.data.record as TailoringRecord;
    const map = new Map(hydrated);
    (full.versions || []).forEach(vv => {
      if (vv.tailored_resume) map.set(vv.version_id, vv.tailored_resume);
    });
    setHydrated(map);
    return map.get(v.version_id) || null;
  };

  const [leftR, setLeftR] = useState<TailoredFullResume | null>(null);
  const [rightR, setRightR] = useState<TailoredFullResume | null>(null);

  const loadPair = async () => {
    setError("");
    const lv = versions.find(v => v.version_id === leftId);
    const rv = versions.find(v => v.version_id === rightId);
    if (!lv || !rv) return;
    const [l, r] = await Promise.all([getResume(lv), getResume(rv)]);
    setLeftR(l); setRightR(r);
  };

  // Auto-load once on open / whenever selection changes
  useMemo(() => { loadPair(); // eslint-disable-next-line
  }, [leftId, rightId]);

  const selectCls =
    "px-2 py-1 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Compare resume versions"
    >
      <div className="w-full max-w-5xl max-h-[92vh] rounded-2xl border border-border bg-card shadow-pop flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              Compare versions · {record.jd_analysis?.job_title || "Record"}
              {record.jd_analysis?.company && record.jd_analysis.company !== "Not specified" ? ` · ${record.jd_analysis.company}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={leftId}
              onChange={e => setLeftId(e.target.value)}
              aria-label="Compare from version"
              className={selectCls}
            >
              {versions.map(v => <option key={v.version_id} value={v.version_id}>v{v.version_number} · {v.source}</option>)}
            </select>
            <span className="text-xs text-muted-foreground" aria-hidden>→</span>
            <select
              value={rightId}
              onChange={e => setRightId(e.target.value)}
              aria-label="Compare to version"
              className={selectCls}
            >
              {versions.map(v => <option key={v.version_id} value={v.version_id}>v{v.version_number} · {v.source}</option>)}
            </select>
            <button
              onClick={onClose}
              className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Close
            </button>
          </div>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {loading && (
            <div className="space-y-2" role="status" aria-label="Loading versions">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
              <div className="h-3 w-9/12 animate-pulse rounded bg-muted" />
            </div>
          )}
          {error && !loading && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <p className="text-destructive">{error}</p>
              <button
                type="button"
                onClick={loadPair}
                className="font-semibold text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Try again
              </button>
            </div>
          )}
          {!loading && versions.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No versions to compare yet. Tailor this resume and each version
              lands here.
            </div>
          )}
          {!loading && leftR && rightR && (
            <>
              {/* Summary diff */}
              <DiffBlock title="Summary" left={leftR.summary ? [leftR.summary] : []} right={rightR.summary ? [rightR.summary] : []} />

              {/* Experience bullets diff */}
              {(() => {
                const leftBullets = (leftR.experience || []).flatMap((e, i) =>
                  (e.bullets || []).map(b => `[${e.company || "Exp " + (i + 1)}] ${b}`),
                );
                const rightBullets = (rightR.experience || []).flatMap((e, i) =>
                  (e.bullets || []).map(b => `[${e.company || "Exp " + (i + 1)}] ${b}`),
                );
                return <DiffBlock title="Experience bullets" left={leftBullets} right={rightBullets} />;
              })()}

              {/* Projects bullets diff */}
              {(() => {
                const l = (leftR.projects || []).flatMap((p) => (p.bullets || []).map(b => `[${p.name}] ${b}`));
                const r = (rightR.projects || []).flatMap((p) => (p.bullets || []).map(b => `[${p.name}] ${b}`));
                return <DiffBlock title="Project bullets" left={l} right={r} />;
              })()}

              {/* Skills diff */}
              {(() => {
                const flatten = (res: TailoredFullResume) =>
                  Object.entries(res.skills || {}).flatMap(([k, v]) => (Array.isArray(v) ? v : []).map(s => `${k}: ${s}`));
                return <DiffBlock title="Skills" left={flatten(leftR).sort()} right={flatten(rightR).sort()} />;
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
