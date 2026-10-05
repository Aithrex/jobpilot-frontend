import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '@/lib/api';
import type { TailoringRecord } from '@/types/resume';
import type { TailoringHistoryPage, TailoringHistoryQuery } from '@/types/tailoringHistory';

/** No automatic traversal: initial query, then one request per Load more. */
export function useTailoringHistory(query: TailoringHistoryQuery) {
  const [records, setRecords] = useState<TailoringRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<TailoringHistoryPage['summary']>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [moreError, setMoreError] = useState('');
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const pendingMore = useRef(false);
  const queryKey = JSON.stringify(query);
  const currentKey = useRef(queryKey);
  currentKey.current = queryKey;

  useEffect(() => {
    const requestId = ++generation.current;
    pendingMore.current = false;
    setRecords([]);
    setTotal(0);
    setNextCursor(null);
    setLoading(true);
    setLoadingMore(false);
    setError('');
    setMoreError('');
    const run = async () => {
      try {
        const response = await apiService.getTailoringHistoryPage(JSON.parse(queryKey));
        if (generation.current !== requestId || currentKey.current !== queryKey) return;
        if (response.error || !response.data) {
          setError(response.error || 'Could not load your tailored resumes.');
        } else {
          setRecords(response.data.records);
          setTotal(response.data.total);
          setSummary(response.data.summary);
          setNextCursor(response.data.next_cursor);
        }
      } catch {
        if (generation.current === requestId && currentKey.current === queryKey) {
          setError('Could not load your tailored resumes. Please try again.');
        }
      } finally {
        if (generation.current === requestId && currentKey.current === queryKey) setLoading(false);
      }
    };
    void run();
    return () => { generation.current += 1; };
  }, [queryKey, revision]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading || pendingMore.current) return;
    pendingMore.current = true;
    const requestId = generation.current;
    setLoadingMore(true);
    setMoreError('');
    try {
      const response = await apiService.getTailoringHistoryPage({ ...JSON.parse(queryKey), cursor: nextCursor });
      if (generation.current !== requestId || currentKey.current !== queryKey) return;
      if (response.error || !response.data) {
        setMoreError(response.error || 'Could not load more resumes.');
      } else if (response.data.next_cursor === nextCursor) {
        setMoreError('Could not advance through your history. Please refresh.');
      } else {
        const data = response.data;
        setRecords(previous => [...new Map([...previous, ...data.records].map(record => [record.record_id, record])).values()]);
        setTotal(data.total);
        setNextCursor(data.next_cursor);
      }
    } catch {
      if (generation.current === requestId && currentKey.current === queryKey) {
        setMoreError('Could not load more resumes. Please try again.');
      }
    } finally {
      if (generation.current === requestId && currentKey.current === queryKey) {
        pendingMore.current = false;
        setLoadingMore(false);
      }
    }
  }, [nextCursor, loading, queryKey]);

  const reload = useCallback(() => { generation.current += 1; setRevision(value => value + 1); }, []);
  return { records, setRecords, total, summary, nextCursor, loading, loadingMore, error, moreError, loadMore, reload };
}
