import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';

/**
 * Unread mailbox count for the "Apply" nav badge. Reads getMailbox().unread_count.
 * A 404 (feature flag off) or any error resolves to 0 so the badge simply never
 * shows - the nav must never surface an error. Cached + refetched on window
 * focus so the badge stays roughly live without polling.
 */
export function useMailboxUnread(): number {
  const { data } = useQuery({
    queryKey: ['mailbox', 'unread'],
    queryFn: async () => {
      const res = await apiService.getMailbox();
      if (res.status === 404 || res.error || !res.data) return 0;
      return res.data.unread_count ?? 0;
    },
    // Keep the nav quiet: never retry into an error, refresh on focus.
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  return data ?? 0;
}
