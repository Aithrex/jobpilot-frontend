import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '@/lib/api';
import type { ResumeAssetRow, TailoringRecord } from '@/types/resume';

export type PanelState = 'loading' | 'error' | 'ready';

export interface ResumeWorkspaceData {
  resumesState: PanelState;
  tailoredState: PanelState;
  /** The row the backend marks active, else the newest upload, else null. */
  activeResume: ResumeAssetRow | null;
  /** Tailoring records newest-first. */
  recentRecords: TailoringRecord[];
  /** Raw counts for the overview panel. Facts, not derived metrics. */
  resumeCount: number;
  tailoredCount: number;
  reload: () => void;
}

/**
 * The Resume workspace's shared read model.
 *
 * The dock's health panel and the centre dashboard describe the same two
 * facts (is there an active resume, what has been tailored), so they read
 * from one place. Both panels are independent for FAILURE, though: one
 * endpoint erroring must not blank the other, which is why the two states are
 * tracked separately rather than as a single page-level flag.
 */
export function useResumeWorkspace(): ResumeWorkspaceData {
  const [resumesState, setResumesState] = useState<PanelState>('loading');
  const [tailoredState, setTailoredState] = useState<PanelState>('loading');
  const [resumes, setResumes] = useState<ResumeAssetRow[]>([]);
  const [records, setRecords] = useState<TailoringRecord[]>([]);
  const [tailoredCount, setTailoredCount] = useState(0);

  const load = useCallback(async () => {
    setResumesState('loading');
    setTailoredState('loading');

    const [baseResp, recResp] = await Promise.all([
      apiService.listBaseResumes(),
      apiService.getTailoringHistoryPage({ page_size: 5, sort: 'newest' }),
    ]);

    if (baseResp.data) {
      setResumes(baseResp.data.versions || []);
      setResumesState('ready');
    } else {
      setResumesState('error');
    }

    if (recResp.data) {
      setRecords((recResp.data.records || []) as TailoringRecord[]);
      setTailoredCount(recResp.data.total);
      setTailoredState('ready');
    } else {
      setTailoredState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeResume = useMemo(() => {
    if (resumes.length === 0) return null;
    return (
      resumes.find((r) => r.is_active) ??
      resumes
        .slice()
        .sort(
          (a, b) =>
            new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime(),
        )[0] ??
      null
    );
  }, [resumes]);

  const recentRecords = useMemo(
    () =>
      records
        .slice()
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
        ),
    [records],
  );

  return {
    resumesState,
    tailoredState,
    activeResume,
    recentRecords,
    resumeCount: resumes.length,
    tailoredCount,
    reload: () => void load(),
  };
}

/* ── Resume health ────────────────────────────────────────────────────────
 * Derived ONLY from facts the frontend already holds. Deliberately not a
 * score: a percentage implies a rubric we do not have, and inventing one
 * would be fabricated analytics. Instead it reports a small number of
 * checks that are each individually verifiable in the UI.
 */

export interface HealthCheck {
  label: string;
  /** `true` = satisfied, `false` = actionable, `null` = not yet known. */
  done: boolean | null;
}

export interface ResumeHealth {
  checks: HealthCheck[];
  /** Satisfied checks over known checks - null while anything is loading. */
  ratio: { done: number; total: number } | null;
}

export function resumeHealth(data: ResumeWorkspaceData): ResumeHealth {
  const { resumesState, tailoredState, activeResume, recentRecords } = data;

  const resumesKnown = resumesState === 'ready';
  const tailoredKnown = tailoredState === 'ready';

  const hasActive = resumesKnown ? activeResume !== null : null;
  // `parse_status` gates tailoring server-side, so an unparsed base resume is
  // a real, actionable gap rather than a cosmetic one.
  const parsed = resumesKnown
    ? activeResume !== null && activeResume.parse_status === 'parsed'
    : null;
  const hasTailored = tailoredKnown ? recentRecords.length > 0 : null;

  const checks: HealthCheck[] = [
    { label: hasActive ? 'Active resume set' : 'No active resume', done: hasActive },
    { label: parsed ? 'Resume parsed and ready' : 'Resume not parsed yet', done: parsed },
    {
      label: tailoredState === 'error'
        ? 'Tailored history unavailable'
        : tailoredState === 'loading'
          ? 'Checking tailored versions...'
          : hasTailored ? 'Recent version saved' : 'Nothing tailored yet',
      done: hasTailored,
    },
  ];

  const known = checks.filter((c) => c.done !== null);
  const ratio =
    known.length === checks.length
      ? { done: known.filter((c) => c.done).length, total: checks.length }
      : null;

  return { checks, ratio };
}
