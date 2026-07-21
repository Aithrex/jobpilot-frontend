/**
 * Bullet-level resume diff view - shared across the Tailor flow.
 *
 * Extracted from the ResumeParser monolith so both the classic workspace
 * (`/app`) and the new app-shell render an identical version diff from one
 * source. Pure presentational (prev/curr in → diff out).
 *
 * Diff model: bullets are set-compared per section, then removed×added
 * leftovers are similarity-paired (Dice ≥ 0.5) - a lightly-edited bullet
 * renders as ONE row with inline word-level highlights instead of a
 * remove+add pair. Works for both previous-version diffs and diffs against
 * the BASE resume (pass `prevLabel`).
 */
import type { TailoredFullResume } from "@/types/resume";
import { pairBullets, wordDiff } from "@/lib/textDiff";

function InlineWordDiff({ a, b }: { a: string; b: string }) {
  return (
    <>
      {wordDiff(a, b).map((seg, i) =>
        seg.type === "same" ? (
          <span key={i}> {seg.text}</span>
        ) : seg.type === "removed" ? (
          <span key={i} className="text-red-500 dark:text-red-300 line-through opacity-75">
            {" "}
            {seg.text}
          </span>
        ) : (
          <span key={i} className="text-emerald-600 dark:text-emerald-300 font-medium">
            {" "}
            {seg.text}
          </span>
        ),
      )}
    </>
  );
}

