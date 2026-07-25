import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/lib/api";
import type {
  HubAchievement,
  HubAnalytics,
  HubJourney,
  HubPath,
  HubPathParams,
  HubSubmitResult,
  MentorMessage,
} from "@/types/hub";

export function isUpgrade(res: { status?: number; errorPayload?: Record<string, unknown> }) {
  return res.status === 403 && res.errorPayload?.error === "upgrade_required";
}

const keyFor = (params?: HubPathParams) => [
  "hub",
  "path",
  params?.role ?? null,
  params?.difficulty ?? null,
  params?.season_id ?? null,
];

/** The campaign map — chapters with locked/active/completed state. */
export function useHubJourney(params?: HubPathParams) {
  return useQuery<HubJourney | null>({
    queryKey: ["hub", "journey", params?.role ?? null, params?.difficulty ?? null],
    queryFn: async () => {
      const res = await apiService.getHubJourney(params);
      if (res.error) throw new Error(res.error);
      return res.data ?? null;
    },
    staleTime: 30_000,
  });
}

/** Master query — resolves/generates a chapter's sprint path (season/admin
 *  override reruns). `enabled` lets callers wait until the chapter is known. */
export function useHubPath(params?: HubPathParams, enabled = true) {
  return useQuery<HubPath>({
    queryKey: keyFor(params),
    enabled,
    queryFn: async () => {
      const res = await apiService.getHubPath(params);
      if (res.error) throw new Error(res.error || "Could not load your sprint");
      const data = res.data as HubPath | { status?: string };
      if (!data || (data as { status?: string }).status !== "ready" || !(data as HubPath).days) {
        // Still generating — surface as a retriable error so react-query refetches.
        throw new Error("generating");
      }
      return data as HubPath;
    },
    staleTime: 30_000,
    // Poll while generating. A first-time multi-day sprint can take ~2 min to
    // generate (cached forever after), so allow up to ~150s of polling.
    retry: (count, err) => (err as Error)?.message === "generating" && count < 50,
    retryDelay: 3000,
  });
}

export function useHubAnalytics(params?: HubPathParams, enabled = true) {
  return useQuery<HubAnalytics | null>({
    queryKey: ["hub", "analytics", params?.role ?? null, params?.difficulty ?? null, params?.season_id ?? null],
    queryFn: async () => {
      const res = await apiService.getHubAnalytics(params);
      if (res.error) throw new Error(res.error);
      const data = res.data as HubAnalytics | { status?: string };
      if (!data || (data as { status?: string }).status) return null;
      return data as HubAnalytics;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useHubAchievements() {
  return useQuery<HubAchievement[]>({
    queryKey: ["hub", "achievements"],
    queryFn: async () => {
      const res = await apiService.getHubAchievements();
      if (res.error) throw new Error(res.error);
      return res.data?.achievements ?? [];
    },
    staleTime: 30_000,
  });
}

export function useHubRoles(enabled = true) {
  return useQuery({
    queryKey: ["hub", "roles"],
    queryFn: async () => {
      const res = await apiService.getHubRoles();
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** Submit a day. Invalidates path/analytics/achievements; returns the reward. */
export function useSubmitDay(params?: HubPathParams) {
  const qc = useQueryClient();
  return useMutation<HubSubmitResult, Error, { dayKey: string; note?: string; repoUrl?: string }>({
    mutationFn: async ({ dayKey, note, repoUrl }) => {
      const res = await apiService.submitHubDay(dayKey, note, params, repoUrl);
      if (res.error || !res.data) {
        const e = new Error(res.error || "Could not submit challenge") as Error & {
          status?: number;
          errorPayload?: Record<string, unknown>;
        };
        e.status = res.status;
        e.errorPayload = res.errorPayload;
        throw e;
      }
      return res.data;
    },
    onSuccess: (data) => {
      if (data.path) qc.setQueryData(keyFor(params), data.path);
      qc.invalidateQueries({ queryKey: ["hub", "analytics"] });
      qc.invalidateQueries({ queryKey: ["hub", "achievements"] });
      // Completing a day may finish the chapter → next chapter unlocks.
      qc.invalidateQueries({ queryKey: ["hub", "journey"] });
    },
  });
}

/** Mentor chat — client-side message state + a mutation that polls/answers. */
export function useMentor(dayKey?: string, params?: HubPathParams) {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [pending, setPending] = useState(false);

  const send = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || pending) return;
      const userMsg: MentorMessage = { role: "user", content: q, ts: Date.now() };
      const history = [...messages, userMsg].slice(-8);
      setMessages((m) => [...m, userMsg]);
      setPending(true);
      const res = await apiService.askHubMentor({
        question: q,
        day_key: dayKey,
        history,
        role: params?.role,
        difficulty: params?.difficulty,
        season_id: params?.season_id,
      });
      setPending(false);
      if (res.error || !res.data) {
        setMessages((m) => [
          ...m,
          {
            role: "mentor",
            content: "I hit a snag reaching my brain just now — mind trying that again?",
            ts: Date.now(),
          },
        ]);
        return;
      }
      setMessages((m) => [
        ...m,
        { role: "mentor", content: res.data!.answer, ts: Date.now(), followups: res.data!.followups },
      ]);
    },
    [messages, pending, dayKey, params?.role, params?.difficulty],
  );

  const reset = useCallback(() => setMessages([]), []);
  return { messages, pending, send, reset };
}
