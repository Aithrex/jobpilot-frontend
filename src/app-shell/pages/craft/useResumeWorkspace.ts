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
  /** Raw list lengths. Facts, not derived metrics. */
  resumeCount: number;
  tailoredCount: number;
  reload: () => void;
}

/**
 * The Resume workspace's shared read model.
 *
 * Two facts every Resume section may want: which resumes are uploaded, and
 * what was tailored most recently. They are independent for FAILURE: one
 * endpoint erroring must not blank the other, which is why the two states
 * are tracked separately rather than as a single page-level flag.
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
