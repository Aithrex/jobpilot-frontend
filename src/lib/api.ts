/**
 * API service layer for backend communication
 *
 * This service provides a clean interface to all backend API endpoints.
 * The product surface is organized into:
 * - /api/auth - Authentication (login, register, OAuth, password reset)
 * - /api/resume - Resume parsing, tailoring, career copilot, interview prep
 * - /api/jobs - Job search & daily pipeline
 * - /api/billing - Plans & upgrades
 * - /api/admin - Super-admin console (stats, users, feedback, quotas)
 */

import { toast } from 'sonner';

import {
  isWorkAuthorizationStatus,
  legacyNeedsSponsorshipFlag,
  type WorkAuthorizationPreference,
  type WorkAuthorizationStatus,
} from '../types/workAuthorization';

const LLM_RETRIES_EXHAUSTED_TOAST_ID = 'llm-retries-exhausted';

function notifyLLMRetriesExhausted(): void {
  toast.error('⚡ High demand right now. Please try again in a moment.', {
    id: LLM_RETRIES_EXHAUSTED_TOAST_ID,
    duration: 6000,
  });
}

/** Resume upload / delete / reparse is the only reason to re-seed job titles. */
function emitResumeSetChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('resume:set-changed'));
}

// In browser on production (non-localhost), always use same origin so /api hits CloudFront regardless of build env.
// This avoids API URL mismatch after infra changes (e.g. Lambda URL, domain).
function getApiBaseUrl(): string {
  const build = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  if (
    typeof window !== 'undefined' &&
    window.location?.origin &&
    !window.location.origin.includes('localhost')
  )
    return `${window.location.origin}/api`;
  return build;
}
const API_BASE_URL = getApiBaseUrl();

/**
 * Absolute src for a backend-served company logo. Job rows carry an optional
 * `logo_url` like "/api/jobs/logo/<hash>" - resolve it against the SAME base
 * the API layer uses (dev: http://localhost:5000/api, prod: same-origin /api)
 * so components never hardcode hosts. Logos are public assets: load with a
 * plain <img>, never with auth headers. Returns null when there is no URL.
 */
