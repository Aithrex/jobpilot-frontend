import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { hasFeature, limitOf } from '@/lib/entitlements';

/**
 * Lightweight, synchronous access to the current user's plan + feature flags
 * (already embedded in the auth profile). Use for gating UI without a fetch.
 */
export function useEntitlements() {
  const { user } = useAuth();
  const ent = user?.entitlements;
  return {
    plan: ent?.plan ?? user?.plan ?? 'free',
    planLabel: ent?.plan_label,
    features: ent?.features ?? [],
    limits: ent?.limits ?? {},
    has: (feature: string) => hasFeature(ent, feature),
    limit: (key: string) => limitOf(ent, key),
  };
}

/**
 * Full billing view with LIVE usage counters (GET /api/billing/plan).
 * Use on the Billing tab and quota meters that need current usage.
 */
export function useBillingPlan(enabled = true) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['billing-plan'],
    queryFn: async () => {
      const res = await apiService.getBillingPlan();
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    enabled: enabled && isAuthenticated,
    staleTime: 60_000,
  });
}
