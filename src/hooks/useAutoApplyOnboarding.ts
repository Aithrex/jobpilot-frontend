import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type {
  OnboardingQuestions,
  SaveOnboardingAnswersBody,
} from "@/types/onboarding";

const ONBOARDING_KEY = ["auto-apply", "onboarding"] as const;
const SETTINGS_KEY = ["auto-submit", "settings"] as const;

/** State the onboarding modal branches on: unavailable (404) vs. the payload. */
interface OnboardingState {
  unavailable: boolean;
  questions?: OnboardingQuestions;
}

export interface SaveOnboardingResult {
  ok: boolean;
  data?: OnboardingQuestions;
  error?: string;
}

/**
 * Reads the Auto-Apply onboarding questionnaire and writes reviewed answers +
 * the autonomy mode. Mirrors `useAutoSubmit`'s master-flag-off (404) handling
 * so the whole surface hides when the feature isn't available. All calls go
 * through `apiService`; the settings query is invalidated on save so the mode
 * the picker just set is reflected everywhere (AutoApplyTab, AutonomyPanel).
 *
 * `enabled` lets callers defer the fetch until the modal actually opens.
 */
export function useAutoApplyOnboarding(enabled = true) {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const query = useQuery<OnboardingState>({
    queryKey: ONBOARDING_KEY,
    queryFn: async () => {
      const res = await apiService.getOnboardingQuestions();
      if (res.status === 404) return { unavailable: true };
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to load");
      return { unavailable: false, questions: res.data };
    },
    enabled: isAuthenticated && enabled,
    staleTime: 30_000,
    retry: false,
  });

  const save = useCallback(
    async (body: SaveOnboardingAnswersBody): Promise<SaveOnboardingResult> => {
      setSaving(true);
      const res = await apiService.saveOnboardingAnswers(body);
      setSaving(false);
      if (res.error || !res.data) {
        return { ok: false, error: res.error ?? "Could not save your answers" };
      }
      qc.setQueryData<OnboardingState>(ONBOARDING_KEY, {
        unavailable: false,
        questions: res.data,
      });
      // The mode is the single source of truth read by the auto-submit settings
      // query too - refresh it so the tab reflects the just-picked mode.
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      return { ok: true, data: res.data };
    },
    [qc],
  );

  return {
    /** false = feature flag off (hide the surface); undefined = still loading. */
    available: query.data ? !query.data.unavailable : undefined,
    questions: query.data?.questions,
    loading: query.isLoading,
    error: query.isError,
    saving,
    save,
    refetch: () => qc.invalidateQueries({ queryKey: ONBOARDING_KEY }),
  };
}