export function companyLogoSrc(logoUrl?: string | null): string | null {
  if (!logoUrl) return null;
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  // API_BASE_URL already ends in "/api" - strip the duplicate prefix.
  const path = logoUrl.startsWith('/api/') ? logoUrl.slice('/api'.length) : logoUrl;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

// Per-user entitlement override doc returned by the admin ops endpoint.
// `overrides.plan` is overlaid on top of the user's stored plan by the
// backend entitlements service; a falsy/empty `overrides` clears the grant.
export interface AdminUserOverride {
  user_email?: string;
  overrides?: {
    plan?: string;
    limits?: Record<string, number | null>;
    features?: string[] | Record<string, unknown>;
  };
  updated_at?: string;
  updated_by?: string;
}

/**
 * User-facing copy for the bounded-refinement cap (Resume Platform v3):
 * a tailoring record holds at most 5 versions; the backend answers the 6th
 * refinement (regenerate / version save / download auto-append) with
 * 409 {"error":"version_limit_reached","limit":5}.
 */
export const VERSION_LIMIT_MESSAGE =
  'This tailored resume already has 5 versions. Start a new tailoring session to continue.';

/**
 * Guest capability transport (v6). `guest_id` and `device_token` are bearer
 * capabilities: they must NEVER travel in a URL, where they land in
 * CloudFront/API Gateway access logs, browser history and the Referer header
 * of every outbound link. The backend reads them from a Secure/HttpOnly
 * SameSite=Lax cookie (Path=/api) first, then these headers.
 */
interface GuestCapability {
  guestId?: string;
  deviceToken?: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
  // Full error body for callers that need more than the error string  -
  // e.g., quota_exceeded responses include a `usage` object the caller
  // wants to surface in a modal.
  errorPayload?: Record<string, unknown>;
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return (
      this.token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null)
    );
  }

  private static readonly REQUEST_TIMEOUT_MS = 15000;

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs?: number,
    // skipAuth: guest endpoints are unauthenticated BY DESIGN - never attach
    // the Bearer token on them (guest failures are 429/503, never 401; a
    // stale token must not be able to trip the 401 force-logout path there).
    //
    // guest: the guest capability transport (v6). The backend now reads
    // guest_id / device_token from a Secure+HttpOnly SameSite cookie (Path=/api)
    // with X-Guest-Id / X-Guest-Device-Token as the header fallback - so guest
    // calls need `credentials: "include"` or the cookie is never sent. Scoped
    // to guest calls ONLY: authed calls keep the default same-origin policy.
    // signal: an external cancellation (e.g. onboarding "Cancel"/close) that,
    // when aborted, tears down the in-flight fetch too. Distinct from the
    // internal timeout controller so we can tell "canceled" from "timed out".
    reqOpts?: { skipAuth?: boolean; guest?: GuestCapability; signal?: AbortSignal },
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const guest = reqOpts?.guest;
    const token = reqOpts?.skipAuth || guest ? null : this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(guest?.guestId ? { 'X-Guest-Id': guest.guestId } : {}),
      ...(guest?.deviceToken ? { 'X-Guest-Device-Token': guest.deviceToken } : {}),
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeoutMs || ApiService.REQUEST_TIMEOUT_MS,
    );

    // Forward an external cancellation into this fetch's controller.
    const externalSignal = reqOpts?.signal;
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', onExternalAbort);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        // Guest capability cookie (Path=/api). Never enabled for authed calls.
        ...(guest ? { credentials: 'include' as RequestCredentials } : {}),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);

      const data = await response.json().catch(() => ({}));

      // `token` is ALWAYS null on guest/skipAuth calls, so no guest response  -
      // including the 400s from /resume/guest/challenge/verify - can ever reach
      // the force-logout path. That is the invariant, not a coincidence.
      if (response.status === 401 && token) {
        this.logout();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        }
        return { error: 'Session expired. Please sign in again.' };
      }

      if (!response.ok) {
        return {
          error: data.error || data.message || data.msg || `HTTP ${response.status}`,
          status: response.status,
          errorPayload: data,
        };
      }

      return { data, status: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
      // An external cancellation aborts the same controller, so disambiguate:
      // canceled by the caller vs. our own timeout.
      if (externalSignal?.aborted) {
        return { error: 'Canceled' };
      }
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Request timed out. Please try again.' };
      }
      return {
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // ============================================
  // Auth endpoints (/api/auth)
  // ============================================

  async register(
    email: string,
    password: string,
    role?: string,
    sector?: string,
    session_id?: string,
    fingerprint_hash?: string,
  ) {
    const response = await this.request<{
      access_token: string;
      email: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        role,
        sector,
        session_id,
        fingerprint_hash,
      }),
    });

    if (response.data?.access_token) {
      this.setToken(response.data.access_token);
    }

    return response;
  }

  async login(email: string, password: string, session_id?: string, fingerprint_hash?: string) {
    const response = await this.request<{
      access_token: string;
      email: string;
      role?: string;
      sector?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, session_id, fingerprint_hash }),
    });

    if (response.data?.access_token) {
      this.setToken(response.data.access_token);
    }

    return response;
  }

  async logout() {
    this.setToken(null);
  }

  async getProfile() {
    return this.request<{
      email: string;
      name?: string;
      role?: string;
      sector?: string;
      created_at?: string;
      plan?: string;
      onboarded?: boolean;
      preferences?: Record<string, unknown>;
      entitlements?: {
        plan: string;
        plan_label?: string;
        features: string[];
        limits: Record<string, number | null>;
      };
      is_admin?: boolean;
      auth_providers?: string[];
    }>('/auth/profile', {
      method: 'GET',
    });
  }

  async updateProfile(data: { name?: string; role?: string; sector?: string }) {
    return this.request<{
      email: string;
      name?: string;
      role?: string;
      sector?: string;
      created_at?: string;
    }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async verifyToken() {
    return this.request<{ email: string; valid: boolean }>('/auth/verify', {
      method: 'GET',
    });
  }

  async checkUser(fingerprint_hash: string) {
    return this.request<{ exists: boolean; email?: string }>('/auth/check-user', {
      method: 'POST',
      body: JSON.stringify({ fingerprint_hash }),
    });
  }

  async requestPasswordReset(email: string) {
    return this.request<{ ok: boolean; message: string }>('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ ok: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  /**
   * Set or change the password for the signed-in account. Social-only accounts
   * (created with "Continue with Google") omit currentPassword - the session
   * itself is the proof - which is how they gain email+password sign-in without
   * depending on the reset email.
   */
  async setPassword(newPassword: string, currentPassword?: string) {
    return this.request<{ ok: boolean; message: string; auth_providers?: string[] }>(
      '/auth/set-password',
      {
        method: 'POST',
        body: JSON.stringify({
          new_password: newPassword,
          ...(currentPassword ? { current_password: currentPassword } : {}),
        }),
      },
    );
  }

  // ── Social sign-in ("Continue with ...") ───────────────────────
  async getOAuthProviders() {
    return this.request<{ providers: string[] }>('/auth/oauth/providers');
  }

  /**
   * Begin a social sign-in: fetches the provider's authorize URL and (by
   * default) redirects the browser to it. The provider then 302s back to
   * /oauth/callback#token=... which AuthCallback consumes.
   */
  async beginSocialAuth(
    provider: string,
    opts?: { redirect?: boolean; fingerprint_hash?: string },
  ) {
    const qs = opts?.fingerprint_hash
      ? `?fingerprint_hash=${encodeURIComponent(opts.fingerprint_hash)}`
      : '';
    const res = await this.request<{ authorize_url: string }>(
      `/auth/oauth/${encodeURIComponent(provider)}/authorize${qs}`,
    );
    if (res.data?.authorize_url && opts?.redirect !== false && typeof window !== 'undefined') {
      window.location.assign(res.data.authorize_url);
    }
    return res;
  }

  // ── Personalization / onboarding preferences ─────────────────
  async savePreferences(prefs: Record<string, unknown>) {
    return this.request<Awaited<ReturnType<ApiService['getProfile']>>['data']>(
      '/auth/preferences',
      { method: 'PUT', body: JSON.stringify(prefs) },
    );
  }

  // ── Work authorization preference ────────────────────────────
  //
  // THE ONE PLACE this preference crosses the wire. See
  // `src/types/workAuthorization.ts` for the full contract and for the fields
  // still being agreed with the backend.
  //
  // Transport today is the EXISTING preferences endpoint, which already takes
  // an open record and already round-trips it on `GET /auth/profile` - so this
  // ships against a deployed route rather than an invented one. When the
  // dedicated `/api/resume/visa/work-authorization` endpoint lands, these two
  // methods are the only thing that changes.
  //
  // `needs_sponsorship` is written ALONGSIDE the new key, because onboarding
  // has been writing that boolean since before this question existed and
  // something server-side may still read it. It is derived, never authoritative:
  // it cannot express "prefer not to say" or "authorized now, sponsorship
  // later", which is exactly why the new key exists.

  /** Read the stored answer. Absent/garbage reads as `unset`, never as a guess. */
  async getWorkAuthorization(): Promise<ApiResponse<WorkAuthorizationPreference>> {
    const res = await this.getProfile();
    if (res.error || !res.data) {
      return { error: res.error ?? 'Could not read your profile', status: res.status };
    }
    const prefs = (res.data.preferences ?? {}) as Record<string, unknown>;
    const raw = prefs.work_authorization;
    const updated = prefs.work_authorization_updated_at;
    return {
      data: {
        status: isWorkAuthorizationStatus(raw) ? raw : 'unset',
        updated_at: typeof updated === 'string' ? updated : null,
        persisted: isWorkAuthorizationStatus(raw),
      },
      status: res.status,
    };
  }

  /**
   * Persist the answer.
   *
   * The refreshed profile is read back and the key CHECKED, so a server that
   * silently drops an unknown preference key is reported as "not saved"
   * instead of being rendered as saved. A preference the user believes is set
   * is worse than one they know is not.
   */
  async saveWorkAuthorization(
    status: WorkAuthorizationStatus,
  ): Promise<ApiResponse<WorkAuthorizationPreference>> {
    const legacy = legacyNeedsSponsorshipFlag(status);
    const res = await this.savePreferences({
      work_authorization: status,
      work_authorization_updated_at: new Date().toISOString(),
      ...(legacy === null ? {} : { needs_sponsorship: legacy }),
    });
    if (res.error) return { error: res.error, status: res.status, errorPayload: res.errorPayload };

    const prefs = ((res.data?.preferences ?? {}) as Record<string, unknown>) ?? {};
    const echoed = prefs.work_authorization;
    const updated = prefs.work_authorization_updated_at;
    return {
      data: {
        status,
        updated_at: typeof updated === 'string' ? updated : null,
        persisted: isWorkAuthorizationStatus(echoed) && echoed === status,
      },
      status: res.status,
    };
  }

  // ── Billing / plan (freemium) ────────────────────────────────
  async getBillingPlan() {
    return this.request<{
      plan: string;
      plan_label?: string;
      plan_since?: string | null;
      features: string[];
      limits: Record<string, number | null>;
      usage: Record<
        string,
        {
          feature: string;
          used: number;
          limit: number | null;
          remaining: number | null;
          unlimited: boolean;
          period: string;
          resets_at: string;
          resets_in_seconds: number;
        }
      >;
      plans: Record<
        string,
        {
          label: string;
          price_monthly: number;
          features: string[];
          limits: Record<string, number | null>;
        }
      >;
    }>('/billing/plan');
  }

  async upgradePlan(tier: string) {
    return this.request<{
      checkout_url: string | null;
      requested_tier: string | null;
      message: string;
    }>('/billing/upgrade', { method: 'POST', body: JSON.stringify({ tier }) });
  }

  // ── Learning Hub (Pillar B) ──────────────────────────────────
  /** Submit an AI study-plan generation job and poll until the plan is ready. */
  async createLearningPlan(topic: string, opts?: { target_role?: string; weeks?: number }) {
    const submit = await this.request<{ job_id: string }>(
      '/resume/learning/plan',
      {
        method: 'POST',
        body: JSON.stringify({ topic, ...opts }),
      },
      30000,
    );
    if (submit.error)
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    if (!submit.data?.job_id) return { error: 'Failed to start plan generation' };
    return this.pollJob<{ path_id: string; path: import('../types/learning').LearningPath }>(
      submit.data.job_id,
      150000,
    );
  }

  async getLearningPaths() {
    return this.request<{ paths: import('../types/learning').LearningPathSummary[] }>(
      '/resume/learning/paths',
    );
  }

  /**
   * Cross-user market TREND signal: learning topics ranked by market demand ×
   * user gap × learnability (tilted by the user's real application outcomes).
   * Deterministic backend read - no async job. May return empty `items` with a
   * `note` when there isn't enough cross-user signal for the role yet.
   */
  async getLearningTrends(window = 90) {
    return this.request<import('../types/learning').LearningTrendsResult>(
      `/resume/learning/trends?window=${encodeURIComponent(window)}`,
    );
  }

  async getLearningPath(pathId: string) {
    return this.request<{
      path: import('../types/learning').LearningPath;
      progress: import('../types/learning').LearningProgress;
    }>(`/resume/learning/paths/${encodeURIComponent(pathId)}`);
  }

  async deleteLearningPath(pathId: string) {
    return this.request<{ ok: boolean }>(`/resume/learning/paths/${encodeURIComponent(pathId)}`, {
      method: 'DELETE',
    });
  }

  async completeLearningModule(pathId: string, week: number) {
    return this.request<import('../types/learning').ModuleCompletionResult>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}/module/${week}/complete`,
      { method: 'POST' },
      30000,
    );
  }

  async generateLearningQuiz(pathId: string, week: number) {
    return this.request<import('../types/learning').Quiz>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}/quiz`,
      { method: 'POST', body: JSON.stringify({ week }) },
      60000,
    );
  }

  // ── Sprint Learning Hub (/api/resume/hub/*) ──────────────────
  // The 14-day Jira-ticket sprint. DISTINCT from the study-plan methods above
  // (/resume/learning/*) — different backend, different data model. Types live
  // in ../types/hub, consumed by hooks/useHub.ts.

  /** The campaign map — ordered chapters with locked/active/completed state. */
  async getHubJourney(params?: import("../types/hub").HubPathParams) {
    return this.request<import("../types/hub").HubJourney>(
      `/resume/hub/journey${this.hubQuery(params)}`,
    );
  }

  /** Resolve a chapter's sprint path, kicking off generation if none exists yet.
   *  `season_id` picks a specific (unlocked) chapter; omitted → the active one.
   *  Returns the full path when ready, or {status:"generating", job_id} while
   *  the async job runs — useHubPath polls on the non-ready shape. */
  async getHubPath(params?: import("../types/hub").HubPathParams) {
    return this.request<
      import("../types/hub").HubPath | import("../types/hub").HubPathPending
    >("/resume/hub/start", {
      method: "POST",
      body: JSON.stringify(this.hubBody(params)),
    }, 30000);
  }

  async getHubAnalytics(params?: import("../types/hub").HubPathParams) {
    return this.request<import("../types/hub").HubAnalytics | { status: string }>(
      `/resume/hub/analytics${this.hubQuery(params)}`,
    );
  }

  async getHubAchievements() {
    return this.request<{ achievements: import("../types/hub").HubAchievement[] }>(
      "/resume/hub/achievements",
    );
  }

  async getHubRoles() {
    return this.request<import("../types/hub").HubRolesResponse>("/resume/hub/roles");
  }

  /** Submit a day for verification. `repoUrl` is the proof of work — a PUBLIC
   *  GitHub repo the backend grades against the ticket's acceptance criteria.
   *
   *  Grading downloads the repo and runs a PRO-tier judge (40-60s), so the
   *  backend queues an async job and we poll it — an inline request would blow
   *  the gateway timeout. */
  async submitHubDay(
    dayKey: string,
    note?: string,
    params?: import("../types/hub").HubPathParams,
    repoUrl?: string,
  ) {
    const submitResp = await this.request<{ job_id: string; status: string }>(
      `/resume/hub/day/${encodeURIComponent(dayKey)}/submit`,
      {
        method: "POST",
        body: JSON.stringify({
          ...this.hubBody(params),
          ...(note ? { note } : {}),
          ...(repoUrl ? { repo_url: repoUrl } : {}),
        }),
      },
      30000,
    );
    if (submitResp.error) {
      return {
        error: submitResp.error,
        status: submitResp.status,
        errorPayload: submitResp.errorPayload,
      };
    }
    if (!submitResp.data?.job_id) return { error: "Could not start verification" };
    return this.pollJob<import("../types/hub").HubSubmitResult>(
      submitResp.data.job_id,
      180000,
    );
  }

  async askHubMentor(body: {
    question: string;
    day_key?: string;
    history?: import("../types/hub").MentorMessage[];
    role?: string;
    difficulty?: string;
    season_id?: string;
  }) {
    return this.request<import("../types/hub").MentorAnswer>(
      "/resume/hub/mentor",
      { method: "POST", body: JSON.stringify(body) },
      60000,
    );
  }

  /** Minutes ahead of UTC (IST=+330) — the app's tz_offset_minutes convention.
   *  Drives the backend's local-midnight day-unlock math. */
  private hubTz() {
    return -new Date().getTimezoneOffset();
  }

  /** Chapter selection + admin preview + timezone, as a POST body. */
  private hubBody(params?: import("../types/hub").HubPathParams) {
    return {
      tz_offset_minutes: this.hubTz(),
      ...(params?.season_id ? { season_id: params.season_id } : {}),
      ...(params?.role ? { role: params.role } : {}),
      ...(params?.difficulty ? { difficulty: params.difficulty } : {}),
    };
  }

  /** Same, as a query string for hub GETs. */
  private hubQuery(params?: import("../types/hub").HubPathParams) {
    const qs = new URLSearchParams();
    qs.set("tz_offset_minutes", String(this.hubTz()));
    if (params?.season_id) qs.set("season_id", params.season_id);
    if (params?.role) qs.set("role", params.role);
    if (params?.difficulty) qs.set("difficulty", params.difficulty);
    return `?${qs.toString()}`;
  }

  // ── §6.6 Learning loop: "Your edge" ──────────────────────────
  // find trending gaps → adaptive plan → per-task GitHub + verify → share.

  /**
   * Surface 2-4 trending, closeable market differentiators.
   * Async (202 → poll). May return <2 with a `note`; 404 when the feature is
   * disabled for this account - callers should hide the whole surface then.
   */
  async findDifferentiators(): Promise<
    ApiResponse<import('../types/learning').DifferentiatorsResult>
  > {
    const submit = await this.request<{ job_id: string }>(
      '/resume/learning/differentiators',
      { method: 'POST', body: '{}' },
      30000,
    );
    if (submit.error)
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    if (!submit.data?.job_id) return { error: 'Could not find your edge' };
    return this.pollJob<import('../types/learning').DifferentiatorsResult>(
      submit.data.job_id,
      150000,
    );
  }

  /** Generate an adaptive practical plan for a picked differentiator + depth. */
  async generateEdgePlan(
    body: import('../types/learning').EdgePlanRequest,
  ): Promise<ApiResponse<import('../types/learning').EdgePlan>> {
    const submit = await this.request<{ job_id: string }>(
      '/resume/learning/plan',
      { method: 'POST', body: JSON.stringify(body) },
      30000,
    );
    if (submit.error)
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    if (!submit.data?.job_id) return { error: 'Could not build your plan' };
    return this.pollJob<import('../types/learning').EdgePlan>(submit.data.job_id, 180000);
  }

  /** Full edge path (tasks list) for reload/resume. */
  async getEdgePath(pathId: string) {
    return this.request<import('../types/learning').EdgePlan>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}`,
    );
  }

  /** Create/point a GitHub repo for a task; returns repo link or push steps. */
  async syncTaskGithub(pathId: string, taskRef: string) {
    return this.request<import('../types/learning').EdgeGithubSync>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}/task/${encodeURIComponent(taskRef)}/github`,
      { method: 'POST', body: '{}' },
      30000,
    );
  }

  /** Verify a task's proof (repo / PR / URL / writeup). Async (202 → poll). */
  async verifyTask(
    pathId: string,
    taskRef: string,
    body: import('../types/learning').EdgeVerifyRequest,
  ): Promise<ApiResponse<import('../types/learning').EdgeVerifyResult>> {
    const submit = await this.request<{ job_id: string }>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}/task/${encodeURIComponent(taskRef)}/verify`,
      { method: 'POST', body: JSON.stringify(body) },
      30000,
    );
    if (submit.error)
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    if (!submit.data?.job_id) return { error: 'Could not start verification' };
    return this.pollJob<import('../types/learning').EdgeVerifyResult>(submit.data.job_id, 150000);
  }

  /**
   * Draft a "share the win" post for a verified task. Async (202 → poll).
   * Returns 400 `not_verified` if called before the task is verified.
   */
  async draftWinPost(
    pathId: string,
    taskRef: string,
  ): Promise<ApiResponse<import('../types/learning').EdgePostDraft>> {
    const submit = await this.request<{ job_id: string }>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}/task/${encodeURIComponent(taskRef)}/post`,
      { method: 'POST', body: '{}' },
      30000,
    );
    if (submit.error)
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    if (!submit.data?.job_id) return { error: 'Could not draft your post' };
    return this.pollJob<import('../types/learning').EdgePostDraft>(submit.data.job_id, 150000);
  }

  /**
   * Publish a drafted win post. `manual` returns copy/open-LinkedIn info;
   * `auto` schedules with a 30-min hold (403 `upgrade_required` unless Premium+).
   */
  async publishWinPost(draftId: string, body: { mode: 'manual' | 'auto'; variant_index: number }) {
    return this.request<import('../types/learning').EdgePublishResult>(
      `/resume/learning/posts/${encodeURIComponent(draftId)}/publish`,
      { method: 'POST', body: JSON.stringify(body) },
      30000,
    );
  }

  /** Cancel a scheduled (auto-held) win post before it goes out. */
  async cancelWinPost(scheduleId: string) {
    return this.request<{ ok: boolean; cancelled?: boolean }>(
      `/resume/learning/posts/${encodeURIComponent(scheduleId)}/cancel`,
      { method: 'POST', body: '{}' },
    );
  }

  // ── Interview Pattern Coach + salary (Pillar D) ──────────────
  async getInterviewCoach() {
    return this.request<import('../types/interview').CoachSummary>(
      '/resume/interview/coach',
      {},
      45000,
    );
  }

  async getInterviewAttempts(limit = 50) {
    return this.request<{ attempts: import('../types/interview').InterviewAttempt[] }>(
      `/resume/interview/attempts?limit=${limit}`,
    );
  }

  async getInterviewFit(recordId: string) {
    return this.request<import('../types/interview').InterviewFit>(
      '/resume/interview/fit',
      { method: 'POST', body: JSON.stringify({ record_id: recordId }) },
      45000,
    );
  }

  async getSalaryEstimate(role: string, opts?: { level?: string; location?: string }) {
    return this.request<import('../types/interview').SalaryEstimate>(
      '/resume/salary',
      { method: 'POST', body: JSON.stringify({ role, ...opts }) },
      45000,
    );
  }

  // ── Events (hackathons/webinars) + post drafting (Pillar C) ──
  async getEvents(type?: 'hackathon' | 'webinar') {
    const qs = type ? `?type=${type}` : '';
    return this.request<{ events: import('../types/events').EventItem[] }>(`/resume/events${qs}`);
  }

  async refreshEvents() {
    const submit = await this.request<{ job_id: string }>(
      '/resume/events/refresh',
      { method: 'POST' },
      30000,
    );
    if (submit.error) return { error: submit.error, status: submit.status };
    if (!submit.data?.job_id) return { error: 'Could not start refresh' };
    return this.pollJob<{ upserted: number; by_source: Record<string, number> }>(
      submit.data.job_id,
      90000,
    );
  }

  async getEvent(eventId: string) {
    return this.request<import('../types/events').EventItem>(
      `/resume/events/${encodeURIComponent(eventId)}`,
    );
  }

  async setEventRelation(
    eventId: string,
    relation: import('../types/events').EventRelation,
    opts?: { outcome?: string; notes?: string },
  ) {
    return this.request<{ event_id: string; relation: string }>(
      `/resume/events/${encodeURIComponent(eventId)}/relation`,
      { method: 'POST', body: JSON.stringify({ relation, ...opts }) },
    );
  }

  async draftPost(input: {
    event_id?: string;
    achievement?: string;
    audience?: string;
    relation?: string;
  }) {
    const submit = await this.request<{ job_id: string }>(
      '/resume/events/draft-post',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      30000,
    );
    if (submit.error)
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    if (!submit.data?.job_id) return { error: 'Could not start drafting' };
    return this.pollJob<{ draft_id: string; variants: import('../types/events').PostVariant[] }>(
      submit.data.job_id,
      120000,
    );
  }

  async getPosts() {
    return this.request<{ posts: import('../types/events').PostDraft[] }>('/resume/posts');
  }

  // ── Personalized recommendations (Pillar A) ──────────────────
  async getRecommendations() {
    return this.request<{ recommendations: import('../types/recommendations').Recommendation[] }>(
      '/resume/recommendations',
    );
  }

  // ── Cross-feature dashboard overview (interconnection layer) ──
  async getOverview() {
    return this.request<import('../types/overview').DashboardOverview>('/resume/overview');
  }

  // ── Career Readiness Score (the Compass spine) ──
  async getCareerReadiness() {
    return this.request<import('../types/career').CareerReadiness>('/resume/career-readiness');
  }

  async getGithub() {
    return this.request<{
      linked: boolean;
      profile: import('../types/career').GithubProfile | null;
    }>('/resume/github');
  }

  async linkGithub(username: string) {
    return this.request<{ linked: boolean; profile: import('../types/career').GithubProfile }>(
      '/resume/github/link',
      { method: 'POST', body: JSON.stringify({ username }) },
    );
  }

  async auditLinkedin(linkedinUrl: string) {
    return this.request<import('../types/career').LinkedinAudit>('/resume/linkedin/audit', {
      method: 'POST',
      body: JSON.stringify({ linkedin_url: linkedinUrl }),
    });
  }

  // ── Connect & act: GitHub / LinkedIn OAuth integrations ──────
  async getConnectStatus() {
    return this.request<import('../types/career').ConnectStatus>('/resume/connect/status');
  }

  async getConnectAuthorizeUrl(provider: 'github' | 'linkedin') {
    return this.request<{ authorize_url: string }>(`/resume/connect/${provider}/authorize`);
  }

  async disconnectProvider(provider: 'github' | 'linkedin') {
    return this.request<{ ok: boolean }>(`/resume/connect/${provider}/disconnect`, {
      method: 'POST',
    });
  }

  async publishGithubProject(payload: { name: string; description?: string; kind?: string }) {
    return this.request<{ repo_url: string; files: string[] }>(
      '/resume/connect/github/publish',
      { method: 'POST', body: JSON.stringify(payload) },
      30000,
    );
  }

  async postToLinkedin(text: string) {
    return this.request<{ post_url: string | null; post_id: string | null }>(
      '/resume/connect/linkedin/post',
      { method: 'POST', body: JSON.stringify({ text }) },
      30000,
    );
  }

  async getVisaProfile() {
    return this.request<{ profile: import('../types/visa').VisaProfile }>('/resume/visa/profile', {
      method: 'GET',
    });
  }

  async saveVisaProfile(profile: import('../types/visa').VisaProfile) {
    return this.request<{ ok: boolean; profile: import('../types/visa').VisaProfile }>(
      '/resume/visa/profile',
      { method: 'PUT', body: JSON.stringify(profile) },
    );
  }

  async getVisaTimeline() {
    return this.request<{
      profile: import('../types/visa').VisaProfile;
      milestones: import('../types/visa').VisaMilestone[];
      recommendation?: string;
    }>('/resume/visa/timeline', { method: 'GET' });
  }

  /** OPT Clock - the calm unemployment-days runway payload (no polling). */
  async optClock() {
    return this.request<import('../types/visa').OptClock>('/resume/opt-clock', { method: 'GET' });
  }

  async getMorningBrief() {
    return this.request<{
      ok: boolean;
      briefing: {
        headline: string;
        lines: string[];
        counts: Record<string, number>;
        generated_at: string;
      };
    }>('/resume/beta/morning-brief', { method: 'GET' });
  }

  async findSimilarRoles(jdText: string, limit = 10) {
    return this.request<{
      ok: boolean;
      seed_tokens?: string[];
      results?: Array<{
        source: string;
        title: string;
        company: string;
        location?: string;
        url?: string;
        score_overlap: number;
        status?: string;
      }>;
      error?: string;
    }>(
      '/resume/beta/similar-roles',
      { method: 'POST', body: JSON.stringify({ jd_text: jdText, limit }) },
      30000,
    );
  }

  async getAbTelemetry() {
    return this.request<{
      ok: boolean;
      has_tagged_data: boolean;
      total_apps: number;
      variants: Array<{
        variant: string;
        total: number;
        interviewed: number;
        offers: number;
        callback_rate: number;
      }>;
      insight?: string;
    }>('/resume/beta/ab-telemetry', { method: 'GET' });
  }

  async checkEmail(email: string) {
    return this.request<{ exists: boolean }>('/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async validatePassword(email: string, password: string) {
    return this.request<{ valid: boolean }>('/auth/validate-password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // ============================================
  // Guest onboarding (/api/resume/guest/*, /api/jobs/guest/*)
  //
  // Contract: jobpilot-backend/docs/specs/guest-onboarding.md (v2).
  // These endpoints are unauthenticated BY DESIGN (skipAuth) - guest failures
  // are 400/404/410/429/503, NEVER 401. A 429 with { quota_exhausted: true },
  // { error: "capacity" }, or { error: "challenge_required" } is a conversion
  // CTA, not an error. The ONE exception is guestClaim, which is JWT'd (it
  // moves guest work into the freshly-authenticated account).
  // Rides existing edge routes (/api/resume/*, /api/jobs/*) - no new prefix.
  // ============================================

  /**
   * Kick off guest resume parsing: multipart file (pdf/docx, ≤5MB) +
   * fingerprint_hash (+ optional pre-existing guest_id + device_token).
   * → 202 { guest_id, job_id, device_token }; caller persists both ids and
   * polls guestJobPoll.
   */
  async guestOnboard(
    file: File,
    fingerprintHash: string,
    guestId?: string,
    deviceToken?: string,
  ): Promise<ApiResponse<import('../types/guest').GuestOnboardSubmit>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fingerprint_hash', fingerprintHash);
    if (guestId) formData.append('guest_id', guestId);
    if (deviceToken) formData.append('device_token', deviceToken);
    const url = `${this.baseURL}/resume/guest/onboard`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      // Deliberately NO Authorization header - guest capability endpoint.
      // credentials:"include" so the response's Secure/HttpOnly guest cookie
      // (Path=/api) is stored, and so an existing one is presented.
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          ...(guestId ? { 'X-Guest-Id': guestId } : {}),
          ...(deviceToken ? { 'X-Guest-Device-Token': deviceToken } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          error: data.error || data.message || `HTTP ${response.status}`,
          status: response.status,
          errorPayload: data,
        };
      }
      return { data, status: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Upload timed out. Please try again.' };
      }
      return {
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Poll a guest-scoped async job (parse or tailor) - reuses the pollJob
   * machinery against GET /resume/guest/job/<id>?guest_id= (no JWT). The
   * backend mirrors the /resume/job/<id> response shape by contract.
   */
  async guestJobPoll<T>(
    jobId: string,
    guestId: string,
    maxWaitMs = 180000,
    signal?: AbortSignal,
    onStatus?: (status: import('../types/resume').JobStatus) => void,
    // Honest sub-phase marker the backend writes into job.result.progress
    // while processing (v3: guest_parse + guest_matches emit phases).
    // Additive/optional - existing callers are unaffected.
    onProgress?: (p: import('../types/guest').GuestJobProgress) => void,
    // v5 additive: the RAW partially-written job.result on every processing
    // tick, so callers can assemble real content progressively instead of
    // parking on a spinner. The worker may write nothing partial at all - in
    // that case this simply never fires and behavior is unchanged.
    onPartial?: (partial: T) => void,
  ): Promise<ApiResponse<T>> {
    return this.pollJob<T>(
      jobId,
      maxWaitMs,
      signal,
      onProgress || onPartial
        ? (partial) => {
            if (onProgress) {
              const p = (
                partial as {
                  progress?: import('../types/guest').GuestJobProgress;
                }
              ).progress;
              if (p?.phase) onProgress(p);
            }
            onPartial?.(partial);
          }
        : undefined,
      onStatus,
      {
        // v6: the capability rides the cookie + X-Guest-Id header, NEVER the
        // URL. Do not re-add ?guest_id= - it leaks into edge access logs.
        endpoint: (id) => `/resume/guest/job/${encodeURIComponent(id)}`,
        guest: { guestId },
      },
    );
  }

  /**
   * GET /resume/guest/session - session lookup + soft identity recognition.
   * Device/fingerprint-only recognition answers { exists:false,
   * recognized:true } with NO name; `recognized_name` appears only on a
   * guest_id-proven session with a parsed resume (spec v2).
   *
   * v6: guest_id and device_token are capabilities and travel as cookie +
   * headers. `fingerprint_hash` stays a query param - it proves nothing and
   * grants nothing, it is only a recognition signal.
   */
  async guestSession(guestId?: string, fingerprintHash?: string, deviceToken?: string) {
    const params = new URLSearchParams();
    if (fingerprintHash) params.set('fingerprint_hash', fingerprintHash);
    const qs = params.toString();
    return this.request<import('../types/guest').GuestSession>(
      `/resume/guest/session${qs ? `?${qs}` : ''}`,
      {},
      undefined,
      { guest: { guestId, deviceToken } },
    );
  }

  /**
   * POST /resume/guest/tailor - v2 payload is { guest_id, match_id,
   * device_token? } ONLY: match_id must come from the served match cards and
   * the JD is resolved server-side (never a client-supplied URL/text).
   * → 202 { job_id, tailors_used, tailors_limit } (fresh atomic reservation)
   * or 200 { job_id, existing:true, ... } (idempotent retry, same match);
   * caller polls guestJobPoll either way. 429 variants (quota_exhausted /
   * capacity / challenge_required) are conversion CTAs, never errors.
   */
  async guestTailor(payload: { guest_id: string; match_id: string; device_token?: string }) {
    // The submit response carries the server-confirmed quota numbers
    // (tailors_used / tailors_limit) - callers update the meter from it
    // immediately; the completed job result does NOT repeat them.
    return this.request<import('../types/guest').GuestTailorSubmit>(
      '/resume/guest/tailor',
      { method: 'POST', body: JSON.stringify(payload) },
      30000,
      // Body values stay (an explicitly-supplied capability skips the backend
      // CSRF check); the transport adds the cookie + headers.
      { guest: { guestId: payload.guest_id, deviceToken: payload.device_token } },
    );
  }

  /**
   * POST /resume/guest/download - issue a short-lived (≈15 min) download
   * capability token for a tailoring record owned by this exact guest_id.
   * → 200 { token, expires_at, formats }. Unlimited re-issue; downloads
   * never consume tailor quota (both formats = the same single tailor).
   */
  async guestDownloadIssue(
    guestId: string,
    recordId: string,
    format: import('../types/guest').GuestDownloadFormat,
  ) {
    return this.request<import('../types/guest').GuestDownloadGrant>(
      '/resume/guest/download',
      {
        method: 'POST',
        body: JSON.stringify({
          guest_id: guestId,
          record_id: recordId,
          format,
        }),
      },
      30000,
      { guest: { guestId } },
    );
  }

  /**
   * URL for GET /resume/guest/download/<token> - streams the rendered
   * PDF/DOCX. The token IS the capability: no auth header needed, so callers
   * trigger the download with a plain anchor pointing here.
   */
  guestDownloadUrl(token: string): string {
    return `${this.baseURL}/resume/guest/download/${encodeURIComponent(token)}`;
  }

  /**
   * POST /resume/guest/challenge/verify - redeem a solved anti-abuse
   * challenge, closing the loop opened by a
   * `429 { error:"challenge_required", provider, challenge_id }` from
   * onboard / matches / tailor. On success the server clears the velocity
   * counter that tripped, so the caller RETRIES the original request.
   *
   * Failure is ALWAYS 400 with a code (challenge_expired /
   * challenge_already_used / challenge_subject_mismatch /
   * challenge_solution_rejected / challenge_invalid) - never 401. This call is
   * skipAuth by construction, so it can never reach the 401 force-logout path:
   * a rejected CAPTCHA is not a session problem.
   */
  async guestChallengeVerify(
    challengeId: string,
    solution: string,
    guestId?: string,
  ): Promise<ApiResponse<import('../types/guest').GuestChallengeVerified>> {
    return this.request<import('../types/guest').GuestChallengeVerified>(
      '/resume/guest/challenge/verify',
      {
        method: 'POST',
        // guest_id in the body is an explicitly-supplied value, which is what
        // lets the backend skip the ambient-cookie CSRF check.
        body: JSON.stringify({
          challenge_id: challengeId,
          solution,
          ...(guestId ? { guest_id: guestId } : {}),
        }),
      },
      20000,
      { guest: { guestId } },
    );
  }

  /**
   * POST /resume/guest/claim - JWT REQUIRED (the only authed guest call).
   * Moves the guest session's resume + tailors into the current account.
   * Idempotent server-side (claimed guard; carry-in happens once).
   */
  async guestClaim(guestId: string) {
    return this.request<import('../types/guest').GuestClaimResult>(
      '/resume/guest/claim',
      { method: 'POST', body: JSON.stringify({ guest_id: guestId }) },
      30000,
    );
  }

  /**
   * POST /jobs/guest/matches - direct-source job matching against the parsed
   * guest resume. High-confidence only (score ≥ admin knob, capped, sorted
   * desc). ASYNC on cache miss: 202 { job_id } → poll the guest job route
   * until the matches result lands; same-day repeat calls answer 200 with the
   * cached result directly ({ cached: true }). Scanning can take a while  -
   * callers should show staged progress, not a bare spinner.
   */
  async guestMatches(
    guestId: string,
    deviceToken?: string,
    signal?: AbortSignal,
    onStatus?: (status: import('../types/resume').JobStatus) => void,
    // v3: guest_matches emits reading_resume/searching_sources/ranking/
    // finalizing progress markers - forwarded on every poll tick.
    onProgress?: (p: import('../types/guest').GuestJobProgress) => void,
    // v4: seniority view over the day's scanned pool. With a cached pool the
    // server answers 200 instantly (re-slice, no re-scan, no quota).
    seniority?: import('../types/guest').GuestSeniority,
    // v5: stable PARTIAL job batches. The worker persists scored rows into
    // job.result as it goes, so the cards can assemble while the scan runs.
    // Purely additive and fully defensive - if the backend never writes a
    // partial `jobs` array this never fires and the completed payload stays
    // the sole authority.
    onPartialJobs?: (jobs: import('../types/guest').GuestJobMatch[]) => void,
  ): Promise<ApiResponse<import('../types/guest').GuestMatchesResult>> {
    const body: Record<string, unknown> = {
      guest_id: guestId,
      // Viewer timezone: "posted today" is the USER's calendar day.
      tz_offset_minutes: -new Date().getTimezoneOffset(),
    };
    if (deviceToken) body.device_token = deviceToken;
    if (seniority) body.seniority = seniority;
    const submit = await this.request<
      import('../types/guest').GuestMatchesResult | { job_id: string }
    >(
      '/jobs/guest/matches',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      30000,
      { guest: { guestId, deviceToken } },
    );
    if (submit.error) {
      return {
        error: submit.error,
        status: submit.status,
        errorPayload: submit.errorPayload,
      };
    }
    if ('job_id' in (submit.data || {})) {
      return this.guestJobPoll<import('../types/guest').GuestMatchesResult>(
        (submit.data as { job_id: string }).job_id,
        guestId,
        300000,
        signal,
        onStatus,
        onProgress,
        onPartialJobs
          ? (partial) => {
              const jobs = (partial as { jobs?: unknown }).jobs;
              if (Array.isArray(jobs) && jobs.length > 0) {
                onPartialJobs(jobs as import('../types/guest').GuestJobMatch[]);
              }
            }
          : undefined,
      );
    }
    return submit as ApiResponse<import('../types/guest').GuestMatchesResult>;
  }

  // ============================================
  // Health check
  // ============================================

  async healthCheck() {
    return this.request<{
      status: string;
      service: string;
      version: string;
    }>('/health', {
      method: 'GET',
    });
  }

  // ============================================
  // Job Search endpoints (/api/jobs)
  // ============================================

  async searchJobs(
    params: {
      q: string;
      page?: number;
      location?: string;
      date_posted?: string;
      remote?: boolean;
      type?: string;
      h1b_only?: boolean;
      visa_or_contract?: boolean;
      experience_level?: string;
      source?: string;
      include_company_careers?: boolean;
      use_resume_recommendations?: boolean;
      force_refresh?: boolean;
      visa_filters?: import('../types/jobs').VisaFilters;
    },
    onPartial?: (partial: import('../types/jobs').JobSearchResponse) => void,
  ) {
    const searchParams = new URLSearchParams();
    searchParams.set('q', params.q);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.location) searchParams.set('location', params.location);
    if (params.date_posted) searchParams.set('date_posted', params.date_posted);
    if (params.remote) searchParams.set('remote', 'true');
    if (params.type) searchParams.set('type', params.type);
    if (params.h1b_only) searchParams.set('h1b_only', 'true');
    if (params.visa_or_contract) searchParams.set('visa_or_contract', 'true');
    if (params.experience_level) searchParams.set('experience_level', params.experience_level);
    if (params.source) searchParams.set('source', params.source);
    searchParams.set('include_company_careers', params.include_company_careers ? 'true' : 'false');
    searchParams.set(
      'use_resume_recommendations',
      params.use_resume_recommendations ? 'true' : 'false',
    );
    if (params.force_refresh) searchParams.set('force_refresh', 'true');
    // Serialize visa toggles as a compact JSON blob (only the truthy ones) so
    // the backend can parse one param instead of colliding with existing names.
    if (params.visa_filters) {
      const active = Object.fromEntries(Object.entries(params.visa_filters).filter(([, v]) => v));
      if (Object.keys(active).length > 0) {
        searchParams.set('visa_filters', JSON.stringify(active));
      }
    }
    const submitResp = await this.request<
      { job_id: string } | import('../types/jobs').JobSearchResponse
    >(`/jobs/search?${searchParams.toString()}`);
    if (submitResp.error) return { error: submitResp.error };
    if ('job_id' in (submitResp.data || {})) {
      return this.pollJob<import('../types/jobs').JobSearchResponse>(
        (submitResp.data as { job_id: string }).job_id,
        300000,
        undefined,
        onPartial,
      );
    }
    return submitResp as ApiResponse<import('../types/jobs').JobSearchResponse>;
  }

  async batchSearchJobs(
    params: import('../types/jobs').BatchSearchParams,
    onPartial?: (partial: import('../types/jobs').BatchSearchResponse) => void,
  ) {
    const submitResp = await this.request<
      { job_id: string } | import('../types/jobs').BatchSearchResponse
    >(
      '/jobs/batch-search',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      30000,
    );
    if (submitResp.error) return { error: submitResp.error };
    if ('job_id' in (submitResp.data || {})) {
      return this.pollJob<import('../types/jobs').BatchSearchResponse>(
        (submitResp.data as { job_id: string }).job_id,
        300000,
        undefined,
        onPartial,
      );
    }
    return submitResp as ApiResponse<import('../types/jobs').BatchSearchResponse>;
  }

  /* --- APIFY DISABLED (temporary): BYO Apify-key API calls turned off.
  Restore this block to re-enable.
  async getApifyKey() {
  return this.request<import("../types/jobs").ApifyKeyStatus>(
  "/jobs/apify-key",
  { method: "GET" },
  );
  }

  async setApifyKey(apifyKey: string) {
  return this.request<import("../types/jobs").ApifyKeyStatus & { ok: boolean }>(
  "/jobs/apify-key",
  {
  method: "PUT",
  body: JSON.stringify({ apify_key: apifyKey }),
  },
  );
  }

  async deleteApifyKey() {
  return this.request<{ ok: boolean; has_key: boolean }>(
  "/jobs/apify-key",
  { method: "DELETE" },
  );
  }
  --- APIFY DISABLED (temporary) --- */

  async suggestPipelineFilters() {
    return this.request<{ suggestions: import('../types/jobs').SmartFilterSuggestions; cached?: boolean }>(
      '/jobs/pipeline/suggest-filters',
      { method: 'GET' },
      45000,
    );
  }

  async getTitleSeed() {
    return this.request<import('../types/jobs').JobTitleSeed>('/jobs/title-seed');
  }

  async pipelineMatchScores(items: Array<{ id: string; title?: string; description?: string }>) {
    // Deterministic regex match against the user's parsed resume skills.
    // Fast (no LLM), so a 100-row batch lands in well under a second; the
    // caller fires this once per pipeline run.
    return this.request<{
      scores: Record<
        string,
        {
          match_score: number;
          matched_skills: string[];
          missing_top: string[];
          explain: string;
        }
      >;
      meta: { resume_skill_count: number; has_resume: boolean };
    }>('/jobs/pipeline/match-scores', { method: 'POST', body: JSON.stringify({ items }) }, 30000);
  }

  async fetchJobDescription(url: string) {
    // 45s - the backend tries direct strategies (~12s budget each) then falls
    // back to Apify's browser-rendered scrape (~30s). 20s was leaving Apify
    // results on the floor for LinkedIn / Workday SPA postings.
    return this.request<{ ok: boolean; jd_text?: string; source_kind?: string; error?: string }>(
      '/jobs/fetch-jd',
      { method: 'POST', body: JSON.stringify({ url }) },
      45000,
    );
  }

  async draftOutreach(input: {
    company: string;
    title: string;
    location?: string;
    jd_text?: string;
    tone?: 'warm' | 'direct';
  }) {
    return this.request<{ subject: string; body: string }>(
      '/jobs/draft-outreach',
      { method: 'POST', body: JSON.stringify(input) },
      30000,
    );
  }

  async listPipelinePresets() {
    return this.request<{ presets: import('../types/jobs').PipelinePreset[] }>(
      '/jobs/pipeline/presets',
      { method: 'GET' },
    );
  }

  async savePipelinePreset(name: string, filters: import('../types/jobs').DailyPipelineParams) {
    return this.request<{ ok: boolean; presets: import('../types/jobs').PipelinePreset[] }>(
      '/jobs/pipeline/presets',
      {
        method: 'POST',
        body: JSON.stringify({ name, filters }),
      },
    );
  }

  async deletePipelinePreset(name: string) {
    return this.request<{ ok: boolean; presets: import('../types/jobs').PipelinePreset[] }>(
      `/jobs/pipeline/presets/${encodeURIComponent(name)}`,
      { method: 'DELETE' },
    );
  }

  async runDailyPipeline(
    params: import('../types/jobs').DailyPipelineParams,
    onPartial?: (partial: import('../types/jobs').DailyPipelineResult) => void,
  ): Promise<ApiResponse<import('../types/jobs').DailyPipelineResult>> {
    const submitResp = await this.request<{ job_id: string }>(
      '/jobs/pipeline',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      30000,
    );
    if (submitResp.error) return { error: submitResp.error };
    if (!submitResp.data?.job_id) return { error: 'Failed to start pipeline' };
    return this.pollJob<import('../types/jobs').DailyPipelineResult>(
      submitResp.data.job_id,
      900000,
      undefined,
      onPartial,
    );
  }

  async analyzeJob(
    job: import('../types/jobs').Job,
    action: 'summarize' | 'missing_skills' | 'cover_letter',
  ) {
    return this.request<{ result: string; action: string }>('/jobs/analyze', {
      method: 'POST',
      body: JSON.stringify({ job, action }),
    });
  }

  async checkJobTrust(job: import('../types/jobs').Job) {
    return this.request<import('../types/jobs').JobTrustResult>('/jobs/trust-check', {
      method: 'POST',
      body: JSON.stringify({ job }),
    });
  }

  async uploadResume(
    file: File,
  ): Promise<ApiResponse<{ resume: import('../types/jobs').ParsedResume }>> {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.getToken();
    const url = `${this.baseURL}/jobs/resume`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { error: data.error || `HTTP ${response.status}` };
      emitResumeSetChanged();
      return { data } as ApiResponse<{
        resume: import('../types/jobs').ParsedResume;
      }>;
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  async getResume() {
    return this.request<{ resume: import('../types/jobs').ParsedResume }>('/jobs/resume');
  }

  async tailorResume(jobDescription: string) {
    const response = await this.request<{ tailored: import('../types/jobs').TailoredResume; job_id?: string }>(
      '/jobs/tailor-resume',
      {
        method: 'POST',
        body: JSON.stringify({ job_description: jobDescription }),
      },
      30000,
    );
    if (!response.data?.job_id) return response;
    const completed = await this.pollJob<import('../types/resume').TailorPipelineResult>(response.data.job_id, 300000);
    if (!completed.data) return { error: completed.error || 'Tailoring failed' };
    const resume = completed.data.tailored_resume;
    return { data: { tailored: { summary: resume.summary,
      skills: Object.values(resume.skills).flat(),
      experience_bullets: resume.experience.flatMap(e => e.bullets), keywords_to_add: [] } } };
  }

  async getSavedJobs() {
    return this.request<{ jobs: import('../types/jobs').SavedJob[] }>('/jobs/saved');
  }

  async getJobFilters() {
    return this.request<import('../types/jobs').SavedJobFilters>('/jobs/filters');
  }

  async saveJobFilters(filters: import('../types/jobs').JobSearchFilters) {
    return this.request<import('../types/jobs').SavedJobFilters>('/jobs/filters', {
      method: 'PUT',
      body: JSON.stringify({ filters }),
    });
  }

  async saveJob(job: import('../types/jobs').Job) {
    return this.request<{ job: import('../types/jobs').SavedJob }>('/jobs/saved', {
      method: 'POST',
      body: JSON.stringify({ job }),
    });
  }

  async updateSavedJob(jobId: string, data: { status?: string; notes?: string }) {
    return this.request<{ job: import('../types/jobs').SavedJob }>(`/jobs/saved/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async touchJobPipeline(
    job: import('../types/jobs').Job,
    intent: 'saved' | 'opened' | 'applied' | 'tailor_started',
  ) {
    return this.request<{ job: import('../types/jobs').SavedJob }>('/jobs/tracker', {
      method: 'POST',
      body: JSON.stringify({ job, intent }),
    });
  }

  async deleteSavedJob(jobId: string) {
    return this.request<{ message: string }>(`/jobs/saved/${jobId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Per-company visa-sponsorship signal. Note: every job in a `searchJobs`
   * result already carries `job.sponsorship` (same shape), so this is only
   * needed for company-detail views that don't come from a search.
   */
  async getSponsorship(company: string) {
    return this.request<{
      company: string;
      sponsorship: import('../types/jobs').SponsorshipSignal | null;
    }>(`/jobs/sponsorship?company=${encodeURIComponent(company)}`);
  }

  // ============================================
  // Resume Parser endpoints (/api/resume)
  // - Async job pattern: submit -> poll -> result
  // ============================================

  async getResumeStatus() {
    return this.request<import('../types/resume').ResumeStatus>('/resume/status');
  }

  async uploadResumeForParser(
    file: File,
    // signal: cancellation from the caller (e.g. onboarding "Cancel"/close).
    // Aborts BOTH the upload fetch and the subsequent poll.
    signal?: AbortSignal,
  ): Promise<ApiResponse<{ resume: import('../types/jobs').ParsedResume }>> {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.getToken();
    const url = `${this.baseURL}/resume/upload`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const onExternalAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', onExternalAbort);
    }
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onExternalAbort);
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        if (token) {
          this.logout();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:session-expired'));
          }
        }
        return { error: 'Session expired. Please sign in again.' };
      }
      // Resume Platform v3 upload failures - map the machine-readable error
      // codes to user-safe copy (these are operational failures, not auth).
      if (response.status === 503 && data.error === 'storage_unavailable') {
        return {
          error: 'File storage is temporarily unavailable. Please try again in a few minutes.',
          status: 503,
          errorPayload: data,
        };
      }
      if (response.status === 413 || data.error === 'file_too_large') {
        return {
          error: 'File too large. The maximum size is 5 MB.',
          status: 413,
          errorPayload: data,
        };
      }
      if (!response.ok) return { error: data.error || `HTTP ${response.status}` };

      // Backend returns { job_id } with 202 - poll for the parsed result
      if (data.job_id) {
        const pollResult = await this.pollJob<{ parsed_resume: any }>(
          data.job_id,
          120000,
          signal,
        );
        if (pollResult.data) emitResumeSetChanged();
        return pollResult;
      }

      // Fallback: if backend returns the resume directly (shouldn't happen, but safe)
      return { data } as ApiResponse<{ parsed_resume: any }>;
    } catch (error) {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onExternalAbort);
      if (signal?.aborted) return { error: 'Canceled' };
      return {
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Poll a resume job until it completes or fails.
   * - 30s timeout per individual poll request (handles cold Lambda starts)
   * - Retries up to 3 consecutive transient errors before bailing
   * - 120s hard limit total by default (callers can raise)
   * - Respects AbortSignal for cancellation
   * - Optional onPartial fires while the job is still processing so the
   *  caller can stream in partial results (e.g. job-search sources that
   *  have finished while others are still running).
   */
  private async pollJob<T>(
    jobId: string,
    maxWaitMs = 120000,
    signal?: AbortSignal,
    onPartial?: (partial: T) => void,
    // Fires on every poll tick with the raw backend job status (queued →
    // processing → completed/failed) so callers can drive a REAL progress
    // indicator instead of a wall-clock guess. Additive/optional - existing
    // callers are unaffected.
    onStatus?: (status: import('../types/resume').JobStatus) => void,
    // Guest onboarding reuses this exact machinery against the guest-scoped
    // job route (no JWT). Default stays the authed /resume/job/<id> endpoint;
    // existing callers are unaffected.
    pollOpts?: {
      endpoint?: (jobId: string) => string;
      skipAuth?: boolean;
      guest?: GuestCapability;
    },
  ): Promise<ApiResponse<T>> {
    const pollInterval = 2000;
    const startTime = Date.now();
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    while (Date.now() - startTime < maxWaitMs) {
      if (signal?.aborted) return { error: 'Canceled' };

      const resp = await this.request<{
        status: import('../types/resume').JobStatus;
        result?: T;
        error?: string;
        error_code?: string;
      }>(
        pollOpts?.endpoint ? pollOpts.endpoint(jobId) : `/resume/job/${jobId}`,
        {},
        30000,
        pollOpts?.guest
          ? { guest: pollOpts.guest, signal }
          : { skipAuth: pollOpts?.skipAuth, signal },
      );

      // A cancellation aborts the in-flight poll request; return promptly with a
      // clear canceled result rather than counting it as a transient error.
      if (signal?.aborted) return { error: 'Canceled' };

      if (resp.error) {
        consecutiveErrors++;
        if (consecutiveErrors >= maxConsecutiveErrors) {
          return { error: resp.error };
        }
        // Transient error (cold start / brief timeout) - wait and retry
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      }

      consecutiveErrors = 0;
      const job = resp.data;
      if (!job) return { error: 'Job not found' };

      // Report the real backend status before terminal-state handling so the
      // caller sees queued/processing transitions live. Never let a callback
      // error abort polling.
      if (onStatus) {
        try {
          onStatus(job.status);
        } catch {
          /* callback errors must never abort polling */
        }
      }

      if (job.status === 'completed' && job.result) {
        return { data: job.result as unknown as T };
      }

      if (job.status === 'failed') {
        if (job.error_code === 'LLM_RETRIES_EXHAUSTED') {
          // Fire the friendly, de-duped global toast, but ALSO return a
          // non-empty error so callers never mistake a failure for success
          // (the empty string used to slip past `if (res.error)` guards).
          notifyLLMRetriesExhausted();
          return {
            error: 'High demand right now. Please try again in a moment.',
            errorPayload: { error_code: 'LLM_RETRIES_EXHAUSTED' },
          };
        }
        return { error: job.error || 'Job failed. Please try again.' };
      }

      // Still processing - stream whatever partial result has been written.
      if (onPartial && job.result) {
        try {
          onPartial(job.result as unknown as T);
        } catch {
          // Callback errors should never abort polling.
        }
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return { error: 'Request timed out. Please try again.' };
  }

  async extractJD(
    jobDescription: string,
    signal?: AbortSignal,
  ): Promise<ApiResponse<{ jd_analysis: import('../types/resume').JDAnalysis }>> {
    const submitResp = await this.request<{ job_id: string }>(
      '/resume/extract-jd',
      {
        method: 'POST',
        body: JSON.stringify({ job_description: jobDescription }),
      },
      30000,
    );
    if (submitResp.error) return { error: submitResp.error };
    if (!submitResp.data?.job_id) return { error: 'Failed to submit job' };

    return this.pollJob<{ jd_analysis: import('../types/resume').JDAnalysis }>(
      submitResp.data.job_id,
      120000,
      signal,
    );
  }

  async tailorResumeForParser(
    jdAnalysis: import('../types/resume').JDAnalysis,
    signal?: AbortSignal,
  ): Promise<
    ApiResponse<{
      tailored_resume: import('../types/resume').TailoredFullResume;
    }>
  > {
    const submitResp = await this.request<{ job_id: string }>(
      '/resume/tailor',
      { method: 'POST', body: JSON.stringify({ jd_analysis: jdAnalysis }) },
      30000,
    );
    if (submitResp.error) return { error: submitResp.error };
    if (!submitResp.data?.job_id) return { error: 'Failed to submit job' };

    return this.pollJob<{
      tailored_resume: import('../types/resume').TailoredFullResume;
    }>(submitResp.data.job_id, 300000, signal);
  }

  // Combined endpoint: extracts JD analysis AND tailors the resume inside a
  // single Lambda invocation, returning both. Saves ~22s (no inter-job HTTP
  // round-trip) plus ~10s from parallel project generation. The legacy
  // extractJD + tailorResumeForParser pair remains available as a fallback.
  async tailorResumeWithJDText(
    jobDescription: string,
    signal?: AbortSignal,
    // Optional real-progress hooks - onStatus receives the backend job status
    // on every poll tick; onProgress receives the honest sub-phase marker the
    // backend writes into job.result.progress at each real pipeline stage.
    onStatus?: (status: import('../types/resume').JobStatus) => void,
    onProgress?: (p: import('../types/resume').TailorJobProgress) => void,
    sourceJobId?: string,
    options?: {
      resume_id?: string;
      selection_mode?: 'auto' | 'active';
    },
  ): Promise<
    ApiResponse<{
      jd_analysis: import('../types/resume').JDAnalysis;
      tailored_resume: import('../types/resume').TailoredFullResume;
      // Post-backfill base resume (present on new backends) - enables
      // diff-vs-base without a second round-trip.
      base_resume?: import('../types/resume').TailoredFullResume;
      // Resume Platform v3: the worker persists the tailoring record itself
      // and echoes its id - callers MUST pass this to saveTailoringRecord so
      // the settle is idempotent (never a duplicate record).
      record_id?: string;
      base_selection?: import('../types/resume').BaseResumeSelection;
    }>
  > {
    const submitResp = await this.request<{ job_id: string }>(
      '/resume/tailor-with-jd',
      {
        method: 'POST',
        body: JSON.stringify({
          job_description: jobDescription,
          ...(sourceJobId ? { source_job_id: sourceJobId } : {}),
          ...(options?.resume_id ? { resume_id: options.resume_id } : {}),
          ...(options?.selection_mode ? { selection_mode: options.selection_mode } : {}),
        }),
      },
      30000,
    );
    if (submitResp.error) {
      // Forward status + errorPayload so callers can detect 429
      // daily_quota_exceeded (and 403 upgrade_required) and surface the
      // right dialog. Previously we only forwarded the error string,
      // silently dropping the structured payload - quota dialog never fired.
      return {
        error: submitResp.error,
        status: submitResp.status,
        errorPayload: submitResp.errorPayload,
      };
    }
    if (!submitResp.data?.job_id) return { error: 'Failed to submit job' };

    return this.pollJob<{
      jd_analysis: import('../types/resume').JDAnalysis;
      tailored_resume: import('../types/resume').TailoredFullResume;
      base_resume?: import('../types/resume').TailoredFullResume;
      record_id?: string;
      base_selection?: import('../types/resume').BaseResumeSelection;
    }>(
      submitResp.data.job_id,
      300000,
      signal,
      // While processing, the only partial the tailor job writes is the
      // progress marker - forward it when present.
      (partial) => {
        const p = (partial as { progress?: import('../types/resume').TailorJobProgress }).progress;
        if (p?.phase && onProgress) onProgress(p);
      },
      onStatus,
    );
  }

  async confirmTailoringExperience(recordId: string, entity: string, text: string) {
    return this.request<{ fact_id: string; message: string }>(
      `/resume/records/${encodeURIComponent(recordId)}/experience`,
      { method: 'POST', body: JSON.stringify({ entity, text, confirmed: true }) },
    );
  }

  async regenerateResume(
    tailoredResume: import('../types/resume').TailoredFullResume,
    jdAnalysis: import('../types/resume').JDAnalysis,
    userFeedback: string,
    signal?: AbortSignal,
    // Resume Platform v3: naming the record lets the backend enforce the
    // 5-version cap up front (409 version_limit_reached) BEFORE spending an
    // LLM call whose result could never be saved.
    recordId?: string,
    resumeId?: string,
  ): Promise<
    ApiResponse<{
      tailored_resume: import('../types/resume').TailoredFullResume;
    }>
  > {
    const submitResp = await this.request<{ job_id: string }>(
      '/resume/regenerate',
      {
        method: 'POST',
        body: JSON.stringify({
          tailored_resume: tailoredResume,
          jd_analysis: jdAnalysis,
          user_feedback: userFeedback,
          record_id: recordId || undefined,
          ...(resumeId ? { resume_id: resumeId } : {}),
        }),
      },
      30000,
    );
    if (submitResp.error) {
      return {
        error: submitResp.error,
        status: submitResp.status,
        errorPayload: submitResp.errorPayload,
      };
    }
    if (!submitResp.data?.job_id) return { error: 'Failed to submit regeneration job' };

    return this.pollJob<{
      tailored_resume: import('../types/resume').TailoredFullResume;
    }>(submitResp.data.job_id, 300000, signal);
  }

  async rewriteBullet(
    bullet: string,
    jobTitle?: string,
    company?: string,
    jdKeywords?: string[],
  ): Promise<ApiResponse<{ rewritten: string }>> {
    const response = await this.request<{ rewritten: string; job_id?: string }>('/resume/rewrite-bullet', {
      method: 'POST',
      body: JSON.stringify({
        bullet,
        job_title: jobTitle || '',
        company: company || '',
        jd_keywords: jdKeywords || [],
      }),
    });
    if (!response.data?.job_id) return response;
    return this.pollJob<{ rewritten: string }>(response.data.job_id, 120000);
  }

  async fetchATSScores(
    tailoredResume: import('../types/resume').TailoredFullResume,
    jdAnalysis: import('../types/resume').JDAnalysis,
    signal?: AbortSignal,
    opts?: { recordId?: string; versionId?: string; format?: 'pdf' | 'docx'; idempotencyKey?: string },
  ): Promise<ApiResponse<{ ats_scores: import('../types/resume').ATSScores }>> {
    const submitResp = await this.request<{ job_id: string }>(
      '/resume/ats-scores',
      {
        method: 'POST',
        body: JSON.stringify({
          tailored_resume: tailoredResume,
          jd_analysis: jdAnalysis,
          record_id: opts?.recordId || '',
          version_id: opts?.versionId || '',
          format: opts?.format || 'pdf',
          idempotency_key: opts?.idempotencyKey || '',
        }),
      },
      30000,
    );
    if (submitResp.error) return { error: submitResp.error };
    if (!submitResp.data?.job_id) return { error: 'Failed to submit job' };

    return this.pollJob<{ ats_scores: import('../types/resume').ATSScores }>(
      submitResp.data.job_id,
      120000,
      signal,
    );
  }

  async verifyResume(
    tailoredResume: import('../types/resume').TailoredFullResume,
    jdAnalysis: import('../types/resume').JDAnalysis,
    opts?: { recordId?: string; resumeId?: string; signal?: AbortSignal },
  ): Promise<ApiResponse<{ verification: import('../types/resume').ResumeVerification }>> {
    const submitResp = await this.request<{ job_id: string }>(
      '/resume/verify',
      {
        method: 'POST',
        body: JSON.stringify({
          tailored_resume: tailoredResume,
          jd_analysis: jdAnalysis,
          record_id: opts?.recordId || '',
          resume_id: opts?.resumeId || '',
        }),
      },
      30000,
    );
    if (submitResp.error) return { error: submitResp.error };
    if (!submitResp.data?.job_id) return { error: 'Failed to submit verification' };
    return this.pollJob<{ verification: import('../types/resume').ResumeVerification }>(
      submitResp.data.job_id,
      120000,
      opts?.signal,
    );
  }

  trackCraftEvent(action: string, target?: string): void {
    void this.request('/resume/craft-event', {
      method: 'POST',
      body: JSON.stringify({ action, target: target || '' }),
    }).catch(() => undefined);
  }

  /**
   * Settle a tailoring session record. Resume Platform v3: the tailor worker
   * persists the record itself and returns `record_id` in the job result  -
   * ALWAYS echo that id here so the backend settles idempotently (attaches
   * ats_scores + fires the streak) instead of creating a duplicate record.
   */
  async saveTailoringRecord(data: {
    record_id?: string;
    jd_text?: string;
    jd_analysis?: any;
    tailored_resume?: any;
    ats_scores?: any;
    base_resume_filename?: string;
    source_job_id?: string;
  }): Promise<ApiResponse<{ record_id: string; updated?: boolean }>> {
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      tz = undefined;
    }
    return this.request('/resume/save-record', {
      method: 'POST',
      body: JSON.stringify({ ...data, tz }),
    });
  }

  // ============================================
  // Resume management endpoints
  // ============================================

  /**
   * List the user's uploaded resume assets (Resume Platform v3).
   * Rows are identified by `resume_id`; there is no s3_key on a row.
   * (GET /api/resume/generated is legacy/dead - it always returns [] on the
   * v3 database, so it is no longer called anywhere.)
   */
  async listBaseResumes(): Promise<
    ApiResponse<{ versions: import('../types/resume').ResumeAssetRow[] }>
  > {
    return this.request('/resume/versions');
  }

  /**
   * `view: 'list'` asks the backend to project server-side and return only the
   * fields a tracker row renders. Everything else on this endpoint still gets
   * the full shape, so interview prep and the tailored-resumes page are
   * unaffected.
   */
  async listTailoringRecords(
    opts: { view?: 'list' } = {},
  ): Promise<ApiResponse<{ records: import('../types/resume').TailoringRecord[] }>> {
    if (opts.view === 'list') {
      return this.request('/resume/tailoring-records?view=list');
    }
    type Page = {
      records: import('../types/resume').TailoringRecord[];
      next_offset?: number | null;
    };
    const records: Page['records'] = [];
    let offset = 0;
    while (true) {
      const response = await this.request<Page>(
        `/resume/tailoring-records?page_size=50&offset=${offset}`,
      );
      if (response.error || !response.data) return response;
      records.push(...(response.data.records || []));
      const next = response.data.next_offset;
      if (next == null) return { data: { records } };
      if (!Number.isInteger(next) || next <= offset) {
        return { error: 'Could not load the complete tailoring history. Please try again.' };
      }
      offset = next;
    }
  }

  async getApplicationStreak(): Promise<
    ApiResponse<{
      current_streak: number;
      longest_streak: number;
      today_count: number;
      total_applications: number;
      last_application_date: string | null;
      heatmap: { date: string; count: number }[];
    }>
  > {
    let tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      tz = '';
    }
    const qs = tz ? `?tz=${encodeURIComponent(tz)}` : '';
    return this.request(`/resume/streak${qs}`);
  }

  async batchTailor(
    jdList: { text: string; title: string; source_job_id?: string }[],
  ): Promise<ApiResponse<{ jobs: { job_id: string; title: string }[] }>> {
    return this.request(
      '/resume/batch-tailor',
      {
        method: 'POST',
        body: JSON.stringify({ jd_list: jdList }),
      },
      30000,
    );
  }

  async generateCoverLetter(
    tailoredResume: import('../types/resume').TailoredFullResume,
    jdAnalysis: import('../types/resume').JDAnalysis,
    signal?: AbortSignal,
  ): Promise<ApiResponse<{ cover_letter: string }>> {
    const submitResp = await this.request<{ job_id: string }>(
      '/resume/cover-letter',
      {
        method: 'POST',
        body: JSON.stringify({
          tailored_resume: tailoredResume,
          jd_analysis: jdAnalysis,
        }),
      },
      30000,
    );
    if (submitResp.error) {
      // Forward status + errorPayload so the caller can surface the upgrade
      // modal on 403 upgrade_required (cover letter is a gated feature).
      return {
        error: submitResp.error,
        status: submitResp.status,
        errorPayload: submitResp.errorPayload,
      };
    }
    if (!submitResp.data?.job_id) return { error: 'Failed to submit job' };

    return this.pollJob<{ cover_letter: string }>(submitResp.data.job_id, 120000, signal);
  }

  async downloadCoverLetterPDF(
    coverLetter: string,
    candidateName: string,
    jobTitle: string,
    company: string,
  ): Promise<{ data?: Blob; error?: string; filename?: string }> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const resp = await fetch(`${this.baseURL}/resume/cover-letter/download`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cover_letter: coverLetter,
          candidate_name: candidateName,
          job_title: jobTitle,
          company,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Download failed' }));
        return { error: err.error || 'Download failed' };
      }
      const blob = await resp.blob();
      const cd = resp.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="?([^"]+)"?/);
      return { data: blob, filename: match?.[1] || 'cover_letter.pdf' };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Download failed' };
    }
  }

  async pollJobStatus<T>(
    jobId: string,
  ): Promise<ApiResponse<T & { status: import('../types/resume').JobStatus }>> {
    const resp = await this.request<
      T & {
        status: import('../types/resume').JobStatus;
        error?: string;
        error_code?: string;
      }
    >(`/resume/job/${jobId}`);
    if (resp.data?.error_code === 'LLM_RETRIES_EXHAUSTED') {
      notifyLLMRetriesExhausted();
      resp.data = { ...resp.data, error: '' };
    }
    return resp;
  }

  async getTechChronicle(category: string = 'all'): Promise<
    ApiResponse<{
      items: import('../types/techChronicle').TechChronicleItem[];
      trendingTags: string[];
      generatedAt: string | null;
    }>
  > {
    return this.request(`/tech-chronicle?category=${encodeURIComponent(category)}`);
  }

  /**
   * PUT /api/resume/active {resume_id} (Resume Platform v3 - the s3_key form
   * is retired). Errors the caller should surface: 404 (unknown resume) and
   * 409 {"error":"resume_not_parsed"} when the asset has not finished parsing.
   */
  async setActiveResume(
    resumeId: string,
  ): Promise<ApiResponse<{ message: string; resume_id: string }>> {
    return this.request('/resume/active', {
      method: 'PUT',
      body: JSON.stringify({ resume_id: resumeId }),
    });
  }

  /** DELETE /api/resume/file/<resume_id> - deletes a resume asset (was s3_key). */
  async deleteResume(resumeId: string): Promise<ApiResponse<{ message: string }>> {
    const resp = await this.request<{ message: string }>(
      `/resume/file/${encodeURIComponent(resumeId)}`,
      { method: 'DELETE' },
    );
    if (resp.data) emitResumeSetChanged();
    return resp;
  }

  /**
   * Download an owned file. Resume Platform v3: pass a `resume_id` for an
   * original uploaded file; the legacy s3_key form still works for generated
   * files referenced from tailoring records.
   */
  async downloadResumeFile(resumeIdOrKey: string): Promise<Blob> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(
      `${this.baseURL}/resume/download-file/${encodeURIComponent(resumeIdOrKey)}`,
      {
        headers,
      },
    );
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
  }

  async downloadTailoredResume(
    tailoredResume: import('../types/resume').TailoredFullResume,
    jdAnalysis: import('../types/resume').JDAnalysis,
    format: 'pdf' | 'docx',
    opts?: {
      recordId?: string;
      versionId?: string;
      source?: 'initial' | 'regenerated' | 'edited';
      autoSaveOnEdit?: boolean;
    },
  ): Promise<{
    data?: Blob;
    error?: string;
    filename?: string;
    pages?: number;
    outcome?: string;
    fill_ratio?: number;
    dropped?: Array<{ kind?: string; preview?: string }>;
  }> {
    const token = this.getToken();
    const url = `${this.baseURL}/resume/download`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tailored_resume: tailoredResume,
          jd_analysis: jdAnalysis,
          format,
          job_title: jdAnalysis.job_title || 'untitled',
          record_id: opts?.recordId,
          version_id: opts?.versionId,
          source: opts?.source,
          auto_save_on_edit: opts?.autoSaveOnEdit ?? true,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        // Bounded refinement: downloads can auto-append a version; the 6th
        // distinct version is refused with 409 version_limit_reached.
        if (response.status === 409 && errData.error === 'version_limit_reached') {
          return { error: VERSION_LIMIT_MESSAGE };
        }
        return { error: errData.error || `HTTP ${response.status}` };
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `resume.${format}`;
      let dropped: Array<{ kind?: string; preview?: string }> = [];
      try {
        dropped = JSON.parse(response.headers.get('X-Resume-Dropped') || '[]');
      } catch {
        dropped = [];
      }
      return {
        data: blob,
        filename,
        pages: Number(response.headers.get('X-Resume-Pages') || '') || undefined,
        outcome: response.headers.get('X-Resume-Outcome') || undefined,
        fill_ratio: Number(response.headers.get('X-Resume-Fill-Ratio') || '') || undefined,
        dropped,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  // ============================================
  // Tailoring record versioning
  // ============================================

  async saveResumeVersion(
    recordId: string,
    data: {
      tailored_resume: import('../types/resume').TailoredFullResume;
      source: 'initial' | 'regenerated' | 'edited';
      user_feedback?: string;
      ats_scores?: import('../types/resume').ATSScores;
      /** Server assessment id — preferred over client-authored scores when v2 is on. */
      assessment_id?: string;
      parent_version_id?: string;
      set_current?: boolean;
    },
  ): Promise<
    ApiResponse<{
      version_id: string;
      version_number: number;
      content_hash: string;
      assessment_id?: string;
      created: boolean;
    }>
  > {
    return this.request(`/resume/tailoring-records/${recordId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async setCurrentResumeVersion(
    recordId: string,
    versionId: string,
  ): Promise<ApiResponse<{ current_version_id: string }>> {
    return this.request(`/resume/tailoring-records/${recordId}/current-version`, {
      method: 'PUT',
      body: JSON.stringify({ version_id: versionId }),
    });
  }

  async getTailoringRecord(
    recordId: string,
  ): Promise<ApiResponse<{ record: import('../types/resume').TailoringRecord }>> {
    return this.request(`/resume/tailoring-records/${recordId}`);
  }

  async deleteTailoringRecord(recordId: string): Promise<ApiResponse<any>> {
    return this.request(`/resume/tailoring-records/${recordId}`, {
      method: 'DELETE',
    });
  }

  async updateApplication(
    recordId: string,
    patch: {
        status?:
          'saved' | 'draft' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn' | 'ghosted';
      applied_at?: string | null;
      next_action_date?: string | null;
      next_action_note?: string;
      notes?: string;
      recruiter_name?: string;
      recruiter_email?: string;
      recruiter_company?: string;
      job_url?: string;
      interview_dates?: string[];
      /** Clears the "Did you apply?" prompt. Flow-agnostic name. */
      confirmation_pending?: boolean;
      /** Legacy batch-only name for the same flag; the backend mirrors both. */
      batch_confirmation_pending?: boolean;
      resume_used?: 'base' | 'tailored';
    },
  ): Promise<ApiResponse<{ application: import('../types/resume').ApplicationInfo }>> {
    // The backend freezes `applied_date` in the user's zone, so it needs to know
    // which zone that is. Sent on every patch (harmless when no date changes)
    // rather than only on applied, matching what save-record already does.
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      tz = undefined;
    }
    return this.request(`/resume/tailoring-records/${recordId}/application`, {
      method: 'PATCH',
      body: JSON.stringify(tz ? { ...patch, tz } : patch),
    });
  }

  async generateInterviewPrep(
    recordId: string,
    opts?: { force?: boolean },
  ): Promise<
    ApiResponse<{
      interview_prep: {
        content: import('../types/resume').InterviewPrepContent;
        generated_at: string;
        grounded_version_id?: string;
      };
      cached: boolean;
    }>
  > {
    return this.request(
      `/resume/tailoring-records/${recordId}/interview-prep`,
      {
        method: 'POST',
        body: JSON.stringify({ force: !!opts?.force }),
      },
      90000,
    );
  }

  async getPracticeQuestion(
    recordId: string,
    body: {
      category:
        | 'behavioral'
        | 'technical'
        | 'company'
        | 'coding'
        | 'system_design'
        | 'case_study'
        | 'data_challenge';
      difficulty: import('../types/resume').QDifficulty;
      seen_titles?: string[];
      focus?: string;
    },
  ): Promise<ApiResponse<{ category: string; difficulty: string; question: any }>> {
    return this.request(
      `/resume/tailoring-records/${recordId}/practice-question`,
      { method: 'POST', body: JSON.stringify(body) },
      60000,
    );
  }

  async chatWithCoach(
    recordId: string,
    message: string,
  ): Promise<ApiResponse<{ reply: string; messages: import('../types/resume').ChatMessage[] }>> {
    return this.request(
      `/resume/tailoring-records/${recordId}/chat`,
      { method: 'POST', body: JSON.stringify({ message }) },
      60000,
    );
  }

  async resetCoachChat(
    recordId: string,
  ): Promise<ApiResponse<{ messages: import('../types/resume').ChatMessage[] }>> {
    return this.request(`/resume/tailoring-records/${recordId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ reset: true }),
    });
  }

  async getCoachChat(
    recordId: string,
  ): Promise<ApiResponse<{ messages: import('../types/resume').ChatMessage[] }>> {
    return this.request(`/resume/tailoring-records/${recordId}/chat`);
  }

  // --- Career Copilot (multi-agent RAG + playground) /api/resume/career-copilot ---

  async getCareerCopilotState(): Promise<
    ApiResponse<{
      has_resume: boolean;
      messages: Array<{
        role: string;
        content: string;
        at?: string;
        id?: string;
        meta?: unknown;
      }>;
      suggested_prompts: string[];
      next_best_actions: Array<{ title: string; reason: string }>;
      playground: Record<string, unknown>;
      tracks: Array<{
        id: string;
        title: string;
        description: string;
        steps: Array<{ title: string; type: string; body: string }>;
      }>;
      last_tab?: string;
      visits?: Record<string, number>;
      topics?: Record<string, number>;
    }>
  > {
    return this.request('/resume/career-copilot/state', {}, 20000);
  }

  async sendCareerCopilotMessage(
    message: string,
    jdPaste?: string,
  ): Promise<
    ApiResponse<{
      ok: boolean;
      reply: string;
      pipeline: Array<{ agent: string; label: string; summary: string }>;
      citations: Array<{ id: string; snippet: string }>;
      rag_grounding: string;
      suggested_prompts: string[];
      next_best_actions: Array<{ title: string; reason: string }>;
      compliance: string;
      messages: Array<{
        role: string;
        content: string;
        at?: string;
        id?: string;
        meta?: unknown;
      }>;
    }>
  > {
    return this.request(
      '/resume/career-copilot/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          jd_paste: jdPaste?.trim() || '',
        }),
      },
      120000,
    );
  }

  async resetCareerCopilotChat(): Promise<ApiResponse<{ ok: boolean; cleared?: boolean }>> {
    return this.request(
      '/resume/career-copilot/chat',
      { method: 'POST', body: JSON.stringify({ reset: true }) },
      30000,
    );
  }

  async recordCareerCopilotTab(tab: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      '/resume/career-copilot/behavior',
      { method: 'POST', body: JSON.stringify({ tab }) },
      15000,
    );
  }

  async startPlaygroundTrack(body: {
    track_id?: string;
    custom_topic?: string;
  }): Promise<ApiResponse<{ ok: boolean; error?: string; playground?: Record<string, unknown> }>> {
    return this.request(
      '/resume/career-copilot/playground/start',
      { method: 'POST', body: JSON.stringify(body) },
      120000,
    );
  }

  async advancePlaygroundStep(): Promise<
    ApiResponse<{ ok: boolean; error?: string; playground?: Record<string, unknown> }>
  > {
    return this.request(
      '/resume/career-copilot/playground/advance',
      { method: 'POST', body: '{}' },
      30000,
    );
  }

  async resetPlaygroundTrack(): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      '/resume/career-copilot/playground/reset',
      { method: 'POST', body: '{}' },
      15000,
    );
  }

  // --- Outreach Campaign methods ---

  async getOutreachCampaigns(): Promise<
    ApiResponse<{
      campaigns: Array<{
        campaign_id: string;
        target_company: string;
        target_role: string;
        channel: string;
        contacts: Array<{ name: string; title: string; notes: string }>;
        sequence: Array<{
          step: number;
          action: string;
          template: string;
          status: string;
          sent_at: string | null;
          notes: string;
        }>;
        status: string;
        created_at: string;
      }>;
    }>
  > {
    return this.request('/resume/career-copilot/outreach/campaigns');
  }

  async createOutreachCampaign(body: {
    target_company: string;
    target_role: string;
    contacts?: Array<{ name: string; title: string; notes: string }>;
    channel: string;
  }): Promise<ApiResponse<{ ok: boolean; campaign: any }>> {
    return this.request(
      '/resume/career-copilot/outreach/create',
      { method: 'POST', body: JSON.stringify(body) },
      30000,
    );
  }

  async generateOutreachSequence(body: { company: string; role: string; channel: string }): Promise<
    ApiResponse<{
      ok: boolean;
      sequence: Array<{ step: number; action: string; template: string }>;
    }>
  > {
    return this.request(
      '/resume/career-copilot/outreach/generate-sequence',
      { method: 'POST', body: JSON.stringify(body) },
      120000,
    );
  }

  async updateOutreachStep(
    campaignId: string,
    body: { step_index: number; status: string; notes?: string },
  ): Promise<ApiResponse<{ ok: boolean; campaign: any }>> {
    return this.request(
      `/resume/career-copilot/outreach/${campaignId}/step`,
      { method: 'PATCH', body: JSON.stringify(body) },
      15000,
    );
  }

  // --- Memory methods ---

  async getMemoryNotes(): Promise<ApiResponse<{ notes: Record<string, string> }>> {
    return this.request('/resume/career-copilot/memory');
  }

  async saveMemoryNote(key: string, value: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      '/resume/career-copilot/memory',
      { method: 'POST', body: JSON.stringify({ key, value }) },
      15000,
    );
  }

  async deleteMemoryNote(key: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      `/resume/career-copilot/memory/${encodeURIComponent(key)}`,
      { method: 'DELETE' },
      15000,
    );
  }

  // --- Timeline ---

  async getCopilotTimeline(limit?: number): Promise<
    ApiResponse<{
      events: Array<{ type: string; description: string; timestamp: string }>;
    }>
  > {
    const q = limit ? `?limit=${limit}` : '';
    return this.request(`/resume/career-copilot/timeline${q}`);
  }

  // --- Playground quiz/assessment ---

  async generatePlaygroundQuiz(body: {
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    count: number;
  }): Promise<
    ApiResponse<{
      ok: boolean;
      questions: Array<{
        question: string;
        options: string[];
        correct_index: number;
        explanation: string;
      }>;
    }>
  > {
    return this.request(
      '/resume/career-copilot/playground/quiz',
      { method: 'POST', body: JSON.stringify(body) },
      120000,
    );
  }

  async evaluatePlaygroundAnswer(body: { question: string; user_answer: string }): Promise<
    ApiResponse<{
      ok: boolean;
      score: number;
      feedback: string;
      model_answer: string;
    }>
  > {
    return this.request(
      '/resume/career-copilot/playground/evaluate',
      { method: 'POST', body: JSON.stringify(body) },
      60000,
    );
  }

  // --- Job Intelligence ---

  async getStaleApplications(days = 5): Promise<
    ApiResponse<{
      ok: boolean;
      count: number;
      stale_applications: Array<{
        record_id: string;
        job_title: string;
        company: string;
        status: string;
        days_stale: number;
        applied_at?: string;
        next_action_date?: string;
      }>;
    }>
  > {
    return this.request(`/resume/career-copilot/intelligence/stale?days=${days}`);
  }

  async generateIntelligenceFollowup(body: {
    record_id: string;
    channel?: 'email' | 'linkedin';
  }): Promise<
    ApiResponse<{
      ok: boolean;
      channel: string;
      followup: { subject: string; message: string; tone: string; next_step: string };
    }>
  > {
    return this.request(
      '/resume/career-copilot/intelligence/followup',
      { method: 'POST', body: JSON.stringify(body) },
      45000,
    );
  }

  async dismissIntelligenceFollowup(
    recordId: string,
  ): Promise<ApiResponse<{ ok: boolean; dismissed_at?: string }>> {
    return this.request(`/resume/career-copilot/intelligence/followup/${recordId}/dismiss`, {
      method: 'POST',
    });
  }

  async getFunnelAnalytics(): Promise<
    ApiResponse<{
      ok: boolean;
      counts: Record<string, number>;
      conversions: Record<string, number>;
      insight: { headline: string; insight: string; action_items: string[] };
    }>
  > {
    return this.request('/resume/career-copilot/intelligence/funnel');
  }

  async getRejectionInsights(): Promise<
    ApiResponse<{
      ok: boolean;
      total: number;
      patterns: Array<{ theme: string; evidence: string }>;
      suggestions: string[];
    }>
  > {
    return this.request('/resume/career-copilot/intelligence/rejection-insights', {}, 45000);
  }

  async reframeRejection(record_id: string): Promise<
    ApiResponse<{
      ok: boolean;
      reframe: {
        acknowledgement: string;
        what_went_right: string;
        next_actions: string[];
        silver_lining: string;
      };
    }>
  > {
    return this.request(
      '/resume/career-copilot/intelligence/reframe',
      { method: 'POST', body: JSON.stringify({ record_id }) },
      45000,
    );
  }

  async getWeeklyDigest(): Promise<
    ApiResponse<{
      ok: boolean;
      stats: { events_this_week: number; events_last_week: number };
      digest: {
        headline: string;
        summary: string;
        wins: string[];
        focus_for_next_week: string[];
      };
    }>
  > {
    return this.request('/resume/career-copilot/intelligence/weekly-digest', {}, 45000);
  }

  // --- Momentum ---

  async getMomentumData(): Promise<
    ApiResponse<{
      ok: boolean;
      streak: number;
      momentum_score: number;
      trend: 'up' | 'down';
      this_week: number;
      last_week: number;
      milestones: Array<{ id: string; label: string; earned: boolean }>;
      heatmap: Array<{ date: string; count: number }>;
    }>
  > {
    return this.request('/resume/career-copilot/momentum');
  }

  async recordMomentumActivity(
    activity_type: string,
    metadata?: Record<string, unknown>,
  ): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      '/resume/career-copilot/momentum/activity',
      { method: 'POST', body: JSON.stringify({ activity_type, metadata: metadata || {} }) },
      15000,
    );
  }

  // --- Networking CRM ---

  async getNetworkContacts(): Promise<ApiResponse<{ ok: boolean; contacts: any[] }>> {
    return this.request('/resume/career-copilot/network/contacts');
  }

  async addNetworkContact(body: {
    name: string;
    company?: string;
    role?: string;
    platform?: string;
    relationship_strength?: string;
    notes?: string;
    last_contacted?: string;
    referral_status?: string;
  }): Promise<ApiResponse<{ ok: boolean; contact: any }>> {
    return this.request(
      '/resume/career-copilot/network/contacts',
      { method: 'POST', body: JSON.stringify(body) },
      20000,
    );
  }

  async updateNetworkContact(
    contactId: string,
    body: Record<string, unknown>,
  ): Promise<ApiResponse<{ ok: boolean; contact: any }>> {
    return this.request(
      `/resume/career-copilot/network/contacts/${encodeURIComponent(contactId)}`,
      { method: 'PUT', body: JSON.stringify(body) },
      20000,
    );
  }

  async deleteNetworkContact(contactId: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      `/resume/career-copilot/network/contacts/${encodeURIComponent(contactId)}`,
      { method: 'DELETE' },
      15000,
    );
  }

  async generateNetworkIntro(contact_id: string): Promise<
    ApiResponse<{
      ok: boolean;
      intro: { message: string; subject: string; tone: string };
    }>
  > {
    return this.request(
      '/resume/career-copilot/network/generate-intro',
      { method: 'POST', body: JSON.stringify({ contact_id }) },
      45000,
    );
  }

  async getNetworkingInsights(): Promise<
    ApiResponse<{
      ok: boolean;
      insights: { headline: string; analysis: string; actions: string[] };
    }>
  > {
    return this.request('/resume/career-copilot/network/insights', {}, 45000);
  }

  // --- Offer Workspace ---

  async getOffers(): Promise<ApiResponse<{ ok: boolean; offers: any[] }>> {
    return this.request('/resume/career-copilot/offers');
  }

  async addOffer(body: Record<string, unknown>): Promise<ApiResponse<{ ok: boolean; offer: any }>> {
    return this.request(
      '/resume/career-copilot/offers',
      { method: 'POST', body: JSON.stringify(body) },
      20000,
    );
  }

  async updateOffer(
    offerId: string,
    body: Record<string, unknown>,
  ): Promise<ApiResponse<{ ok: boolean; offer: any }>> {
    return this.request(
      `/resume/career-copilot/offers/${encodeURIComponent(offerId)}`,
      { method: 'PUT', body: JSON.stringify(body) },
      20000,
    );
  }

  async deleteOffer(offerId: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      `/resume/career-copilot/offers/${encodeURIComponent(offerId)}`,
      { method: 'DELETE' },
      15000,
    );
  }

  async compareOffers(): Promise<
    ApiResponse<{
      ok: boolean;
      offers: any[];
      comparison: {
        headline: string;
        recommendation: string;
        pros_cons: Array<{ company: string; pros: string[]; cons: string[] }>;
        total_comp_table: Array<{ company: string; total_comp: number }>;
      };
    }>
  > {
    return this.request('/resume/career-copilot/offers/compare', {}, 60000);
  }

  async generateNegotiationScript(
    offer_id: string,
    ask: string,
  ): Promise<
    ApiResponse<{
      ok: boolean;
      script: {
        email_subject: string;
        email_body: string;
        talking_points: string[];
        fallback_if_denied: string;
      };
    }>
  > {
    return this.request(
      '/resume/career-copilot/offers/negotiate',
      { method: 'POST', body: JSON.stringify({ offer_id, ask }) },
      60000,
    );
  }

  async evaluateMockAnswer(
    recordId: string,
    body: { question: string; user_answer: string; category?: string },
  ): Promise<ApiResponse<{ evaluation: import('../types/resume').MockEvaluation }>> {
    return this.request(
      `/resume/tailoring-records/${recordId}/mock-evaluate`,
      { method: 'POST', body: JSON.stringify(body) },
      60000,
    );
  }

  // ============================================
  // Voice Graph - writing-capture surface (/api/resume/voice-graph)
  // Simple JSON request/response (NOT the async job pattern).
  // ============================================

  async voiceGraphStatus() {
    // 404 here means the feature flag is off - the caller treats a 404
    // status as "feature unavailable" and renders a soft placeholder.
    return this.request<import('../types/voicegraph').VoiceGraphStatus>(
      '/resume/voice-graph/status',
    );
  }

  async voiceGraphPrompts() {
    return this.request<{ prompts: import('../types/voicegraph').WritingPrompt[] }>(
      '/resume/voice-graph/prompts',
    );
  }

  async grantVoiceConsent() {
    return this.request<import('../types/voicegraph').VoiceConsent>('/resume/voice-graph/consent', {
      method: 'POST',
    });
  }

  async revokeVoiceConsent() {
    return this.request<import('../types/voicegraph').VoiceConsent>('/resume/voice-graph/consent', {
      method: 'DELETE',
    });
  }

  async saveWritingSample(
    payload: import('../types/voicegraph').SaveSamplePayload,
  ): Promise<ApiResponse<import('../types/voicegraph').WritingSample>> {
    // request() already forwards { status, errorPayload } on a non-2xx, so a
    // 403 upgrade_required / consent_required surfaces to the caller intact
    // (mirrors tailorResumeWithJDText) - no re-wrapping needed here.
    return this.request<import('../types/voicegraph').WritingSample>(
      '/resume/voice-graph/samples',
      { method: 'POST', body: JSON.stringify(payload) },
    );
  }

  async listWritingSamples() {
    return this.request<{ samples: import('../types/voicegraph').WritingSample[] }>(
      '/resume/voice-graph/samples',
    );
  }

  async getWritingSample(id: string) {
    return this.request<import('../types/voicegraph').WritingSample>(
      `/resume/voice-graph/samples/${encodeURIComponent(id)}`,
    );
  }

  async deleteWritingSample(id: string) {
    return this.request<{ ok: boolean }>(`/resume/voice-graph/samples/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  /** The private knowledge graph built from the user's writing. */
  async voiceGraphGraph() {
    return this.request<import('../types/voicegraph').KnowledgeGraph>('/resume/voice-graph/graph');
  }

  /**
   * The computed voice profile - or an `{ insufficient: true }` payload when
   * there isn't yet enough writing to profile a voice.
   */
  async voiceGraphVoice() {
    return this.request<import('../types/voicegraph').VoiceProfile>('/resume/voice-graph/voice');
  }

  /**
   * Assemble a resume purely from the user's own words - verbatim, nothing
   * written by a model. May 403 `consent_required` or 400 `no_ready_samples`;
   * request() forwards { status, errorPayload } so callers can branch.
   */
  async buildRawResume() {
    return this.request<import('../types/voicegraph').AuthoredResumeDetail>(
      '/resume/voice-graph/resume/raw',
      { method: 'POST', body: '{}' },
      30000,
    );
  }

  async listAuthoredResumes() {
    return this.request<{ resumes: import('../types/voicegraph').AuthoredResume[] }>(
      '/resume/voice-graph/resume',
    );
  }

  async getAuthoredResume(id: string) {
    return this.request<import('../types/voicegraph').AuthoredResumeDetail>(
      `/resume/voice-graph/resume/${encodeURIComponent(id)}`,
    );
  }

  // ============================================
  // Gmail integration - auto-update application status from inbox
  // ============================================

  async getGmailStatus(): Promise<
    ApiResponse<{
      configured: boolean;
      connected: boolean;
      gmail_address?: string | null;
      last_synced_at?: string | null;
      pending_suggestions: number;
    }>
  > {
    return this.request('/resume/gmail/status');
  }

  async getGmailAuthUrl(): Promise<ApiResponse<{ auth_url: string }>> {
    return this.request('/resume/gmail/auth-url');
  }

  async finishGmailLink(
    code: string,
    state: string,
  ): Promise<ApiResponse<{ connected: boolean; gmail_address?: string; linked_at?: string }>> {
    return this.request('/resume/gmail/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  }

  async syncGmail(): Promise<
    ApiResponse<{
      ok: boolean;
      job_id: string;
      status: string;
    }>
  > {
    return this.request('/resume/gmail/sync', { method: 'POST' }, 30000);
  }

  async pollGmailSyncJob(jobId: string): Promise<
    ApiResponse<{
      status: 'processing' | 'completed' | 'failed';
      result?: {
        messages_scanned: number;
        auto_applied: number;
        suggested: number;
        ignored: number;
        skipped_already_seen?: number;
        skipped_no_match?: number;
        skipped_already_in_status?: number;
      };
      error?: string;
    }>
  > {
    return this.request(`/resume/job/${jobId}`);
  }

  async listGmailSuggestions(includeResolved = false): Promise<
    ApiResponse<{
      suggestions: Array<{
        suggestion_id: string;
        record_id: string;
        company?: string;
        title?: string;
        from_name?: string;
        from_address?: string;
        subject?: string;
        snippet?: string;
        current_status: string;
        suggested_status: string;
        confidence: number;
        reason?: string;
        applied: boolean;
        dismissed: boolean;
        auto_applied?: boolean;
        created_at?: string;
      }>;
    }>
  > {
    const qs = includeResolved ? '?include_resolved=true' : '';
    return this.request(`/resume/gmail/suggestions${qs}`);
  }

  async applyGmailSuggestion(suggestionId: string): Promise<ApiResponse<{ suggestion: any }>> {
    return this.request(`/resume/gmail/suggestions/${suggestionId}/apply`, { method: 'POST' });
  }

  async dismissGmailSuggestion(suggestionId: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(`/resume/gmail/suggestions/${suggestionId}/dismiss`, { method: 'POST' });
  }

  async disconnectGmail(): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request('/resume/gmail/disconnect', { method: 'POST' });
  }

  // ============================================
  // Recruiter's Six Seconds (/api/resume/six-seconds)
  // Async job: submit -> 202 { job_id } -> poll for the gaze/impression read.
  // ============================================

  async runSixSeconds(
    signal?: AbortSignal,
    force = false,
  ): Promise<ApiResponse<import('../types/sixSeconds').SixSecondsResult>> {
    // force=true bypasses the server-side cache and spends a quota unit; the
    // passive auto-run on mount leaves it false so re-opening the tab is free.
    const submit = await this.request<{ job_id?: string }>(
      '/resume/six-seconds',
      { method: 'POST', body: JSON.stringify({ force }) },
      30000,
    );
    if (submit.error) {
      // Forward status + payload so a 403 upgrade_required / 429 quota surfaces.
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    }
    if (!submit.data?.job_id) {
      // Backend may answer synchronously (e.g. { error: "no_resume" }).
      return {
        data: (submit.data ?? {
          error: 'no_resume',
        }) as unknown as import('../types/sixSeconds').SixSecondsResult,
      };
    }
    return this.pollJob<import('../types/sixSeconds').SixSecondsResult>(
      submit.data.job_id,
      120000,
      signal,
    );
  }

  // ============================================
  // Pipeline Intelligence (/api/resume/pipeline/*)
  // ============================================

  async getPipelineFunnel() {
    return this.request<import('../types/pipeline').PipelineFunnel>('/resume/pipeline/funnel');
  }

  async getPipelineGhosts() {
    return this.request<import('../types/pipeline').PipelineGhosts>('/resume/pipeline/ghosts');
  }

  /** Mark one or more applications as ghosted (no response in a while). */
  async markPipelineGhosts(applicationIds: string[]) {
    return this.request<{ ok: boolean; marked: number }>('/resume/pipeline/ghosts/mark', {
      method: 'POST',
      body: JSON.stringify({ application_ids: applicationIds }),
    });
  }

  async getPipelineCohort() {
    return this.request<import('../types/pipeline').PipelineCohort>('/resume/pipeline/cohort');
  }

  // ============================================
  // Referrals + LinkedIn archive (/api/resume/referrals*, /linkedin-archive*)
  // Referrals gate at Premium+ (403 upgrade_required).
  // ============================================

  async getReferrals(company: string) {
    return this.request<import('../types/referrals').ReferralsResponse>(
      `/resume/referrals?company=${encodeURIComponent(company)}`,
    );
  }

  /** Draft a warm referral ask - async job returning a ready-to-send message. */
  async draftReferralAsk(
    referral: import('../types/referrals').Referral,
    job: { company?: string; title?: string; job_id?: string; description?: string },
    signal?: AbortSignal,
  ): Promise<ApiResponse<{ message: string }>> {
    const submit = await this.request<{ job_id: string }>(
      '/resume/referrals/draft',
      { method: 'POST', body: JSON.stringify({ referral, job }) },
      30000,
    );
    if (submit.error) {
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    }
    if (!submit.data?.job_id) return { error: 'Failed to start referral draft' };
    return this.pollJob<{ message: string }>(submit.data.job_id, 120000, signal);
  }

  async uploadLinkedInArchive(
    file: File,
  ): Promise<ApiResponse<import('../types/referrals').LinkedInDiff>> {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.getToken();
    const url = `${this.baseURL}/resume/linkedin-archive`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          error: data.error || `HTTP ${response.status}`,
          status: response.status,
          errorPayload: data,
        };
      }
      return { data } as ApiResponse<import('../types/referrals').LinkedInDiff>;
    } catch (error) {
      clearTimeout(timeoutId);
      return { error: error instanceof Error ? error.message : 'Upload failed' };
    }
  }

  async getLinkedInDiff() {
    return this.request<import('../types/referrals').LinkedInDiff>('/resume/linkedin-archive/diff');
  }

  // ============================================
  // Notification preferences (/api/resume/notifications/*)
  // ============================================

  async getNotificationPrefs() {
    return this.request<import('../types/notifications').NotificationPrefs>(
      '/resume/notifications/prefs',
    );
  }

  async updateNotificationPrefs(
    prefs: Partial<import('../types/notifications').NotificationPrefs>,
  ) {
    return this.request<import('../types/notifications').NotificationPrefs>(
      '/resume/notifications/prefs',
      { method: 'PUT', body: JSON.stringify(prefs) },
    );
  }

  async unsubscribeNotifications() {
    return this.request<{ ok: boolean }>('/resume/notifications/unsubscribe', {
      method: 'POST',
      body: '{}',
    });
  }

  // ============================================
  // Mail-ingress (/api/resume/mail-ingress/*)
  // A 404 on any of these = feature flag off → hide the surface entirely.
  // ============================================

  async provisionMailIngress() {
    return this.request<import('../types/mailIngress').MailIngressAddress>(
      '/resume/mail-ingress/provision',
      { method: 'POST', body: '{}' },
    );
  }

  async getMailIngressSuggestions() {
    return this.request<import('../types/mailIngress').MailIngressSuggestionsResponse>(
      '/resume/mail-ingress/suggestions',
    );
  }

  async resolveMailIngressSuggestion(
    id: string,
    action: import('../types/mailIngress').MailIngressAction,
  ) {
    return this.request<{ ok: boolean }>(
      `/resume/mail-ingress/suggestions/${encodeURIComponent(id)}/resolve`,
      { method: 'POST', body: JSON.stringify({ action }) },
    );
  }

  // ============================================
  // Employer (ATS) logins (/api/apply/credentials*)
  // Backend: shared/python/services/ats_credential_service.py +
  // shared/python/services/reveal_reauth_service.py. The list is METADATA ONLY
  // - a password is never in a list response. Revealing one is a separate POST
  // behind a fresh step-up re-auth, rate limited (5 / 5 min -> 429) and audited
  // BEFORE the backend decrypts.
  //
  // The step-up factor depends on the ACCOUNT, not the client: a Google-only
  // signup has no password at all, so `getAtsReauthMethods` publishes what this
  // account can actually do and the UI renders that. Never infer capability
  // from an error.
  //
  // Failures are 400/403/404/409/429/503 - never 401 (invariant #1). Rides the
  // already-routed /api/apply edge prefix, so no new Terraform route.
  // ============================================

  /** Every employer login we manage for the user. No secrets in this payload. */
  async getAtsCredentials() {
    return this.request<{ credentials: import('../types/atsCredentials').AtsCredential[] }>(
      '/apply/credentials',
    );
  }

  /**
   * Which re-auth factors THIS account can complete before a reveal:
   * `password` only when the account has one, `email_code` always. Reads the
   * caller's own account (JWT identity) - it cannot probe another address.
   */
  async getAtsReauthMethods() {
    return this.request<import('../types/atsCredentials').AtsReauthMethods>(
      '/apply/credentials/reauth-methods',
    );
  }

  /**
   * Mail a single-use code to the account's registered address. The backend
   * picks the destination from the JWT - this call carries no address.
   * 429 `code_send_rate_limited` = too many codes; 503 `email_unavailable` =
   * we could not send (no code was minted, or it was invalidated).
   */
  async sendAtsRevealCode() {
    return this.request<import('../types/atsCredentials').AtsRevealChallengeSent>(
      '/apply/credentials/reveal/challenge',
      { method: 'POST', body: '{}' },
    );
  }

  /**
   * Reveal ONE stored password with exactly one factor: the user's own JobPilot
   * account `password`, or the emailed one-time `code`. 403 `reauth_failed` =
   * wrong password; 403 `reauth_unavailable` = this account has no password
   * (use the code); 403 `code_invalid` / `code_expired`; 429
   * `code_attempts_exceeded` or `rate_limited`. Never store the result.
   */
  async revealAtsCredential(args: {
    ats_family: string;
    tenant?: string;
    password?: string;
    code?: string;
  }) {
    return this.request<import('../types/atsCredentials').AtsCredentialSecret>(
      '/apply/credentials/reveal',
      {
        method: 'POST',
        body: JSON.stringify({
          ats_family: args.ats_family,
          tenant: args.tenant ?? '',
          // Send exactly the factor the user completed - never both.
          ...(args.code ? { code: args.code } : { password: args.password ?? '' }),
        }),
      },
    );
  }

  // ============================================
  // Managed Application Mailbox (/api/resume/mailbox/*)
  // Contract: jobpilot-backend/docs/specs/managed-mailbox-v1.md §5. Field names
  // are VERBATIM from that spec. A 404 on any of these = the feature flag
  // (APPLY_MAILBOX_ENABLED) is off -> hide the whole surface. Business failures
  // are 400/403/404/409/429 - never 401 (invariant #1). Rides the already-routed
  // /api/resume edge prefix, so no new external Terraform route is required.
  // ============================================

  /** GET the flat mailbox view (§5). 404 => feature disabled. */
  async getMailbox() {
    return this.request<import('../types/mailbox').Mailbox>('/resume/mailbox');
  }

  /** Provision the stable primary address (idempotent). `privacy_alias` mints an
   *  opaque career.<hex> local part instead of firstname.lastname (§1.1). */
  async provisionMailbox(opts?: { privacy_alias?: boolean }) {
    return this.request<import('../types/mailbox').Mailbox>('/resume/mailbox/provision', {
      method: 'POST',
      body: JSON.stringify(opts ?? {}),
    });
  }

  /** Pause / resume accepting + acting on inbound mail (§1.2). */
  async pauseMailbox(paused: boolean) {
    return this.request<import('../types/mailbox').Mailbox>('/resume/mailbox/pause', {
      method: 'POST',
      body: JSON.stringify({ paused }),
    });
  }

  /** Rotate: mint a NEW primary address, tombstone the old one (§1.2). The
   *  returned mailbox carries the new address. */
  async rotateMailbox() {
    return this.request<import('../types/mailbox').Mailbox>('/resume/mailbox/rotate', {
      method: 'POST',
      body: '{}',
    });
  }

  /** Turn forwarding on/off (and set/change the verified destination). Changing
   *  `forward_to` re-triggers verification (§5). */
  async setForwarding(opts: { enabled: boolean; forward_to?: string }) {
    return this.request<import('../types/mailbox').Mailbox>('/resume/mailbox/forwarding', {
      method: 'POST',
      body: JSON.stringify(opts),
    });
  }

  /**
   * Redeem a forwarding-destination verification token (the link mailed to the
   * user's ORIGINAL inbox). §1.2 lists forwarding re-verification as a control
   * and §5 mounts every mailbox route under /api/resume/mailbox/*; this rides the
   * forwarding sub-path. Failure is 400/404/409 - never 401.
   * NOTE: §5's endpoint table does not enumerate this path explicitly - confirm
   * with backend-engineer.
   */
  async verifyForwarding(token: string) {
    return this.request<import('../types/mailbox').Mailbox>('/resume/mailbox/forwarding/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  /** List conversation summaries (§5: `?trust=&application_id=&unread=`). */
  async getMailboxThreads(params?: import('../types/mailbox').MailboxThreadQuery) {
    const qs = new URLSearchParams();
    if (params?.trust) qs.set('trust', params.trust);
    if (params?.application_id) qs.set('application_id', params.application_id);
    if (params?.unread) qs.set('unread', 'true');
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<{ threads: import('../types/mailbox').ThreadSummary[] }>(
      `/resume/mailbox/threads${suffix}`,
    );
  }

  /** Full thread: the thread summary + its ordered, SANITIZED messages (§5). */
  async getMailboxThread(threadId: string) {
    return this.request<import('../types/mailbox').ThreadDetail>(
      `/resume/mailbox/threads/${encodeURIComponent(threadId)}`,
    );
  }

  /** Mark a whole thread read / unread (§5). */
  async markThreadRead(threadId: string, read: boolean) {
    return this.request<{ ok: boolean }>(
      `/resume/mailbox/threads/${encodeURIComponent(threadId)}/read`,
      { method: 'POST', body: JSON.stringify({ read }) },
    );
  }

  /** Bind a thread to a tracked application (§5). */
  async attachThread(threadId: string, applicationId: string) {
    return this.request<{ ok: boolean }>(
      `/resume/mailbox/threads/${encodeURIComponent(threadId)}/attach`,
      { method: 'POST', body: JSON.stringify({ application_id: applicationId }) },
    );
  }

  /** Unbind a thread from its application (§5). */
  async detachThread(threadId: string) {
    return this.request<{ ok: boolean }>(
      `/resume/mailbox/threads/${encodeURIComponent(threadId)}/detach`,
      { method: 'POST', body: '{}' },
    );
  }

  /**
   * Issue a short-lived presigned download URL for one attachment (§5). ONLY
   * call this for a `clean` attachment - a suspicious/blocked one is
   * download-blocked server-side and the FE must never render a link for it.
   */
  async getAttachmentDownloadUrl(attachmentId: string) {
    return this.request<{ download_url: string }>(
      `/resume/mailbox/attachments/${encodeURIComponent(attachmentId)}`,
    );
  }

  /** Report a thread as phishing (§5). */
  async reportPhishing(threadId: string) {
    return this.request<{ ok: boolean }>(
      `/resume/mailbox/threads/${encodeURIComponent(threadId)}/report-phishing`,
      { method: 'POST', body: '{}' },
    );
  }

  // ============================================
  // Admin endpoints (/api/admin)
  // ============================================

  async getAdminStats() {
    return this.request<{
      total_users: number;
      users_7d: number;
      users_30d: number;
      total_parsed_resumes: number;
      total_base_resumes: number;
      legacy_generated_resumes: number;
      total_tailoring_sessions: number;
      tailoring_7d: number;
      tailoring_30d: number;
      total_versions: number;
      cached_pdf_files: number;
      cached_docx_files: number;
      total_applications: number;
      applications_by_status: Record<string, number>;
      total_interview_prep_packs: number;
    }>('/admin/stats');
  }

  async getAdminUsers() {
    return this.request<{
      users: Array<{
        id: string;
        email: string;
        name: string | null;
        role: string | null;
        sector: string | null;
        created_at: string | null;
        last_login: string | null;
        last_login_ip: string | null;
        login_attempts: number;
        base_resumes: number;
        generated_resumes: number;
        tailoring_sessions: number;
        has_parsed_resume: boolean;
        daily_tailor_limit_custom: number | null;
        daily_tailor_limit_effective: number;
        tailored_today: number;
      }>;
      default_daily_limit: number;
    }>('/admin/users');
  }

  // ── Daily tailor quota ────────────────────────────────────────
  async getDailyUsage() {
    return this.request<{
      used: number;
      limit: number;
      remaining: number;
      resets_at: string;
      resets_in_seconds: number;
      date: string;
    }>('/resume/usage/today');
  }

  // ── Feedback (user side) ──────────────────────────────────────
  async submitFeedback(
    message: string,
    type: 'general' | 'quota_bump' | 'bug' | 'idea' = 'general',
  ) {
    return this.request<{ id: string; status: string }>('/resume/feedback/submit', {
      method: 'POST',
      body: JSON.stringify({ message, type }),
    });
  }

  async getMyFeedback() {
    return this.request<{
      feedback: Array<{
        id: string;
        message: string;
        type: string;
        status: string;
        admin_response: string | null;
        created_at: string | null;
        responded_at: string | null;
      }>;
    }>('/resume/feedback/mine');
  }

  // ── Admin: user quota + feedback management ──────────────────
  async updateAdminUserQuota(email: string, dailyTailorLimit: number | null) {
    return this.request<{
      email: string;
      daily_tailor_limit_custom: number | null;
      daily_tailor_limit_effective: number;
      tailored_today: number;
    }>(`/admin/user/${encodeURIComponent(email)}/quota`, {
      method: 'PATCH',
      body: JSON.stringify({ daily_tailor_limit: dailyTailorLimit }),
    });
  }

  // ── Admin: per-user entitlement override (runtime full-access grant) ──
  // GET returns the current override doc (or null/empty when none is set).
  // PUT with { overrides: { plan: "premium_plus" } } grants full access;
  // PUT with { overrides: {} } clears the override back to the stored plan.
  async getAdminUserOverride(email: string) {
    return this.request<AdminUserOverride>(`/admin/ops/override/${encodeURIComponent(email)}`);
  }

  async setAdminUserOverride(email: string, overrides: Record<string, unknown>) {
    return this.request<AdminUserOverride>(`/admin/ops/override/${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: JSON.stringify({ overrides }),
    });
  }

  async getAdminFeedback(status?: 'open' | 'responded' | 'resolved') {
    const qs = status ? `?status=${status}` : '';
    return this.request<{
      feedback: Array<{
        id: string;
        email: string;
        message: string;
        type: string;
        status: string;
        admin_response: string | null;
        created_at: string | null;
        responded_at: string | null;
      }>;
    }>(`/admin/feedback${qs}`);
  }

  async updateAdminFeedback(
    id: string,
    fields: { admin_response?: string; status?: 'open' | 'responded' | 'resolved' },
  ) {
    return this.request<{
      id: string;
      email: string;
      message: string;
      type: string;
      status: string;
      admin_response: string | null;
      created_at: string | null;
      responded_at: string | null;
    }>(`/admin/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
  }

  async getAdminUserDetail(email: string) {
    return this.request<{
      user: {
        id: string;
        email: string;
        name: string | null;
        role: string | null;
        sector: string | null;
        created_at: string | null;
        last_login: string | null;
        last_login_ip: string | null;
        login_attempts: number;
        fingerprint_hash: string | null;
        session_id: string | null;
      };
      parsed_resume: any;
      base_resumes: any[];
      generated_resumes: any[];
      tailoring_records: any[];
    }>(`/admin/user/${encodeURIComponent(email)}`);
  }

  // ============================================
  // Career portals - direct Workday fan-out (/api/jobs/workday)
  // ============================================

  async getWorkdayCatalog() {
    return this.request<import('../types/jobs').WorkdayCatalog>('/jobs/workday/catalog', {
      method: 'GET',
    });
  }

  async searchWorkdayJobs(
    params: import('../types/jobs').WorkdayJobsParams,
    onPartial?: (partial: import('../types/jobs').WorkdayJobsResult) => void,
  ): Promise<ApiResponse<import('../types/jobs').WorkdayJobsResult>> {
    const submitResp = await this.request<{ job_id: string }>(
      '/jobs/workday/search',
      {
        method: 'POST',
        // Viewer timezone rides every scan: "posted today" is computed in
        // the USER's calendar day server-side, not UTC's.
        body: JSON.stringify({ tz_offset_minutes: -new Date().getTimezoneOffset(), ...params }),
      },
      30000,
    );
    if (submitResp.error) {
      // Forward status + payload so a 403 upgrade_required / 429 quota surfaces.
      return {
        error: submitResp.error,
        status: submitResp.status,
        errorPayload: submitResp.errorPayload,
      };
    }
    if (!submitResp.data?.job_id) return { error: 'Failed to start Workday search' };
    // A cold full-catalog fan-out can take several minutes on Lambda; poll up
    // to the function's 15-min ceiling. Matches stream in via onPartial the
    // whole time, so the wait is visible, not a spinner.
    return this.pollJob<import('../types/jobs').WorkdayJobsResult>(
      submitResp.data.job_id,
      900000,
      undefined,
      onPartial,
    );
  }

  // ============================================
  // Career portals - non-Workday ATS universe (/api/jobs/career-pages)
  // ============================================

  async getCareerPagesCatalog() {
    return this.request<import('../types/jobs').WorkdayCatalog>('/jobs/career-pages/catalog', {
      method: 'GET',
    });
  }

  async searchCareerPagesJobs(
    params: import('../types/jobs').WorkdayJobsParams,
    onPartial?: (partial: import('../types/jobs').WorkdayJobsResult) => void,
  ): Promise<ApiResponse<import('../types/jobs').WorkdayJobsResult>> {
    const submitResp = await this.request<{ job_id: string }>(
      '/jobs/career-pages/search',
      {
        method: 'POST',
        body: JSON.stringify({ tz_offset_minutes: -new Date().getTimezoneOffset(), ...params }),
      },
      30000,
    );
    if (submitResp.error) {
      // Forward status + payload so a 403 upgrade_required / 429 quota surfaces.
      return {
        error: submitResp.error,
        status: submitResp.status,
        errorPayload: submitResp.errorPayload,
      };
    }
    if (!submitResp.data?.job_id) return { error: 'Failed to start career-pages search' };
    return this.pollJob<import('../types/jobs').WorkdayJobsResult>(
      submitResp.data.job_id,
      900000,
      undefined,
      onPartial,
    );
  }

  // ============================================
  // Career portals - curated MNC / Big Tech boards (/api/jobs/mnc)
  // Same shapes as career-pages; catalog `key`s are SECTOR keys.
  // ============================================

  async getMncCatalog() {
    return this.request<import('../types/jobs').WorkdayCatalog>('/jobs/mnc/catalog', {
      method: 'GET',
    });
  }

  async searchMncJobs(
    params: import('../types/jobs').WorkdayJobsParams,
    onPartial?: (partial: import('../types/jobs').WorkdayJobsResult) => void,
  ): Promise<ApiResponse<import('../types/jobs').WorkdayJobsResult>> {
    const submitResp = await this.request<{ job_id: string }>(
      '/jobs/mnc/search',
      {
        method: 'POST',
        body: JSON.stringify({ tz_offset_minutes: -new Date().getTimezoneOffset(), ...params }),
      },
      30000,
    );
    if (submitResp.error) {
      // Forward status + payload so a 403 upgrade_required / 429 quota surfaces.
      return {
        error: submitResp.error,
        status: submitResp.status,
        errorPayload: submitResp.errorPayload,
      };
    }
    if (!submitResp.data?.job_id) return { error: 'Failed to start MNC search' };
    return this.pollJob<import('../types/jobs').WorkdayJobsResult>(
      submitResp.data.job_id,
      900000,
      undefined,
      onPartial,
    );
  }

  // ============================================
  // Tech feed - unified indexed job search (/api/jobs/tech-feed)
  //
  // The successor to the three fan-outs above. It is a BOUNDED INDEXED READ,
  // not a crawl, so /search answers 200 with the page inline; it only returns
  // 202 {job_id} when the caller passes `async: true`, in which case we poll
  // the shared /resume/job/<id> machinery like every other long job.
  // ============================================

  /**
   * Run a tech-feed search.
   *
   * Three things this method guarantees for callers:
   * 1. `opts.signal` cancels an in-flight search, so a stale query dies the
   *    moment the filters change (React Query hands us its own signal).
   * 2. A 410 `cursor_expired` comes back as DATA tagged `cursor_expired: true`
   *    with `status: 410`, NOT as an error - the paging session expired and the
   *    caller must re-run from the current filters. It is categorically not an
   *    auth failure and never touches the 401 force-logout path.
   * 3. `tz_offset_minutes` always rides the request, last in the body so it
   *    cannot be accidentally overridden: "posted today" is computed in the
   *    VIEWER's calendar day, not UTC's.
   */
  async searchTechFeed(
    params: import('../types/techFeed').TechFeedSearchRequest,
    opts?: { signal?: AbortSignal; timeoutMs?: number },
  ): Promise<ApiResponse<import('../types/techFeed').TechFeedSearchOutcome>> {
    type SearchResponse = import('../types/techFeed').TechFeedSearchResponse;

    const resp = await this.request<SearchResponse & { job_id?: string }>(
      '/jobs/tech-feed/search',
      {
        method: 'POST',
        // JSON.stringify drops undefined members, so an unset filter is simply
        // absent rather than a null the backend has to interpret.
        body: JSON.stringify({
          ...params,
          tz_offset_minutes: -new Date().getTimezoneOffset(),
        }),
      },
      opts?.timeoutMs ?? 30000,
      { signal: opts?.signal },
    );

    // 410: the search session behind this cursor is gone. Hand the payload back
    // as data so the caller can reset to page 1 instead of showing a failure.
    if (resp.status === 410 && resp.errorPayload?.error === 'cursor_expired') {
      return {
        data: {
          cursor_expired: true,
          error: 'cursor_expired',
          message:
            typeof resp.errorPayload.message === 'string'
              ? resp.errorPayload.message
              : 'This result page expired. Re-running your search.',
        },
        status: 410,
      };
    }

    if (resp.error) {
      // Forward status + payload so a 403 upgrade_required / 429 quota surfaces.
      return { error: resp.error, status: resp.status, errorPayload: resp.errorPayload };
    }

    // Async mode: 202 {job_id} with no inline page - poll to completion.
    if (params.async && resp.data?.job_id && !Array.isArray(resp.data?.jobs)) {
      return this.pollJob<SearchResponse>(resp.data.job_id, 300000, opts?.signal);
    }

    if (!resp.data) return { error: 'Tech feed search returned no data', status: resp.status };
    return { data: resp.data, status: resp.status };
  }

  /** The filter tree. Static per deploy - cache it hard on the client. */
  async getTechFeedTaxonomy() {
    return this.request<import('../types/techFeed').TechFeedTaxonomy>('/jobs/tech-feed/taxonomy', {
      method: 'GET',
    });
  }

  /** Index coverage + per-source crawl health, for the honesty banner. */
  async getTechFeedCoverage() {
    return this.request<import('../types/techFeed').TechFeedCoverageResponse>(
      '/jobs/tech-feed/coverage',
      { method: 'GET' },
    );
  }

  /**
   * Record one piece of feedback on one posting.
   *
   * 204 with NO body on success, so `data` is `{}` - callers check `error`,
   * never a payload. Idempotent per (user, job_id): re-posting updates the one
   * row rather than adding a second, which is what makes undo a single DELETE.
   *
   * Failures here are business failures - 400 (missing job_id / a reason
   * outside the closed set) and 429 (240 per 5 min). None of them is an auth
   * event; a 401 would be a real session expiry and takes the shared path.
   *
   * IMPORTANT: only `not_interested`, `irrelevant_role` and `duplicate`
   * suppress the posting. The other three are data-quality reports and hide
   * nothing - see `lib/techFeedNotInterested.ts` for the copy that follows
   * from that.
   */
  async recordTechFeedFeedback(
    body: import('../types/techFeed').TechFeedFeedbackRequest,
  ): Promise<ApiResponse<Record<string, never>>> {
    return this.request<Record<string, never>>('/jobs/tech-feed/feedback', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /** Undo feedback on one posting. Always 204 - deleting nothing is not an error. */
  async undoTechFeedFeedback(jobId: string): Promise<ApiResponse<Record<string, never>>> {
    return this.request<Record<string, never>>(
      `/jobs/tech-feed/feedback/${encodeURIComponent(jobId)}`,
      { method: 'DELETE' },
    );
  }

  /**
   * The caller's suppression set. Suppression is applied SERVER-side during
   * search; this exists so a second device can hide the same cards
   * optimistically instead of waiting for the next search to come back.
   */
  async getTechFeedFeedback() {
    return this.request<import('../types/techFeed').TechFeedSuppression>(
      '/jobs/tech-feed/feedback',
      { method: 'GET' },
    );
  }

  /**
   * Company autocomplete over the CANONICAL employer registry.
   *
   * The company filter used to take a company ID - whichever of an employer's
   * several slugs the catalog happened to hand the UI, or a bare ATS tenant.
   * A user typing "Stripe" had no way to reach `emp_fd96667721fe`, and a user
   * who somehow had the id could not tell what it named.
   *
   * `technologyOnly` narrows to employers the registry holds technology
   * evidence for - the SAME rule that builds the coverage denominator and the
   * feed's `employer_scope=tech_only` filter, so a company picked from the
   * technology-only list is guaranteed to survive the technology-only feed.
   */
  async searchTechFeedCompanies(
    query: string,
    opts: { limit?: number; technologyOnly?: boolean; categories?: string[] } = {},
  ) {
    const params = new URLSearchParams({ q: query });
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.technologyOnly) params.set('technology_only', '1');
    if (opts.categories?.length) params.set('categories', opts.categories.join(','));
    return this.request<import('../types/techFeed').TechFeedCompanyResponse>(
      `/jobs/tech-feed/companies?${params.toString()}`,
      { method: 'GET' },
    );
  }

  /**
   * Resolve canonical employer ids back to names.
   *
   * What makes a saved or bookmarked company filter render as "Stripe" rather
   * than as hex. Follows acquisitions, so an id saved before one still names
   * the employer that now holds the postings.
   */
  async lookupTechFeedCompanies(ids: string[]) {
    const clean = ids.map((id) => id.trim()).filter(Boolean).slice(0, 25);
    return this.request<import('../types/techFeed').TechFeedCompanyResponse>(
      `/jobs/tech-feed/companies?ids=${encodeURIComponent(clean.join(','))}`,
      { method: 'GET' },
    );
  }

  /** The canonical employer-category facet, with counts. Static per deploy-ish. */
  async getTechFeedCompanyCategories() {
    return this.request<import('../types/techFeed').TechFeedCompanyCategoriesResponse>(
      '/jobs/tech-feed/company-categories',
      { method: 'GET' },
    );
  }

  async requestTechFeedCompany(body: { company_name: string; career_url?: string }) {
    return this.request<{ request_id: string; status: string; company_name: string }>(
      '/jobs/tech-feed/company-requests',
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async getTechFeedCompanyRequest(id: string) {
    return this.request<{ request_id: string; status: string; company_name: string }>(
      `/jobs/tech-feed/company-requests/${encodeURIComponent(id)}`,
      { method: 'GET' },
    );
  }

  async getAdminTechFeedOps() {
    return this.request<Record<string, unknown>>('/admin/ops/tech-feed');
  }

  // --- Saved searches: server-owned, locally mirrored ------------------
  async listTechFeedSavedSearches() {
    return this.request<import('../types/techFeed').TechFeedSavedSearchesResponse>(
      '/jobs/tech-feed/saved-searches',
      { method: 'GET' },
    );
  }

  /**
   * Upsert one saved search, keyed on the CLIENT's own id.
   *
   * Sending the same id twice updates one row rather than creating two, which
   * is what makes an offline queue safe to drain. 409 means the account is at
   * its cap - a well-formed request against a full account, not bad input.
   */
  async saveTechFeedSearch(body: {
    id: string;
    name: string;
    filters: unknown;
    alerts?: unknown;
  }) {
    return this.request<import('../types/techFeed').TechFeedSavedSearchesResponse>(
      '/jobs/tech-feed/saved-searches',
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async deleteTechFeedSavedSearch(id: string) {
    return this.request<import('../types/techFeed').TechFeedSavedSearchesResponse>(
      `/jobs/tech-feed/saved-searches/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
  }

  /**
   * Push this browser's local list up, then take the server's back.
   *
   * Called once on mount. The server never deletes on reconcile: a search
   * this browser does not have is one saved on another device, not one the
   * user removed.
   */
  async reconcileTechFeedSavedSearches(
    searches: import('../types/techFeed').SavedTechFeedSearch[],
  ) {
    return this.request<import('../types/techFeed').TechFeedSavedSearchesResponse>(
      '/jobs/tech-feed/saved-searches/reconcile',
      { method: 'POST', body: JSON.stringify({ searches }) },
    );
  }

  /**
   * Non-PII product telemetry. Fire and forget.
   *
   * 204 with no body when accepted or dropped, so a caller never branches on
   * it: telemetry must not be able to fail a user action. `dimensions` carries
   * filter KEYS only - the server discards anything outside its allowlist, so
   * a value that slipped in here would be dropped rather than stored, but the
   * client should not send one in the first place.
   */
  async recordTechFeedTelemetry(
    events: import('../types/techFeed').TechFeedTelemetryItem[],
  ): Promise<void> {
    if (!events.length) return;
    try {
      await this.request<Record<string, never>>('/jobs/tech-feed/telemetry', {
        method: 'POST',
        body: JSON.stringify({ events: events.slice(0, 50) }),
      });
    } catch {
      /* telemetry never surfaces */
    }
  }

  // ============================================
  // Auto-Apply (opt-in auto-submit) - /api/apply/auto-submit
  // Rides the existing ANY /api/apply/{proxy+} edge route (no new Terraform).
  // All endpoints 404 when AUTO_SUBMIT_ENABLED is off; callers treat 404 as
  // "feature unavailable" and hide the surface.
  // ============================================

  async getAutoSubmitSettings() {
    return this.request<import('../types/autoSubmit').AutoSubmitSettings>(
      '/apply/auto-submit/settings',
    );
  }

  async updateAutoSubmitSettings(
    enabled: boolean,
    autonomyThreshold?: number,
    // The explicit autonomy mode. Sent only when provided so a settings save
    // never blanks a mode the onboarding flow already set (the mode is the
    // single source of truth; a bad value is a business 400, never 401).
    mode?: import('../types/onboarding').AutoApplyMode,
    useTailoredResume?: boolean,
  ) {
    const body: Record<string, unknown> = { auto_submit_enabled: enabled };
    if (autonomyThreshold !== undefined) body.autonomy_threshold = autonomyThreshold;
    if (mode !== undefined) body.mode = mode;
    if (useTailoredResume !== undefined) body.use_tailored_resume = useTailoredResume;
    return this.request<import('../types/autoSubmit').AutoSubmitSettings>(
      '/apply/auto-submit/settings',
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  /**
   * Queue a job into the auto-apply ledger and kick off gather. Used by the
   * per-job Auto Apply CTA on Discover / job cards.
   */
  async queueAutoApply(body: {
    company: string;
    title: string;
    jd_text?: string;
    apply_url?: string;
    ats_family?: string;
    source?: string;
    job_id?: string;
    posting_job_id?: string;
  }) {
    return this.request<{
      application?: { application_id?: string; status?: string };
      outcome?: string;
      skipped?: boolean;
      reason?: string;
      error?: string;
    }>('/apply/queue', { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Auto-Apply onboarding (declared-profile) — /api/apply/onboarding/* ──
  // The ask-once question bank the executor fills from. GET returns the catalog
  // grouped by category (+ ready_for_autoapply + mode); PUT validates each
  // answer against the catalog (unknown field / bad value -> 400, never 401)
  // and persists it to the declared store. Rides the existing /api/apply/* edge.

  /** The grouped onboarding questionnaire + readiness + current autonomy mode. */
  async getOnboardingQuestions() {
    return this.request<import('../types/onboarding').OnboardingQuestions>(
      '/apply/onboarding/questions',
    );
  }

  /**
   * Persist reviewed onboarding answers (and optionally the autonomy mode).
   * Returns the refreshed questionnaire payload. An unknown field_id or a value
   * that fails its field's type/options is a 400 (business error, never 401).
   */
  async saveOnboardingAnswers(body: import('../types/onboarding').SaveOnboardingAnswersBody) {
    return this.request<import('../types/onboarding').OnboardingQuestions>(
      '/apply/onboarding/answers',
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  async approveAutoSubmit(body: import('../types/autoSubmit').AutoSubmitApproveBody) {
    return this.request<import('../types/autoSubmit').AutoSubmitApproveResult>(
      '/apply/auto-submit/approve',
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async cancelAutoSubmit(applicationId: string) {
    return this.request<{
      approval: import('../types/autoSubmit').AutoSubmitApprovalView;
    }>('/apply/auto-submit/cancel', {
      method: 'POST',
      body: JSON.stringify({ application_id: applicationId }),
    });
  }

  async getAutoSubmitPending() {
    return this.request<import('../types/autoSubmit').AutoSubmitPending>(
      '/apply/auto-submit/pending',
    );
  }

  /**
   * Answer the open questions on a `needs_input` row IN THE APP and resume the
   * run (AUTOAPPLY_REPAIR_SPEC §3). This is the fix for the worst UX bug in the
   * product: the user used to be dumped on the employer's portal to answer a
   * question we could have taken here.
   *
   * The backend merges the answers, calls `answer_library_service.remember()`
   * so the same question is never asked twice, re-runs resolution, and either
   * returns the still-missing `remaining` gaps or transitions the row onward
   * (`ready_for_review` / `approved` / `queued_for_execution`).
   *
   * Rides the existing ANY /api/apply/{proxy+} edge route - no new Terraform.
   * Business failures are 400 (validation) / 403 (`upgrade_required`) / 409
   * (`not_in_needs_input`) / 429 (quota); never a 401.
   */
  async answerNeedsInput(body: import('../types/autoSubmit').NeedsInputAnswerBody) {
    return this.request<import('../types/autoSubmit').NeedsInputAnswerResult>(
      '/apply/needs-input/answer',
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /**
   * Unified "Today" inbox - one backend-composed feed of everything that may
   * need the user today (approvals, auto-submit hand-offs, inbox suggestions,
   * "did you apply?" nudges). Newest-first, capped at 50 server-side.
   */
  async getTodayInbox() {
    return this.request<import('../types/todayInbox').TodayInbox>('/apply/today-inbox');
  }

  async markAutoSubmitSubmitted(applicationId: string) {
    return this.request<{
      approval: import('../types/autoSubmit').AutoSubmitApprovalView;
    }>('/apply/auto-submit/mark-submitted', {
      method: 'POST',
      body: JSON.stringify({ application_id: applicationId }),
    });
  }

  /**
   * Confirm an emailed approval link. The email's GET link is NON-mutating - it
   * 302s the browser to `/app/apply?approve=<token>`; the signed-in SPA
   * then POSTs the token HERE to actually approve (CSRF-safe: authorization is
   * the Bearer header, never an ambient cookie). Outcomes are read off the
   * status by the caller: 200 (approved / not-ready via `approved`), 409
   * (`link_already_used`), 403 (`not_authorized` - wrong account). A missing JWT
   * is the ONE legitimate 401 here (the decorator's contract), and this call
   * only runs for a signed-in user, so it never trips a spurious force-logout.
   */
  async confirmApproveLink(token: string) {
    return this.request<import('../types/autoSubmit').ApproveLinkResult>(
      '/apply/approve-link',
      { method: 'POST', body: JSON.stringify({ token }) },
    );
  }
}

export const apiService = new ApiService(API_BASE_URL);
