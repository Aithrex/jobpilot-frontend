import { useEffect, useState } from 'react';
import { apiService } from '@/lib/api';
import { cacheJdText, readCachedJdText } from '@/lib/craftHandoff';
import { decodeJobHtml } from '@/lib/format';
import type { Job } from '@/types/jobs';

export interface JobDescriptionState {
  text: string;
  loading: boolean;
  error: string;
}

/**
 * The full job description for a card, loaded only when `enabled`.
 *
 * Board rows ship without a body (it is stored server side), so the text comes
 * from the inline `description` when present, then the session cache, then
 * `apiService.fetchJobDescription` on the posting URL. One implementation for
 * the card's Details and the quick-look panel, so they never disagree.
 */
export function useJobDescription(
  job: Pick<Job, 'job_id' | 'description' | 'apply_link'> | null,
  enabled: boolean,
): JobDescriptionState {
  const [state, setState] = useState<JobDescriptionState>({ text: '', loading: false, error: '' });
  const jobId = job?.job_id;
  const inline = job?.description;
  const url = job?.apply_link || '';

  useEffect(() => {
    if (!enabled || !jobId) return;
    const stored = (inline || '').trim();
    if (stored) {
      setState({ text: decodeJobHtml(stored), loading: false, error: '' });
      return;
    }
    if (!url) {
      setState({ text: '', loading: false, error: 'No description is stored for this listing.' });
      return;
    }
    const cached = readCachedJdText(url);
    if (cached) {
      setState({ text: decodeJobHtml(cached), loading: false, error: '' });
      return;
    }
    let cancelled = false;
    setState({ text: '', loading: true, error: '' });
    const failed = 'We could not load this job description. Open the posting to read it.';
    apiService.fetchJobDescription(url).then((resp) => {
      if (cancelled) return;
      if (resp.data?.ok && resp.data.jd_text) {
        const jd = resp.data.jd_text.trim();
        cacheJdText(url, jd);
        setState({ text: decodeJobHtml(jd), loading: false, error: '' });
        return;
      }
      setState({ text: '', loading: false, error: failed });
    }).catch(() => {
      if (!cancelled) setState({ text: '', loading: false, error: failed });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, jobId, inline, url]);

  return state;
}