export function ResumeDiffView({
  prev,
  curr,
  prevLabel = "previous version",
}: {
  prev: TailoredFullResume;
  curr: TailoredFullResume;
  prevLabel?: string;
}) {
  const ST = ({ title, n }: { title: string; n?: number }) => (
    <div className="flex items-center gap-3 mb-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-purple-500 dark:text-purple-400/80">
        {title}
      </h3>
      {n !== undefined && n > 0 && (
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-500">
          {n} change{n === 1 ? "" : "s"}
        </span>
      )}
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
    </div>
  );

  // Build sets of bullets per section for comparison
  const prevExpBullets = new Set<string>();
  const currExpBullets = new Set<string>();
  (prev.experience || []).forEach((e) =>
    (e.bullets || []).forEach((b) => prevExpBullets.add(b.trim())),
  );
  (curr.experience || []).forEach((e) =>
    (e.bullets || []).forEach((b) => currExpBullets.add(b.trim())),
  );
  const prevProjBullets = new Set<string>();
  const currProjBullets = new Set<string>();
  (prev.projects || []).forEach((p) =>
    (p.bullets || []).forEach((b) => prevProjBullets.add(b.trim())),
  );
  (curr.projects || []).forEach((p) =>
    (p.bullets || []).forEach((b) => currProjBullets.add(b.trim())),
  );

  const DiffBullet = ({
    text,
    type,
  }: {
    text: string;
    type: "added" | "removed" | "same";
  }) => {
    const cls =
      type === "added"
        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : type === "removed"
          ? "border-red-500 bg-red-500/10 text-red-500 dark:text-red-300 line-through opacity-75"
          : "border-transparent";
    const marker = type === "added" ? "+" : type === "removed" ? "−" : "·";
    const markerCls =
      type === "added"
        ? "text-emerald-500"
        : type === "removed"
          ? "text-red-500"
          : "text-gray-400";
    return (
      <li
        className={`text-[12.5px] flex gap-2 leading-[1.65] pl-2 border-l-2 rounded-r ${cls}`}
      >
        <span className={`font-bold shrink-0 ${markerCls}`}>{marker}</span>
        <span>{text}</span>
      </li>
    );
  };

  // Lightly-edited bullet: one row, inline word-level highlights.
  const EditedBullet = ({ from, to }: { from: string; to: string }) => (
    <li className="text-[12.5px] flex gap-2 leading-[1.65] pl-2 border-l-2 rounded-r border-amber-500 bg-amber-500/10">
      <span className="font-bold shrink-0 text-amber-500">~</span>
      <span className="text-gray-700 dark:text-gray-300">
        <InlineWordDiff a={from} b={to} />
      </span>
    </li>
  );

  const summaryChanged =
    (prev.summary || "").trim() !== (curr.summary || "").trim();
  const addedSkills = new Set<string>();
  const removedSkills = new Set<string>();
  const prevSkillFlat = new Set<string>();
  const currSkillFlat = new Set<string>();
  for (const v of Object.values(prev.skills || {}))
    if (Array.isArray(v)) v.forEach((s) => prevSkillFlat.add(s));
  for (const v of Object.values(curr.skills || {}))
    if (Array.isArray(v)) v.forEach((s) => currSkillFlat.add(s));
  currSkillFlat.forEach((s) => {
    if (!prevSkillFlat.has(s)) addedSkills.add(s);
  });
  prevSkillFlat.forEach((s) => {
    if (!currSkillFlat.has(s)) removedSkills.add(s);
  });

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-amber-50 via-white to-purple-50 dark:from-amber-500/10 dark:via-gray-900 dark:to-purple-500/10 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
          Diff view
        </h2>
        <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
          Changes vs {prevLabel}
        </p>
        <div className="flex items-center gap-4 mt-2 text-[10px]">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-sm bg-emerald-500" />
            Added
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <span className="w-2 h-2 rounded-sm bg-amber-500" />
            Edited
          </span>
          <span className="inline-flex items-center gap-1.5 text-red-500 dark:text-red-400">
            <span className="w-2 h-2 rounded-sm bg-red-500" />
            Removed
          </span>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Summary - inline word diff instead of stacked del/ins */}
        {summaryChanged && (
          <div>
            <ST title="Summary" n={1} />
            <p className="text-[13px] leading-[1.7] text-gray-700 dark:text-gray-300 bg-amber-500/5 border-l-2 border-amber-500 pl-2 rounded-r">
              <InlineWordDiff a={prev.summary || ""} b={curr.summary || ""} />
            </p>
          </div>
        )}

        {/* Experience bullets - set diff + similarity-paired edits */}
        {(prevExpBullets.size > 0 || currExpBullets.size > 0) &&
          (() => {
            const addedExp = [...currExpBullets].filter(
              (b) => !prevExpBullets.has(b),
            );
            const removedExp = [...prevExpBullets].filter(
              (b) => !currExpBullets.has(b),
            );
            const paired = pairBullets(removedExp, addedExp);
            const changed =
              paired.edited.length + paired.added.length + paired.removed.length;
            if (changed === 0) return null;
            return (
              <div>
                <ST title="Experience" n={changed} />
                <ul className="space-y-1.5">
                  {paired.edited.map(([from, to], i) => (
                    <EditedBullet key={`e-${i}`} from={from} to={to} />
                  ))}
                  {paired.removed.map((b, i) => (
                    <DiffBullet key={`r-${i}`} text={b} type="removed" />
                  ))}
                  {paired.added.map((b, i) => (
                    <DiffBullet key={`a-${i}`} text={b} type="added" />
                  ))}
                </ul>
              </div>
            );
          })()}

        {/* Project bullets */}
        {(prevProjBullets.size > 0 || currProjBullets.size > 0) &&
          (() => {
            const addedProj = [...currProjBullets].filter(
              (b) => !prevProjBullets.has(b),
            );
            const removedProj = [...prevProjBullets].filter(
              (b) => !currProjBullets.has(b),
            );
            const paired = pairBullets(removedProj, addedProj);
            const changed =
              paired.edited.length + paired.added.length + paired.removed.length;
            if (changed === 0) return null;
            return (
              <div>
                <ST title="Projects" n={changed} />
                <ul className="space-y-1.5">
                  {paired.edited.map(([from, to], i) => (
                    <EditedBullet key={`e-${i}`} from={from} to={to} />
                  ))}
                  {paired.removed.map((b, i) => (
                    <DiffBullet key={`r-${i}`} text={b} type="removed" />
                  ))}
                  {paired.added.map((b, i) => (
                    <DiffBullet key={`a-${i}`} text={b} type="added" />
                  ))}
                </ul>
              </div>
            );
          })()}

        {/* Skills - chip diff */}
        {(addedSkills.size > 0 || removedSkills.size > 0) && (
          <div>
            <ST title="Skills" n={addedSkills.size + removedSkills.size} />
            <div className="flex flex-wrap gap-1.5">
              {[...removedSkills].map((s) => (
                <span
                  key={`r-${s}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-500 dark:text-red-300 border border-red-500/25 line-through opacity-75"
                >
                  <span className="font-bold">−</span>
                  {s}
                </span>
              ))}
              {[...addedSkills].map((s) => (
                <span
                  key={`a-${s}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/25"
                >
                  <span className="font-bold">+</span>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!summaryChanged &&
          prevExpBullets.size === currExpBullets.size &&
          [...prevExpBullets].every((b) => currExpBullets.has(b)) &&
          prevProjBullets.size === currProjBullets.size &&
          [...prevProjBullets].every((b) => currProjBullets.has(b)) &&
          addedSkills.size === 0 &&
          removedSkills.size === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No detectable changes between versions.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
