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

import { toast } from "sonner";

const LLM_RETRIES_EXHAUSTED_TOAST_ID = "llm-retries-exhausted";

function notifyLLMRetriesExhausted(): void {
  toast.error(
    "⚡ High demand right now. Please try again in a moment.",
    { id: LLM_RETRIES_EXHAUSTED_TOAST_ID, duration: 6000 },
  );
}

// In browser on production (non-localhost), always use same origin so /api hits CloudFront regardless of build env.
// This avoids API URL mismatch after infra changes (e.g. Lambda URL, domain).
function getApiBaseUrl(): string {
  const build = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  if (
    typeof window !== "undefined" &&
    window.location?.origin &&
    !window.location.origin.includes("localhost")
  )
    return `${window.location.origin}/api`;
  return build;
}
const API_BASE_URL = getApiBaseUrl();

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
  // Full error body for callers that need more than the error string —
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
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  }

  getToken(): string | null {
    return (
      this.token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("auth_token")
        : null)
    );
  }

  private static readonly REQUEST_TIMEOUT_MS = 15000;

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs?: number,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeoutMs || ApiService.REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 && token) {
        this.logout();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:session-expired"));
        }
        return { error: "Session expired. Please sign in again." };
      }

      if (!response.ok) {
        return {
          error:
            data.error || data.message || data.msg || `HTTP ${response.status}`,
          status: response.status,
          errorPayload: data,
        };
      }

      return { data, status: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return { error: "Request timed out. Please try again." };
      }
      return {
        error: error instanceof Error ? error.message : "Network error",
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
    }>("/auth/register", {
      method: "POST",
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

  async login(
    email: string,
    password: string,
    session_id?: string,
    fingerprint_hash?: string,
  ) {
    const response = await this.request<{
      access_token: string;
      email: string;
      role?: string;
      sector?: string;
    }>("/auth/login", {
      method: "POST",
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
    }>("/auth/profile", {
      method: "GET",
    });
  }

  async updateProfile(data: { name?: string; role?: string; sector?: string }) {
    return this.request<{
      email: string;
      name?: string;
      role?: string;
      sector?: string;
      created_at?: string;
    }>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async verifyToken() {
    return this.request<{ email: string; valid: boolean }>("/auth/verify", {
      method: "GET",
    });
  }

  async checkUser(fingerprint_hash: string) {
    return this.request<{ exists: boolean; email?: string }>(
      "/auth/check-user",
      {
        method: "POST",
        body: JSON.stringify({ fingerprint_hash }),
      },
    );
  }

  async requestPasswordReset(email: string) {
    return this.request<{ ok: boolean; message: string }>("/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ ok: boolean; message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  // ── Social sign-in ("Continue with …") ───────────────────────
  async getOAuthProviders() {
    return this.request<{ providers: string[] }>("/auth/oauth/providers");
  }

  /**
   * Begin a social sign-in: fetches the provider's authorize URL and (by
   * default) redirects the browser to it. The provider then 302s back to
   * /oauth/callback#token=… which AuthCallback consumes.
   */
  async beginSocialAuth(provider: string, opts?: { redirect?: boolean; fingerprint_hash?: string }) {
    const qs = opts?.fingerprint_hash
      ? `?fingerprint_hash=${encodeURIComponent(opts.fingerprint_hash)}`
      : "";
    const res = await this.request<{ authorize_url: string }>(
      `/auth/oauth/${encodeURIComponent(provider)}/authorize${qs}`,
    );
    if (res.data?.authorize_url && opts?.redirect !== false && typeof window !== "undefined") {
      window.location.assign(res.data.authorize_url);
    }
    return res;
  }

  // ── Personalization / onboarding preferences ─────────────────
  async savePreferences(prefs: Record<string, unknown>) {
    return this.request<Awaited<ReturnType<ApiService["getProfile"]>>["data"]>(
      "/auth/preferences",
      { method: "PUT", body: JSON.stringify(prefs) },
    );
  }

  // ── Billing / plan (freemium) ────────────────────────────────
  async getBillingPlan() {
    return this.request<{
      plan: string;
      plan_label?: string;
      plan_since?: string | null;
      features: string[];
      limits: Record<string, number | null>;
      usage: Record<string, {
        feature: string; used: number; limit: number | null; remaining: number | null;
        unlimited: boolean; period: string; resets_at: string; resets_in_seconds: number;
      }>;
      plans: Record<string, { label: string; price_monthly: number; features: string[]; limits: Record<string, number | null> }>;
    }>("/billing/plan");
  }

  async upgradePlan(tier: string) {
    return this.request<{ checkout_url: string | null; requested_tier: string | null; message: string }>(
      "/billing/upgrade",
      { method: "POST", body: JSON.stringify({ tier }) },
    );
  }

  // ── Learning Hub (Pillar B) ──────────────────────────────────
  /** Submit an AI study-plan generation job and poll until the plan is ready. */
  async createLearningPlan(
    topic: string,
    opts?: { target_role?: string; weeks?: number },
  ) {
    const submit = await this.request<{ job_id: string }>("/resume/learning/plan", {
      method: "POST",
      body: JSON.stringify({ topic, ...opts }),
    }, 30000);
    if (submit.error) return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    if (!submit.data?.job_id) return { error: "Failed to start plan generation" };
    return this.pollJob<{ path_id: string; path: import("../types/learning").LearningPath }>(
      submit.data.job_id,
      150000,
    );
  }

  async getLearningPaths() {
    return this.request<{ paths: import("../types/learning").LearningPathSummary[] }>(
      "/resume/learning/paths",
    );
  }

  /**
   * Cross-user market TREND signal: learning topics ranked by market demand ×
   * user gap × learnability (tilted by the user's real application outcomes).
   * Deterministic backend read — no async job. May return empty `items` with a
   * `note` when there isn't enough cross-user signal for the role yet.
   */
  async getLearningTrends(window = 90) {
    return this.request<import("../types/learning").LearningTrendsResult>(
      `/resume/learning/trends?window=${encodeURIComponent(window)}`,
    );
  }

  async getLearningPath(pathId: string) {
    return this.request<{
      path: import("../types/learning").LearningPath;
      progress: import("../types/learning").LearningProgress;
    }>(`/resume/learning/paths/${encodeURIComponent(pathId)}`);
  }

  async deleteLearningPath(pathId: string) {
    return this.request<{ ok: boolean }>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}`,
      { method: "DELETE" },
    );
  }

  async completeLearningModule(pathId: string, week: number) {
    return this.request<import("../types/learning").ModuleCompletionResult>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}/module/${week}/complete`,
      { method: "POST" },
      30000,
    );
  }

  async generateLearningQuiz(pathId: string, week: number) {
    return this.request<import("../types/learning").Quiz>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}/quiz`,
      { method: "POST", body: JSON.stringify({ week }) },
      60000,
    );
  }

  // ── Sprint Learning Hub (/api/resume/hub/*) ──────────────────
  // The 14-day Jira-ticket sprint. DISTINCT from the study-plan methods above
  // (/resume/learning/*) — different backend, different data model. Types live
  // in ../types/hub, consumed by hooks/useHub.ts.

  /** Resolve the user's sprint path, kicking off generation if none exists yet.
   *  Returns the full path when ready, or {status:"generating", job_id} while
   *  the async job runs — useHubPath polls on the non-ready shape. */
  async getHubPath(params?: import("../types/hub").HubPathParams) {
    return this.request<
      import("../types/hub").HubPath | import("../types/hub").HubPathPending
    >("/resume/hub/start", {
      method: "POST",
      body: JSON.stringify({
        ...(params?.role ? { role: params.role } : {}),
        ...(params?.difficulty ? { difficulty: params.difficulty } : {}),
      }),
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
          ...(note ? { note } : {}),
          ...(repoUrl ? { repo_url: repoUrl } : {}),
          ...(params?.role ? { role: params.role } : {}),
          ...(params?.difficulty ? { difficulty: params.difficulty } : {}),
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
  }) {
    return this.request<import("../types/hub").MentorAnswer>(
      "/resume/hub/mentor",
      { method: "POST", body: JSON.stringify(body) },
      60000,
    );
  }

  /** Admin role/difficulty preview travels as query params on hub GETs. */
  private hubQuery(params?: import("../types/hub").HubPathParams) {
    const qs = new URLSearchParams();
    if (params?.role) qs.set("role", params.role);
    if (params?.difficulty) qs.set("difficulty", params.difficulty);
    const s = qs.toString();
    return s ? `?${s}` : "";
  }

  // ── §6.6 Learning loop: "Your edge" ──────────────────────────
  // find trending gaps → adaptive plan → per-task GitHub + verify → share.

  /**
   * Surface 2–4 trending, closeable market differentiators.
   * Async (202 → poll). May return <2 with a `note`; 404 when the feature is
   * disabled for this account — callers should hide the whole surface then.
   */
  async findDifferentiators(): Promise<
    ApiResponse<import("../types/learning").DifferentiatorsResult>
  > {
    const submit = await this.request<{ job_id: string }>(
      "/resume/learning/differentiators",
      { method: "POST", body: "{}" },
      30000,
    );
    if (submit.error)
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    if (!submit.data?.job_id) return { error: "Could not find your edge" };
    return this.pollJob<import("../types/learning").DifferentiatorsResult>(
      submit.data.job_id,
      150000,
    );
  }

  /** Generate an adaptive practical plan for a picked differentiator + depth. */
  async generateEdgePlan(
    body: import("../types/learning").EdgePlanRequest,
  ): Promise<ApiResponse<import("../types/learning").EdgePlan>> {
    const submit = await this.request<{ job_id: string }>(
      "/resume/learning/plan",
      { method: "POST", body: JSON.stringify(body) },
      30000,
    );
    if (submit.error)
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    if (!submit.data?.job_id) return { error: "Could not build your plan" };
    return this.pollJob<import("../types/learning").EdgePlan>(submit.data.job_id, 180000);
  }

  /** Full edge path (tasks list) for reload/resume. */
  async getEdgePath(pathId: string) {
    return this.request<import("../types/learning").EdgePlan>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}`,
    );
  }

  /** Create/point a GitHub repo for a task; returns repo link or push steps. */
  async syncTaskGithub(pathId: string, taskRef: string) {
    return this.request<import("../types/learning").EdgeGithubSync>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}/task/${encodeURIComponent(taskRef)}/github`,
      { method: "POST", body: "{}" },
      30000,
    );
  }

  /** Verify a task's proof (repo / PR / URL / writeup). Async (202 → poll). */
  async verifyTask(
    pathId: string,
    taskRef: string,
    body: import("../types/learning").EdgeVerifyRequest,
  ): Promise<ApiResponse<import("../types/learning").EdgeVerifyResult>> {
    const submit = await this.request<{ job_id: string }>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}/task/${encodeURIComponent(taskRef)}/verify`,
      { method: "POST", body: JSON.stringify(body) },
      30000,
    );
    if (submit.error)
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    if (!submit.data?.job_id) return { error: "Could not start verification" };
    return this.pollJob<import("../types/learning").EdgeVerifyResult>(
      submit.data.job_id,
      150000,
    );
  }

  /**
   * Draft a "share the win" post for a verified task. Async (202 → poll).
   * Returns 400 `not_verified` if called before the task is verified.
   */
  async draftWinPost(
    pathId: string,
    taskRef: string,
  ): Promise<ApiResponse<import("../types/learning").EdgePostDraft>> {
    const submit = await this.request<{ job_id: string }>(
      `/resume/learning/paths/${encodeURIComponent(pathId)}/task/${encodeURIComponent(taskRef)}/post`,
      { method: "POST", body: "{}" },
      30000,
    );
    if (submit.error)
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    if (!submit.data?.job_id) return { error: "Could not draft your post" };
    return this.pollJob<import("../types/learning").EdgePostDraft>(
      submit.data.job_id,
      150000,
    );
  }

  /**
   * Publish a drafted win post. `manual` returns copy/open-LinkedIn info;
   * `auto` schedules with a 30-min hold (403 `upgrade_required` unless Premium+).
   */
  async publishWinPost(
    draftId: string,
    body: { mode: "manual" | "auto"; variant_index: number },
  ) {
    return this.request<import("../types/learning").EdgePublishResult>(
      `/resume/learning/posts/${encodeURIComponent(draftId)}/publish`,
      { method: "POST", body: JSON.stringify(body) },
      30000,
    );
  }

  /** Cancel a scheduled (auto-held) win post before it goes out. */
  async cancelWinPost(scheduleId: string) {
    return this.request<{ ok: boolean; cancelled?: boolean }>(
      `/resume/learning/posts/${encodeURIComponent(scheduleId)}/cancel`,
      { method: "POST", body: "{}" },
    );
  }

  // ── Interview Pattern Coach + salary (Pillar D) ──────────────
  async getInterviewCoach() {
    return this.request<import("../types/interview").CoachSummary>(
      "/resume/interview/coach",
      {},
      45000,
    );
  }

  async getInterviewAttempts(limit = 50) {
    return this.request<{ attempts: import("../types/interview").InterviewAttempt[] }>(
      `/resume/interview/attempts?limit=${limit}`,
    );
  }

  async getInterviewFit(recordId: string) {
    return this.request<import("../types/interview").InterviewFit>(
      "/resume/interview/fit",
      { method: "POST", body: JSON.stringify({ record_id: recordId }) },
      45000,
    );
  }

  async getSalaryEstimate(role: string, opts?: { level?: string; location?: string }) {
    return this.request<import("../types/interview").SalaryEstimate>(
      "/resume/salary",
      { method: "POST", body: JSON.stringify({ role, ...opts }) },
      45000,
    );
  }

  // ── Events (hackathons/webinars) + post drafting (Pillar C) ──
  async getEvents(type?: "hackathon" | "webinar") {
    const qs = type ? `?type=${type}` : "";
    return this.request<{ events: import("../types/events").EventItem[] }>(`/resume/events${qs}`);
  }

  async refreshEvents() {
    const submit = await this.request<{ job_id: string }>("/resume/events/refresh", { method: "POST" }, 30000);
    if (submit.error) return { error: submit.error, status: submit.status };
    if (!submit.data?.job_id) return { error: "Could not start refresh" };
    return this.pollJob<{ upserted: number; by_source: Record<string, number> }>(submit.data.job_id, 90000);
  }

  async getEvent(eventId: string) {
    return this.request<import("../types/events").EventItem>(`/resume/events/${encodeURIComponent(eventId)}`);
  }

  async setEventRelation(
    eventId: string,
    relation: import("../types/events").EventRelation,
    opts?: { outcome?: string; notes?: string },
  ) {
    return this.request<{ event_id: string; relation: string }>(
      `/resume/events/${encodeURIComponent(eventId)}/relation`,
      { method: "POST", body: JSON.stringify({ relation, ...opts }) },
    );
  }

  async draftPost(input: { event_id?: string; achievement?: string; audience?: string; relation?: string }) {
    const submit = await this.request<{ job_id: string }>("/resume/events/draft-post", {
      method: "POST",
      body: JSON.stringify(input),
    }, 30000);
    if (submit.error) return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    if (!submit.data?.job_id) return { error: "Could not start drafting" };
    return this.pollJob<{ draft_id: string; variants: import("../types/events").PostVariant[] }>(
      submit.data.job_id,
      120000,
    );
  }

  async getPosts() {
    return this.request<{ posts: import("../types/events").PostDraft[] }>("/resume/posts");
  }

  // ── Personalized recommendations (Pillar A) ──────────────────
  async getRecommendations() {
    return this.request<{ recommendations: import("../types/recommendations").Recommendation[] }>(
      "/resume/recommendations",
    );
  }

  // ── Cross-feature dashboard overview (interconnection layer) ──
  async getOverview() {
    return this.request<import("../types/overview").DashboardOverview>("/resume/overview");
  }

  // ── Career Readiness Score (the Compass spine) ──
  async getCareerReadiness() {
    return this.request<import("../types/career").CareerReadiness>(
      "/resume/career-readiness",
    );
  }

  async getGithub() {
    return this.request<{ linked: boolean; profile: import("../types/career").GithubProfile | null }>(
      "/resume/github",
    );
  }

  async linkGithub(username: string) {
    return this.request<{ linked: boolean; profile: import("../types/career").GithubProfile }>(
      "/resume/github/link",
      { method: "POST", body: JSON.stringify({ username }) },
    );
  }

  async auditLinkedin(linkedinUrl: string) {
    return this.request<import("../types/career").LinkedinAudit>(
      "/resume/linkedin/audit",
      { method: "POST", body: JSON.stringify({ linkedin_url: linkedinUrl }) },
    );
  }

  // ── Connect & act: GitHub / LinkedIn OAuth integrations ──────
  async getConnectStatus() {
    return this.request<import("../types/career").ConnectStatus>(
      "/resume/connect/status",
    );
  }

  async getConnectAuthorizeUrl(provider: "github" | "linkedin") {
    return this.request<{ authorize_url: string }>(
      `/resume/connect/${provider}/authorize`,
    );
  }

  async disconnectProvider(provider: "github" | "linkedin") {
    return this.request<{ ok: boolean }>(
      `/resume/connect/${provider}/disconnect`,
      { method: "POST" },
    );
  }

  async publishGithubProject(payload: {
    name: string;
    description?: string;
    kind?: string;
  }) {
    return this.request<{ repo_url: string; files: string[] }>(
      "/resume/connect/github/publish",
      { method: "POST", body: JSON.stringify(payload) },
      30000,
    );
  }

  async postToLinkedin(text: string) {
    return this.request<{ post_url: string | null; post_id: string | null }>(
      "/resume/connect/linkedin/post",
      { method: "POST", body: JSON.stringify({ text }) },
      30000,
    );
  }

  async getVisaProfile() {
    return this.request<{ profile: import("../types/visa").VisaProfile }>(
      "/resume/visa/profile",
      { method: "GET" },
    );
  }

  async saveVisaProfile(profile: import("../types/visa").VisaProfile) {
    return this.request<{ ok: boolean; profile: import("../types/visa").VisaProfile }>(
      "/resume/visa/profile",
      { method: "PUT", body: JSON.stringify(profile) },
    );
  }

  async getVisaTimeline() {
    return this.request<{
      profile: import("../types/visa").VisaProfile;
      milestones: import("../types/visa").VisaMilestone[];
      recommendation?: string;
    }>("/resume/visa/timeline", { method: "GET" });
  }

  /** OPT Clock — the calm unemployment-days runway payload (no polling). */
  async optClock() {
    return this.request<import("../types/visa").OptClock>(
      "/resume/opt-clock",
      { method: "GET" },
    );
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
    }>("/resume/beta/morning-brief", { method: "GET" });
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
      "/resume/beta/similar-roles",
      { method: "POST", body: JSON.stringify({ jd_text: jdText, limit }) },
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
    }>("/resume/beta/ab-telemetry", { method: "GET" });
  }

  async checkEmail(email: string) {
    return this.request<{ exists: boolean }>("/auth/check-email", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async validatePassword(email: string, password: string) {
    return this.request<{ valid: boolean }>("/auth/validate-password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  // ============================================
  // Health check
  // ============================================

  async healthCheck() {
    return this.request<{
      status: string;
      service: string;
      version: string;
    }>("/health", {
      method: "GET",
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
      visa_filters?: import("../types/jobs").VisaFilters;
    },
    onPartial?: (partial: import("../types/jobs").JobSearchResponse) => void,
  ) {
    const searchParams = new URLSearchParams();
    searchParams.set("q", params.q);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.location) searchParams.set("location", params.location);
    if (params.date_posted) searchParams.set("date_posted", params.date_posted);
    if (params.remote) searchParams.set("remote", "true");
    if (params.type) searchParams.set("type", params.type);
    if (params.h1b_only) searchParams.set("h1b_only", "true");
    if (params.visa_or_contract) searchParams.set("visa_or_contract", "true");
    if (params.experience_level) searchParams.set("experience_level", params.experience_level);
    if (params.source) searchParams.set("source", params.source);
    searchParams.set("include_company_careers", params.include_company_careers ? "true" : "false");
    searchParams.set("use_resume_recommendations", params.use_resume_recommendations ? "true" : "false");
    if (params.force_refresh) searchParams.set("force_refresh", "true");
    // Serialize visa toggles as a compact JSON blob (only the truthy ones) so
    // the backend can parse one param instead of colliding with existing names.
    if (params.visa_filters) {
      const active = Object.fromEntries(
        Object.entries(params.visa_filters).filter(([, v]) => v),
      );
      if (Object.keys(active).length > 0) {
        searchParams.set("visa_filters", JSON.stringify(active));
      }
    }
    const submitResp = await this.request<
      | { job_id: string }
      | import("../types/jobs").JobSearchResponse
    >(`/jobs/search?${searchParams.toString()}`);
    if (submitResp.error) return { error: submitResp.error };
    if ("job_id" in (submitResp.data || {})) {
      return this.pollJob<import("../types/jobs").JobSearchResponse>(
        (submitResp.data as { job_id: string }).job_id,
        300000,
        undefined,
        onPartial,
      );
    }
    return submitResp as ApiResponse<import("../types/jobs").JobSearchResponse>;
  }

  async batchSearchJobs(
    params: import("../types/jobs").BatchSearchParams,
    onPartial?: (partial: import("../types/jobs").BatchSearchResponse) => void,
  ) {
    const submitResp = await this.request<
      { job_id: string } | import("../types/jobs").BatchSearchResponse
    >(
      "/jobs/batch-search",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      30000,
    );
    if (submitResp.error) return { error: submitResp.error };
    if ("job_id" in (submitResp.data || {})) {
      return this.pollJob<import("../types/jobs").BatchSearchResponse>(
        (submitResp.data as { job_id: string }).job_id,
        300000,
        undefined,
        onPartial,
      );
    }
    return submitResp as ApiResponse<import("../types/jobs").BatchSearchResponse>;
  }

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

  async suggestPipelineFilters() {
    return this.request<{ suggestions: import("../types/jobs").SmartFilterSuggestions }>(
      "/jobs/pipeline/suggest-filters",
      { method: "GET" },
      45000,
    );
  }

  async pipelineMatchScores(
    items: Array<{ id: string; title?: string; description?: string }>,
  ) {
    // Deterministic regex match against the user's parsed resume skills.
    // Fast (no LLM), so a 100-row batch lands in well under a second; the
    // caller fires this once per pipeline run.
    return this.request<{
      scores: Record<string, {
        match_score: number;
        matched_skills: string[];
        missing_top: string[];
        explain: string;
      }>;
      meta: { resume_skill_count: number; has_resume: boolean };
    }>(
      "/jobs/pipeline/match-scores",
      { method: "POST", body: JSON.stringify({ items }) },
      30000,
    );
  }

  async fetchJobDescription(url: string) {
    // 45s — the backend tries direct strategies (~12s budget each) then falls
    // back to Apify's browser-rendered scrape (~30s). 20s was leaving Apify
    // results on the floor for LinkedIn / Workday SPA postings.
    return this.request<{ ok: boolean; jd_text?: string; source_kind?: string; error?: string }>(
      "/jobs/fetch-jd",
      { method: "POST", body: JSON.stringify({ url }) },
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
      "/jobs/draft-outreach",
      { method: "POST", body: JSON.stringify(input) },
      30000,
    );
  }

  async listPipelinePresets() {
    return this.request<{ presets: import("../types/jobs").PipelinePreset[] }>(
      "/jobs/pipeline/presets",
      { method: "GET" },
    );
  }

  async savePipelinePreset(name: string, filters: import("../types/jobs").DailyPipelineParams) {
    return this.request<{ ok: boolean; presets: import("../types/jobs").PipelinePreset[] }>(
      "/jobs/pipeline/presets",
      {
        method: "POST",
        body: JSON.stringify({ name, filters }),
      },
    );
  }

  async deletePipelinePreset(name: string) {
    return this.request<{ ok: boolean; presets: import("../types/jobs").PipelinePreset[] }>(
      `/jobs/pipeline/presets/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
  }

  async runDailyPipeline(
    params: import("../types/jobs").DailyPipelineParams,
    onPartial?: (partial: import("../types/jobs").DailyPipelineResult) => void,
  ): Promise<ApiResponse<import("../types/jobs").DailyPipelineResult>> {
    const submitResp = await this.request<{ job_id: string }>(
      "/jobs/pipeline",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      30000,
    );
    if (submitResp.error) return { error: submitResp.error };
    if (!submitResp.data?.job_id) return { error: "Failed to start pipeline" };
    return this.pollJob<import("../types/jobs").DailyPipelineResult>(
      submitResp.data.job_id,
      900000,
      undefined,
      onPartial,
    );
  }

  async analyzeJob(
    job: import("../types/jobs").Job,
    action: "summarize" | "missing_skills" | "cover_letter",
  ) {
    return this.request<{ result: string; action: string }>("/jobs/analyze", {
      method: "POST",
      body: JSON.stringify({ job, action }),
    });
  }

  async checkJobTrust(job: import("../types/jobs").Job) {
    return this.request<import("../types/jobs").JobTrustResult>(
      "/jobs/trust-check",
      {
        method: "POST",
        body: JSON.stringify({ job }),
      },
    );
  }

  async uploadResume(
    file: File,
  ): Promise<ApiResponse<{ resume: import("../types/jobs").ParsedResume }>> {
    const formData = new FormData();
    formData.append("file", file);
    const token = this.getToken();
    const url = `${this.baseURL}/jobs/resume`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        return { error: data.error || `HTTP ${response.status}` };
      return { data } as ApiResponse<{
        resume: import("../types/jobs").ParsedResume;
      }>;
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  async getResume() {
    return this.request<{ resume: import("../types/jobs").ParsedResume }>(
      "/jobs/resume",
    );
  }

  async tailorResume(jobDescription: string) {
    return this.request<{ tailored: import("../types/jobs").TailoredResume }>(
      "/jobs/tailor-resume",
      {
        method: "POST",
        body: JSON.stringify({ job_description: jobDescription }),
      },
      30000,
    );
  }

  async getSavedJobs() {
    return this.request<{ jobs: import("../types/jobs").SavedJob[] }>(
      "/jobs/saved",
    );
  }

  async getJobFilters() {
    return this.request<import("../types/jobs").SavedJobFilters>(
      "/jobs/filters",
    );
  }

  async saveJobFilters(filters: import("../types/jobs").JobSearchFilters) {
    return this.request<import("../types/jobs").SavedJobFilters>(
      "/jobs/filters",
      {
        method: "PUT",
        body: JSON.stringify({ filters }),
      },
    );
  }

  async saveJob(job: import("../types/jobs").Job) {
    return this.request<{ job: import("../types/jobs").SavedJob }>(
      "/jobs/saved",
      {
        method: "POST",
        body: JSON.stringify({ job }),
      },
    );
  }

  async updateSavedJob(
    jobId: string,
    data: { status?: string; notes?: string },
  ) {
    return this.request<{ job: import("../types/jobs").SavedJob }>(
      `/jobs/saved/${jobId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  }

  async deleteSavedJob(jobId: string) {
    return this.request<{ message: string }>(`/jobs/saved/${jobId}`, {
      method: "DELETE",
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
      sponsorship: import("../types/jobs").SponsorshipSignal | null;
    }>(`/jobs/sponsorship?company=${encodeURIComponent(company)}`);
  }

  // ============================================
  // Resume Parser endpoints (/api/resume)
  // - Async job pattern: submit -> poll -> result
  // ============================================

  async getResumeStatus() {
    return this.request<import("../types/resume").ResumeStatus>(
      "/resume/status",
    );
  }

  async uploadResumeForParser(
    file: File,
  ): Promise<ApiResponse<{ resume: import("../types/jobs").ParsedResume }>> {
    const formData = new FormData();
    formData.append("file", file);
    const token = this.getToken();
    const url = `${this.baseURL}/resume/upload`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        return { error: "Session expired. Please sign in again." };
      }
      if (!response.ok)
        return { error: data.error || `HTTP ${response.status}` };

      // Backend returns { job_id } with 202 — poll for the parsed result
      if (data.job_id) {
        const pollResult = await this.pollJob<{ parsed_resume: any }>(
          data.job_id,
          120000,
        );
        return pollResult;
      }

      // Fallback: if backend returns the resume directly (shouldn't happen, but safe)
      return { data } as ApiResponse<{ parsed_resume: any }>;
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        error: error instanceof Error ? error.message : "Upload failed",
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
   *   caller can stream in partial results (e.g. job-search sources that
   *   have finished while others are still running).
   */
  private async pollJob<T>(
    jobId: string,
    maxWaitMs = 120000,
    signal?: AbortSignal,
    onPartial?: (partial: T) => void,
    // Fires on every poll tick with the raw backend job status (queued →
    // processing → completed/failed) so callers can drive a REAL progress
    // indicator instead of a wall-clock guess. Additive/optional — existing
    // callers are unaffected.
    onStatus?: (status: import("../types/resume").JobStatus) => void,
  ): Promise<ApiResponse<T>> {
    const pollInterval = 2000;
    const startTime = Date.now();
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    while (Date.now() - startTime < maxWaitMs) {
      if (signal?.aborted) return { error: "Cancelled" };

      const resp = await this.request<{
        status: import("../types/resume").JobStatus;
        result?: T;
        error?: string;
        error_code?: string;
      }>(`/resume/job/${jobId}`, {}, 30000);

      if (resp.error) {
        consecutiveErrors++;
        if (consecutiveErrors >= maxConsecutiveErrors) {
          return { error: resp.error };
        }
        // Transient error (cold start / brief timeout) — wait and retry
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      }

      consecutiveErrors = 0;
      const job = resp.data;
      if (!job) return { error: "Job not found" };

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

      if (job.status === "completed" && job.result) {
        return { data: job.result as unknown as T };
      }

      if (job.status === "failed") {
        if (job.error_code === "LLM_RETRIES_EXHAUSTED") {
          notifyLLMRetriesExhausted();
          return { error: "" };
        }
        return { error: job.error || "Job failed. Please try again." };
      }

      // Still processing — stream whatever partial result has been written.
      if (onPartial && job.result) {
        try {
          onPartial(job.result as unknown as T);
        } catch {
          // Callback errors should never abort polling.
        }
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return { error: "Request timed out. Please try again." };
  }

  async extractJD(
    jobDescription: string,
    signal?: AbortSignal,
  ): Promise<
    ApiResponse<{ jd_analysis: import("../types/resume").JDAnalysis }>
  > {
    const submitResp = await this.request<{ job_id: string }>(
      "/resume/extract-jd",
      {
        method: "POST",
        body: JSON.stringify({ job_description: jobDescription }),
      },
      30000,
    );
    if (submitResp.error) return { error: submitResp.error };
    if (!submitResp.data?.job_id) return { error: "Failed to submit job" };

    return this.pollJob<{ jd_analysis: import("../types/resume").JDAnalysis }>(
      submitResp.data.job_id,
      120000,
      signal,
    );
  }

  async tailorResumeForParser(
    jdAnalysis: import("../types/resume").JDAnalysis,
    signal?: AbortSignal,
  ): Promise<
    ApiResponse<{
      tailored_resume: import("../types/resume").TailoredFullResume;
    }>
  > {
    const submitResp = await this.request<{ job_id: string }>(
      "/resume/tailor",
      { method: "POST", body: JSON.stringify({ jd_analysis: jdAnalysis }) },
      30000,
    );
    if (submitResp.error) return { error: submitResp.error };
    if (!submitResp.data?.job_id) return { error: "Failed to submit job" };

    return this.pollJob<{
      tailored_resume: import("../types/resume").TailoredFullResume;
    }>(submitResp.data.job_id, 120000, signal);
  }

  // Combined endpoint: extracts JD analysis AND tailors the resume inside a
  // single Lambda invocation, returning both. Saves ~22s (no inter-job HTTP
  // round-trip) plus ~10s from parallel project generation. The legacy
  // extractJD + tailorResumeForParser pair remains available as a fallback.
  async tailorResumeWithJDText(
    jobDescription: string,
    signal?: AbortSignal,
    // Optional real-progress hooks — onStatus receives the backend job status
    // on every poll tick; onProgress receives the honest sub-phase marker the
    // backend writes into job.result.progress at each real pipeline stage.
    onStatus?: (status: import("../types/resume").JobStatus) => void,
    onProgress?: (p: import("../types/resume").TailorJobProgress) => void,
  ): Promise<
    ApiResponse<{
      jd_analysis: import("../types/resume").JDAnalysis;
      tailored_resume: import("../types/resume").TailoredFullResume;
      // Post-backfill base resume (present on new backends) — enables
      // diff-vs-base without a second round-trip.
      base_resume?: import("../types/resume").TailoredFullResume;
    }>
  > {
    const submitResp = await this.request<{ job_id: string }>(
      "/resume/tailor-with-jd",
      {
        method: "POST",
        body: JSON.stringify({ job_description: jobDescription }),
      },
      30000,
    );
    if (submitResp.error) {
      // Forward status + errorPayload so callers can detect 429
      // daily_quota_exceeded (and 403 upgrade_required) and surface the
      // right dialog. Previously we only forwarded the error string,
      // silently dropping the structured payload — quota dialog never fired.
      return {
        error: submitResp.error,
        status: submitResp.status,
        errorPayload: submitResp.errorPayload,
      };
    }
    if (!submitResp.data?.job_id) return { error: "Failed to submit job" };

    return this.pollJob<{
      jd_analysis: import("../types/resume").JDAnalysis;
      tailored_resume: import("../types/resume").TailoredFullResume;
      base_resume?: import("../types/resume").TailoredFullResume;
    }>(
      submitResp.data.job_id,
      120000,
      signal,
      // While processing, the only partial the tailor job writes is the
      // progress marker — forward it when present.
      (partial) => {
        const p = (
          partial as { progress?: import("../types/resume").TailorJobProgress }
        ).progress;
        if (p?.phase && onProgress) onProgress(p);
      },
      onStatus,
    );
  }

  async regenerateResume(
    tailoredResume: import("../types/resume").TailoredFullResume,
    jdAnalysis: import("../types/resume").JDAnalysis,
    userFeedback: string,
    signal?: AbortSignal,
  ): Promise<
    ApiResponse<{
      tailored_resume: import("../types/resume").TailoredFullResume;
    }>
  > {
    const submitResp = await this.request<{ job_id: string }>(
      "/resume/regenerate",
      {
        method: "POST",
        body: JSON.stringify({
          tailored_resume: tailoredResume,
          jd_analysis: jdAnalysis,
          user_feedback: userFeedback,
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
    if (!submitResp.data?.job_id)
      return { error: "Failed to submit regeneration job" };

    return this.pollJob<{
      tailored_resume: import("../types/resume").TailoredFullResume;
    }>(submitResp.data.job_id, 120000, signal);
  }

  async rewriteBullet(
    bullet: string,
    jobTitle?: string,
    company?: string,
    jdKeywords?: string[],
  ): Promise<ApiResponse<{ rewritten: string }>> {
    return this.request("/resume/rewrite-bullet", {
      method: "POST",
      body: JSON.stringify({
        bullet,
        job_title: jobTitle || "",
        company: company || "",
        jd_keywords: jdKeywords || [],
      }),
    });
  }

  async fetchATSScores(
    tailoredResume: import("../types/resume").TailoredFullResume,
    jdAnalysis: import("../types/resume").JDAnalysis,
    signal?: AbortSignal,
  ): Promise<ApiResponse<{ ats_scores: import("../types/resume").ATSScores }>> {
    const submitResp = await this.request<{ job_id: string }>(
      "/resume/ats-scores",
      {
        method: "POST",
        body: JSON.stringify({
          tailored_resume: tailoredResume,
          jd_analysis: jdAnalysis,
        }),
      },
      30000,
    );
    if (submitResp.error) return { error: submitResp.error };
    if (!submitResp.data?.job_id) return { error: "Failed to submit job" };

    return this.pollJob<{ ats_scores: import("../types/resume").ATSScores }>(
      submitResp.data.job_id,
      120000,
      signal,
    );
  }

  async saveTailoringRecord(data: {
    record_id?: string;
    jd_text?: string;
    jd_analysis?: any;
    tailored_resume?: any;
    ats_scores?: any;
    base_resume_filename?: string;
    base_resume_s3_key?: string;
  }): Promise<ApiResponse<{ record_id: string; updated?: boolean }>> {
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      tz = undefined;
    }
    return this.request("/resume/save-record", {
      method: "POST",
      body: JSON.stringify({ ...data, tz }),
    });
  }

  // ============================================
  // Resume management endpoints
  // ============================================

  async listBaseResumes(): Promise<ApiResponse<{ versions: any[] }>> {
    return this.request("/resume/versions");
  }

  async listGeneratedResumes(): Promise<ApiResponse<{ generated: any[] }>> {
    return this.request("/resume/generated");
  }

  async listTailoringRecords(): Promise<
    ApiResponse<{ records: import("../types/resume").TailoringRecord[] }>
  > {
    return this.request("/resume/tailoring-records");
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
    let tz = "";
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      tz = "";
    }
    const qs = tz ? `?tz=${encodeURIComponent(tz)}` : "";
    return this.request(`/resume/streak${qs}`);
  }

  async batchTailor(
    jdList: { text: string; title: string; source_job_id?: string }[],
  ): Promise<ApiResponse<{ jobs: { job_id: string; title: string }[] }>> {
    return this.request(
      "/resume/batch-tailor",
      {
        method: "POST",
        body: JSON.stringify({ jd_list: jdList }),
      },
      30000,
    );
  }

  async generateCoverLetter(
    tailoredResume: import("../types/resume").TailoredFullResume,
    jdAnalysis: import("../types/resume").JDAnalysis,
    signal?: AbortSignal,
  ): Promise<ApiResponse<{ cover_letter: string }>> {
    const submitResp = await this.request<{ job_id: string }>(
      "/resume/cover-letter",
      {
        method: "POST",
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
    if (!submitResp.data?.job_id) return { error: "Failed to submit job" };

    return this.pollJob<{ cover_letter: string }>(
      submitResp.data.job_id,
      120000,
      signal,
    );
  }

  async downloadCoverLetterPDF(
    coverLetter: string,
    candidateName: string,
    jobTitle: string,
    company: string,
  ): Promise<{ data?: Blob; error?: string; filename?: string }> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const resp = await fetch(`${this.baseURL}/resume/cover-letter/download`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          cover_letter: coverLetter,
          candidate_name: candidateName,
          job_title: jobTitle,
          company,
        }),
      });
      if (!resp.ok) {
        const err = await resp
          .json()
          .catch(() => ({ error: "Download failed" }));
        return { error: err.error || "Download failed" };
      }
      const blob = await resp.blob();
      const cd = resp.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^"]+)"?/);
      return { data: blob, filename: match?.[1] || "cover_letter.pdf" };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Download failed" };
    }
  }

  async pollJobStatus<T>(
    jobId: string,
  ): Promise<ApiResponse<T & { status: import("../types/resume").JobStatus }>> {
    const resp = await this.request<
      T & {
        status: import("../types/resume").JobStatus;
        error?: string;
        error_code?: string;
      }
    >(`/resume/job/${jobId}`);
    if (resp.data?.error_code === "LLM_RETRIES_EXHAUSTED") {
      notifyLLMRetriesExhausted();
      resp.data = { ...resp.data, error: "" };
    }
    return resp;
  }

  async getTechChronicle(category: string = "all"): Promise<
    ApiResponse<{
      items: import("../types/techChronicle").TechChronicleItem[];
      trendingTags: string[];
      generatedAt: string | null;
    }>
  > {
    return this.request(
      `/tech-chronicle?category=${encodeURIComponent(category)}`,
    );
  }

  async setActiveResume(s3Key: string): Promise<ApiResponse<any>> {
    return this.request("/resume/active", {
      method: "PUT",
      body: JSON.stringify({ s3_key: s3Key }),
    });
  }

  async deleteResume(s3Key: string): Promise<ApiResponse<any>> {
    return this.request(`/resume/file/${encodeURIComponent(s3Key)}`, {
      method: "DELETE",
    });
  }

  async downloadResumeFile(s3Key: string): Promise<Blob> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(
      `${this.baseURL}/resume/download-file/${encodeURIComponent(s3Key)}`,
      {
        headers,
      },
    );
    if (!response.ok) throw new Error("Download failed");
    return response.blob();
  }

  async downloadTailoredResume(
    tailoredResume: import("../types/resume").TailoredFullResume,
    jdAnalysis: import("../types/resume").JDAnalysis,
    format: "pdf" | "docx",
    opts?: {
      recordId?: string;
      versionId?: string;
      source?: "initial" | "regenerated" | "edited";
      autoSaveOnEdit?: boolean;
    },
  ): Promise<{ data?: Blob; error?: string; filename?: string }> {
    const token = this.getToken();
    const url = `${this.baseURL}/resume/download`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          tailored_resume: tailoredResume,
          jd_analysis: jdAnalysis,
          format,
          job_title: jdAnalysis.job_title || "untitled",
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
        return { error: errData.error || `HTTP ${response.status}` };
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `resume.${format}`;
      return { data: blob, filename };
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        error: error instanceof Error ? error.message : "Download failed",
      };
    }
  }

  // ============================================
  // Tailoring record versioning
  // ============================================

  async saveResumeVersion(
    recordId: string,
    data: {
      tailored_resume: import("../types/resume").TailoredFullResume;
      source: "initial" | "regenerated" | "edited";
      user_feedback?: string;
      ats_scores?: import("../types/resume").ATSScores;
      parent_version_id?: string;
      set_current?: boolean;
    },
  ): Promise<
    ApiResponse<{
      version_id: string;
      version_number: number;
      content_hash: string;
      created: boolean;
    }>
  > {
    return this.request(`/resume/tailoring-records/${recordId}/versions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async setCurrentResumeVersion(
    recordId: string,
    versionId: string,
  ): Promise<ApiResponse<{ current_version_id: string }>> {
    return this.request(
      `/resume/tailoring-records/${recordId}/current-version`,
      {
        method: "PUT",
        body: JSON.stringify({ version_id: versionId }),
      },
    );
  }

  async getTailoringRecord(
    recordId: string,
  ): Promise<
    ApiResponse<{ record: import("../types/resume").TailoringRecord }>
  > {
    return this.request(`/resume/tailoring-records/${recordId}`);
  }

  async deleteTailoringRecord(
    recordId: string,
  ): Promise<ApiResponse<any>> {
    return this.request(`/resume/tailoring-records/${recordId}`, {
      method: "DELETE",
    });
  }

  async updateApplication(
    recordId: string,
    patch: {
      status?:
        | "draft"
        | "applied"
        | "interviewing"
        | "offer"
        | "rejected"
        | "withdrawn"
        | "ghosted";
      applied_at?: string | null;
      next_action_date?: string | null;
      next_action_note?: string;
      notes?: string;
      recruiter_name?: string;
      recruiter_email?: string;
      recruiter_company?: string;
      job_url?: string;
      interview_dates?: string[];
      /** Clears the "Did you apply?" prompt set on batch-tailored items. */
      batch_confirmation_pending?: boolean;
    },
  ): Promise<
    ApiResponse<{ application: import("../types/resume").ApplicationInfo }>
  > {
    return this.request(
      `/resume/tailoring-records/${recordId}/application`,
      {
        method: "PATCH",
        body: JSON.stringify(patch),
      },
    );
  }

  async generateInterviewPrep(
    recordId: string,
    opts?: { force?: boolean },
  ): Promise<
    ApiResponse<{
      interview_prep: {
        content: import("../types/resume").InterviewPrepContent;
        generated_at: string;
        grounded_version_id?: string;
      };
      cached: boolean;
    }>
  > {
    return this.request(
      `/resume/tailoring-records/${recordId}/interview-prep`,
      {
        method: "POST",
        body: JSON.stringify({ force: !!opts?.force }),
      },
      90000,
    );
  }

  async getPracticeQuestion(
    recordId: string,
    body: {
      category: "behavioral" | "technical" | "company" | "coding"
        | "system_design" | "case_study" | "data_challenge";
      difficulty: import("../types/resume").QDifficulty;
      seen_titles?: string[];
      focus?: string;
    },
  ): Promise<ApiResponse<{ category: string; difficulty: string; question: any }>> {
    return this.request(
      `/resume/tailoring-records/${recordId}/practice-question`,
      { method: "POST", body: JSON.stringify(body) },
      60000,
    );
  }

  async chatWithCoach(
    recordId: string,
    message: string,
  ): Promise<ApiResponse<{ reply: string; messages: import("../types/resume").ChatMessage[] }>> {
    return this.request(
      `/resume/tailoring-records/${recordId}/chat`,
      { method: "POST", body: JSON.stringify({ message }) },
      60000,
    );
  }

  async resetCoachChat(
    recordId: string,
  ): Promise<ApiResponse<{ messages: import("../types/resume").ChatMessage[] }>> {
    return this.request(
      `/resume/tailoring-records/${recordId}/chat`,
      { method: "POST", body: JSON.stringify({ reset: true }) },
    );
  }

  async getCoachChat(
    recordId: string,
  ): Promise<ApiResponse<{ messages: import("../types/resume").ChatMessage[] }>> {
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
    return this.request("/resume/career-copilot/state", {}, 20000);
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
      "/resume/career-copilot/chat",
      {
        method: "POST",
        body: JSON.stringify({
          message,
          jd_paste: jdPaste?.trim() || "",
        }),
      },
      120000,
    );
  }

  async resetCareerCopilotChat(): Promise<ApiResponse<{ ok: boolean; cleared?: boolean }>> {
    return this.request(
      "/resume/career-copilot/chat",
      { method: "POST", body: JSON.stringify({ reset: true }) },
      30000,
    );
  }

  async recordCareerCopilotTab(tab: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      "/resume/career-copilot/behavior",
      { method: "POST", body: JSON.stringify({ tab }) },
      15000,
    );
  }

  async startPlaygroundTrack(body: {
    track_id?: string;
    custom_topic?: string;
  }): Promise<ApiResponse<{ ok: boolean; error?: string; playground?: Record<string, unknown> }>> {
    return this.request(
      "/resume/career-copilot/playground/start",
      { method: "POST", body: JSON.stringify(body) },
      120000,
    );
  }

  async advancePlaygroundStep(): Promise<
    ApiResponse<{ ok: boolean; error?: string; playground?: Record<string, unknown> }>
  > {
    return this.request(
      "/resume/career-copilot/playground/advance",
      { method: "POST", body: "{}" },
      30000,
    );
  }

  async resetPlaygroundTrack(): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      "/resume/career-copilot/playground/reset",
      { method: "POST", body: "{}" },
      15000,
    );
  }

  // --- Outreach Campaign methods ---

  async getOutreachCampaigns(): Promise<ApiResponse<{
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
  }>> {
    return this.request("/resume/career-copilot/outreach/campaigns");
  }

  async createOutreachCampaign(body: {
    target_company: string;
    target_role: string;
    contacts?: Array<{ name: string; title: string; notes: string }>;
    channel: string;
  }): Promise<ApiResponse<{ ok: boolean; campaign: any }>> {
    return this.request(
      "/resume/career-copilot/outreach/create",
      { method: "POST", body: JSON.stringify(body) },
      30000,
    );
  }

  async generateOutreachSequence(body: {
    company: string;
    role: string;
    channel: string;
  }): Promise<ApiResponse<{
    ok: boolean;
    sequence: Array<{ step: number; action: string; template: string }>;
  }>> {
    return this.request(
      "/resume/career-copilot/outreach/generate-sequence",
      { method: "POST", body: JSON.stringify(body) },
      120000,
    );
  }

  async updateOutreachStep(
    campaignId: string,
    body: { step_index: number; status: string; notes?: string },
  ): Promise<ApiResponse<{ ok: boolean; campaign: any }>> {
    return this.request(
      `/resume/career-copilot/outreach/${campaignId}/step`,
      { method: "PATCH", body: JSON.stringify(body) },
      15000,
    );
  }

  // --- Memory methods ---

  async getMemoryNotes(): Promise<ApiResponse<{ notes: Record<string, string> }>> {
    return this.request("/resume/career-copilot/memory");
  }

  async saveMemoryNote(key: string, value: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      "/resume/career-copilot/memory",
      { method: "POST", body: JSON.stringify({ key, value }) },
      15000,
    );
  }

  async deleteMemoryNote(key: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      `/resume/career-copilot/memory/${encodeURIComponent(key)}`,
      { method: "DELETE" },
      15000,
    );
  }

  // --- Timeline ---

  async getCopilotTimeline(limit?: number): Promise<ApiResponse<{
    events: Array<{ type: string; description: string; timestamp: string }>;
  }>> {
    const q = limit ? `?limit=${limit}` : "";
    return this.request(`/resume/career-copilot/timeline${q}`);
  }

  // --- Playground quiz/assessment ---

  async generatePlaygroundQuiz(body: {
    topic: string;
    difficulty: "easy" | "medium" | "hard";
    count: number;
  }): Promise<ApiResponse<{
    ok: boolean;
    questions: Array<{
      question: string;
      options: string[];
      correct_index: number;
      explanation: string;
    }>;
  }>> {
    return this.request(
      "/resume/career-copilot/playground/quiz",
      { method: "POST", body: JSON.stringify(body) },
      120000,
    );
  }

  async evaluatePlaygroundAnswer(body: {
    question: string;
    user_answer: string;
  }): Promise<ApiResponse<{
    ok: boolean;
    score: number;
    feedback: string;
    model_answer: string;
  }>> {
    return this.request(
      "/resume/career-copilot/playground/evaluate",
      { method: "POST", body: JSON.stringify(body) },
      60000,
    );
  }

  // --- Job Intelligence ---

  async getStaleApplications(days = 5): Promise<ApiResponse<{
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
  }>> {
    return this.request(`/resume/career-copilot/intelligence/stale?days=${days}`);
  }

  async generateIntelligenceFollowup(body: {
    record_id: string;
    channel?: "email" | "linkedin";
  }): Promise<ApiResponse<{
    ok: boolean;
    channel: string;
    followup: { subject: string; message: string; tone: string; next_step: string };
  }>> {
    return this.request(
      "/resume/career-copilot/intelligence/followup",
      { method: "POST", body: JSON.stringify(body) },
      45000,
    );
  }

  async dismissIntelligenceFollowup(
    recordId: string,
  ): Promise<ApiResponse<{ ok: boolean; dismissed_at?: string }>> {
    return this.request(
      `/resume/career-copilot/intelligence/followup/${recordId}/dismiss`,
      { method: "POST" },
    );
  }

  async getFunnelAnalytics(): Promise<ApiResponse<{
    ok: boolean;
    counts: Record<string, number>;
    conversions: Record<string, number>;
    insight: { headline: string; insight: string; action_items: string[] };
  }>> {
    return this.request("/resume/career-copilot/intelligence/funnel");
  }

  async getRejectionInsights(): Promise<ApiResponse<{
    ok: boolean;
    total: number;
    patterns: Array<{ theme: string; evidence: string }>;
    suggestions: string[];
  }>> {
    return this.request("/resume/career-copilot/intelligence/rejection-insights", {}, 45000);
  }

  async reframeRejection(record_id: string): Promise<ApiResponse<{
    ok: boolean;
    reframe: {
      acknowledgement: string;
      what_went_right: string;
      next_actions: string[];
      silver_lining: string;
    };
  }>> {
    return this.request(
      "/resume/career-copilot/intelligence/reframe",
      { method: "POST", body: JSON.stringify({ record_id }) },
      45000,
    );
  }

  async getWeeklyDigest(): Promise<ApiResponse<{
    ok: boolean;
    stats: { events_this_week: number; events_last_week: number };
    digest: {
      headline: string;
      summary: string;
      wins: string[];
      focus_for_next_week: string[];
    };
  }>> {
    return this.request("/resume/career-copilot/intelligence/weekly-digest", {}, 45000);
  }

  // --- Momentum ---

  async getMomentumData(): Promise<ApiResponse<{
    ok: boolean;
    streak: number;
    momentum_score: number;
    trend: "up" | "down";
    this_week: number;
    last_week: number;
    milestones: Array<{ id: string; label: string; earned: boolean }>;
    heatmap: Array<{ date: string; count: number }>;
  }>> {
    return this.request("/resume/career-copilot/momentum");
  }

  async recordMomentumActivity(
    activity_type: string,
    metadata?: Record<string, unknown>,
  ): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      "/resume/career-copilot/momentum/activity",
      { method: "POST", body: JSON.stringify({ activity_type, metadata: metadata || {} }) },
      15000,
    );
  }

  // --- Networking CRM ---

  async getNetworkContacts(): Promise<ApiResponse<{ ok: boolean; contacts: any[] }>> {
    return this.request("/resume/career-copilot/network/contacts");
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
      "/resume/career-copilot/network/contacts",
      { method: "POST", body: JSON.stringify(body) },
      20000,
    );
  }

  async updateNetworkContact(
    contactId: string,
    body: Record<string, unknown>,
  ): Promise<ApiResponse<{ ok: boolean; contact: any }>> {
    return this.request(
      `/resume/career-copilot/network/contacts/${encodeURIComponent(contactId)}`,
      { method: "PUT", body: JSON.stringify(body) },
      20000,
    );
  }

  async deleteNetworkContact(contactId: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      `/resume/career-copilot/network/contacts/${encodeURIComponent(contactId)}`,
      { method: "DELETE" },
      15000,
    );
  }

  async generateNetworkIntro(contact_id: string): Promise<ApiResponse<{
    ok: boolean;
    intro: { message: string; subject: string; tone: string };
  }>> {
    return this.request(
      "/resume/career-copilot/network/generate-intro",
      { method: "POST", body: JSON.stringify({ contact_id }) },
      45000,
    );
  }

  async getNetworkingInsights(): Promise<ApiResponse<{
    ok: boolean;
    insights: { headline: string; analysis: string; actions: string[] };
  }>> {
    return this.request("/resume/career-copilot/network/insights", {}, 45000);
  }

  // --- Offer Workspace ---

  async getOffers(): Promise<ApiResponse<{ ok: boolean; offers: any[] }>> {
    return this.request("/resume/career-copilot/offers");
  }

  async addOffer(body: Record<string, unknown>): Promise<ApiResponse<{ ok: boolean; offer: any }>> {
    return this.request(
      "/resume/career-copilot/offers",
      { method: "POST", body: JSON.stringify(body) },
      20000,
    );
  }

  async updateOffer(
    offerId: string,
    body: Record<string, unknown>,
  ): Promise<ApiResponse<{ ok: boolean; offer: any }>> {
    return this.request(
      `/resume/career-copilot/offers/${encodeURIComponent(offerId)}`,
      { method: "PUT", body: JSON.stringify(body) },
      20000,
    );
  }

  async deleteOffer(offerId: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      `/resume/career-copilot/offers/${encodeURIComponent(offerId)}`,
      { method: "DELETE" },
      15000,
    );
  }

  async compareOffers(): Promise<ApiResponse<{
    ok: boolean;
    offers: any[];
    comparison: {
      headline: string;
      recommendation: string;
      pros_cons: Array<{ company: string; pros: string[]; cons: string[] }>;
      total_comp_table: Array<{ company: string; total_comp: number }>;
    };
  }>> {
    return this.request("/resume/career-copilot/offers/compare", {}, 60000);
  }

  async generateNegotiationScript(
    offer_id: string,
    ask: string,
  ): Promise<ApiResponse<{
    ok: boolean;
    script: {
      email_subject: string;
      email_body: string;
      talking_points: string[];
      fallback_if_denied: string;
    };
  }>> {
    return this.request(
      "/resume/career-copilot/offers/negotiate",
      { method: "POST", body: JSON.stringify({ offer_id, ask }) },
      60000,
    );
  }

  async evaluateMockAnswer(
    recordId: string,
    body: { question: string; user_answer: string; category?: string },
  ): Promise<ApiResponse<{ evaluation: import("../types/resume").MockEvaluation }>> {
    return this.request(
      `/resume/tailoring-records/${recordId}/mock-evaluate`,
      { method: "POST", body: JSON.stringify(body) },
      60000,
    );
  }

  // ============================================
  // Voice Graph — writing-capture surface (/api/resume/voice-graph)
  // Simple JSON request/response (NOT the async job pattern).
  // ============================================

  async voiceGraphStatus() {
    // 404 here means the feature flag is off — the caller treats a 404
    // status as "feature unavailable" and renders a soft placeholder.
    return this.request<import("../types/voicegraph").VoiceGraphStatus>(
      "/resume/voice-graph/status",
    );
  }

  async voiceGraphPrompts() {
    return this.request<{ prompts: import("../types/voicegraph").WritingPrompt[] }>(
      "/resume/voice-graph/prompts",
    );
  }

  async grantVoiceConsent() {
    return this.request<import("../types/voicegraph").VoiceConsent>(
      "/resume/voice-graph/consent",
      { method: "POST" },
    );
  }

  async revokeVoiceConsent() {
    return this.request<import("../types/voicegraph").VoiceConsent>(
      "/resume/voice-graph/consent",
      { method: "DELETE" },
    );
  }

  async saveWritingSample(
    payload: import("../types/voicegraph").SaveSamplePayload,
  ): Promise<ApiResponse<import("../types/voicegraph").WritingSample>> {
    // request() already forwards { status, errorPayload } on a non-2xx, so a
    // 403 upgrade_required / consent_required surfaces to the caller intact
    // (mirrors tailorResumeWithJDText) — no re-wrapping needed here.
    return this.request<import("../types/voicegraph").WritingSample>(
      "/resume/voice-graph/samples",
      { method: "POST", body: JSON.stringify(payload) },
    );
  }

  async listWritingSamples() {
    return this.request<{ samples: import("../types/voicegraph").WritingSample[] }>(
      "/resume/voice-graph/samples",
    );
  }

  async getWritingSample(id: string) {
    return this.request<import("../types/voicegraph").WritingSample>(
      `/resume/voice-graph/samples/${encodeURIComponent(id)}`,
    );
  }

  async deleteWritingSample(id: string) {
    return this.request<{ ok: boolean }>(
      `/resume/voice-graph/samples/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  }

  /** The private knowledge graph built from the user's writing. */
  async voiceGraphGraph() {
    return this.request<import("../types/voicegraph").KnowledgeGraph>(
      "/resume/voice-graph/graph",
    );
  }

  /**
   * The computed voice profile — or an `{ insufficient: true }` payload when
   * there isn't yet enough writing to profile a voice.
   */
  async voiceGraphVoice() {
    return this.request<import("../types/voicegraph").VoiceProfile>(
      "/resume/voice-graph/voice",
    );
  }

  /**
   * Assemble a résumé purely from the user's own words — verbatim, nothing
   * written by a model. May 403 `consent_required` or 400 `no_ready_samples`;
   * request() forwards { status, errorPayload } so callers can branch.
   */
  async buildRawResume() {
    return this.request<import("../types/voicegraph").AuthoredResumeDetail>(
      "/resume/voice-graph/resume/raw",
      { method: "POST", body: "{}" },
      30000,
    );
  }

  async listAuthoredResumes() {
    return this.request<{ resumes: import("../types/voicegraph").AuthoredResume[] }>(
      "/resume/voice-graph/resume",
    );
  }

  async getAuthoredResume(id: string) {
    return this.request<import("../types/voicegraph").AuthoredResumeDetail>(
      `/resume/voice-graph/resume/${encodeURIComponent(id)}`,
    );
  }

  // ============================================
  // Gmail integration — auto-update application status from inbox
  // ============================================

  async getGmailStatus(): Promise<ApiResponse<{
    configured: boolean;
    connected: boolean;
    gmail_address?: string | null;
    last_synced_at?: string | null;
    pending_suggestions: number;
  }>> {
    return this.request("/resume/gmail/status");
  }

  async getGmailAuthUrl(): Promise<ApiResponse<{ auth_url: string }>> {
    return this.request("/resume/gmail/auth-url");
  }

  async finishGmailLink(
    code: string,
    state: string,
  ): Promise<ApiResponse<{ connected: boolean; gmail_address?: string; linked_at?: string }>> {
    return this.request("/resume/gmail/callback", {
      method: "POST",
      body: JSON.stringify({ code, state }),
    });
  }

  async syncGmail(): Promise<ApiResponse<{
    ok: boolean;
    job_id: string;
    status: string;
  }>> {
    return this.request("/resume/gmail/sync", { method: "POST" }, 30000);
  }

  async pollGmailSyncJob(jobId: string): Promise<ApiResponse<{
    status: "processing" | "completed" | "failed";
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
  }>> {
    return this.request(`/resume/job/${jobId}`);
  }

  async listGmailSuggestions(includeResolved = false): Promise<ApiResponse<{
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
  }>> {
    const qs = includeResolved ? "?include_resolved=true" : "";
    return this.request(`/resume/gmail/suggestions${qs}`);
  }

  async applyGmailSuggestion(
    suggestionId: string,
  ): Promise<ApiResponse<{ suggestion: any }>> {
    return this.request(
      `/resume/gmail/suggestions/${suggestionId}/apply`,
      { method: "POST" },
    );
  }

  async dismissGmailSuggestion(
    suggestionId: string,
  ): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request(
      `/resume/gmail/suggestions/${suggestionId}/dismiss`,
      { method: "POST" },
    );
  }

  async disconnectGmail(): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request("/resume/gmail/disconnect", { method: "POST" });
  }

  // ============================================
  // Recruiter's Six Seconds (/api/resume/six-seconds)
  // Async job: submit -> 202 { job_id } -> poll for the gaze/impression read.
  // ============================================

  async runSixSeconds(
    signal?: AbortSignal,
  ): Promise<ApiResponse<import("../types/sixSeconds").SixSecondsResult>> {
    const submit = await this.request<{ job_id?: string }>(
      "/resume/six-seconds",
      { method: "POST", body: "{}" },
      30000,
    );
    if (submit.error) {
      // Forward status + payload so a 403 upgrade_required / 429 quota surfaces.
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    }
    if (!submit.data?.job_id) {
      // Backend may answer synchronously (e.g. { error: "no_resume" }).
      return {
        data: (submit.data ?? { error: "no_resume" }) as unknown as import("../types/sixSeconds").SixSecondsResult,
      };
    }
    return this.pollJob<import("../types/sixSeconds").SixSecondsResult>(
      submit.data.job_id,
      120000,
      signal,
    );
  }

  // ============================================
  // Pipeline Intelligence (/api/resume/pipeline/*)
  // ============================================

  async getPipelineFunnel() {
    return this.request<import("../types/pipeline").PipelineFunnel>(
      "/resume/pipeline/funnel",
    );
  }

  async getPipelineGhosts() {
    return this.request<import("../types/pipeline").PipelineGhosts>(
      "/resume/pipeline/ghosts",
    );
  }

  /** Mark one or more applications as ghosted (no response in a while). */
  async markPipelineGhosts(applicationIds: string[]) {
    return this.request<{ ok: boolean; marked: number }>(
      "/resume/pipeline/ghosts/mark",
      { method: "POST", body: JSON.stringify({ application_ids: applicationIds }) },
    );
  }

  async getPipelineCohort() {
    return this.request<import("../types/pipeline").PipelineCohort>(
      "/resume/pipeline/cohort",
    );
  }

  // ============================================
  // Referrals + LinkedIn archive (/api/resume/referrals*, /linkedin-archive*)
  // Referrals gate at Premium+ (403 upgrade_required).
  // ============================================

  async getReferrals(company: string) {
    return this.request<import("../types/referrals").ReferralsResponse>(
      `/resume/referrals?company=${encodeURIComponent(company)}`,
    );
  }

  /** Draft a warm referral ask — async job returning a ready-to-send message. */
  async draftReferralAsk(
    referral: import("../types/referrals").Referral,
    job: { company?: string; title?: string; job_id?: string; description?: string },
    signal?: AbortSignal,
  ): Promise<ApiResponse<{ message: string }>> {
    const submit = await this.request<{ job_id: string }>(
      "/resume/referrals/draft",
      { method: "POST", body: JSON.stringify({ referral, job }) },
      30000,
    );
    if (submit.error) {
      return { error: submit.error, status: submit.status, errorPayload: submit.errorPayload };
    }
    if (!submit.data?.job_id) return { error: "Failed to start referral draft" };
    return this.pollJob<{ message: string }>(submit.data.job_id, 120000, signal);
  }

  async uploadLinkedInArchive(
    file: File,
  ): Promise<ApiResponse<import("../types/referrals").LinkedInDiff>> {
    const formData = new FormData();
    formData.append("file", file);
    const token = this.getToken();
    const url = `${this.baseURL}/resume/linkedin-archive`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(url, {
        method: "POST",
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
      return { data } as ApiResponse<import("../types/referrals").LinkedInDiff>;
    } catch (error) {
      clearTimeout(timeoutId);
      return { error: error instanceof Error ? error.message : "Upload failed" };
    }
  }

  async getLinkedInDiff() {
    return this.request<import("../types/referrals").LinkedInDiff>(
      "/resume/linkedin-archive/diff",
    );
  }

  // ============================================
  // Notification preferences (/api/resume/notifications/*)
  // ============================================

  async getNotificationPrefs() {
    return this.request<import("../types/notifications").NotificationPrefs>(
      "/resume/notifications/prefs",
    );
  }

  async updateNotificationPrefs(
    prefs: Partial<import("../types/notifications").NotificationPrefs>,
  ) {
    return this.request<import("../types/notifications").NotificationPrefs>(
      "/resume/notifications/prefs",
      { method: "PUT", body: JSON.stringify(prefs) },
    );
  }

  async unsubscribeNotifications() {
    return this.request<{ ok: boolean }>(
      "/resume/notifications/unsubscribe",
      { method: "POST", body: "{}" },
    );
  }

  // ============================================
  // Mail-ingress (/api/resume/mail-ingress/*)
  // A 404 on any of these = feature flag off → hide the surface entirely.
  // ============================================

  async provisionMailIngress() {
    return this.request<import("../types/mailIngress").MailIngressAddress>(
      "/resume/mail-ingress/provision",
      { method: "POST", body: "{}" },
    );
  }

  async getMailIngressSuggestions() {
    return this.request<import("../types/mailIngress").MailIngressSuggestionsResponse>(
      "/resume/mail-ingress/suggestions",
    );
  }

  async resolveMailIngressSuggestion(
    id: string,
    action: import("../types/mailIngress").MailIngressAction,
  ) {
    return this.request<{ ok: boolean }>(
      `/resume/mail-ingress/suggestions/${encodeURIComponent(id)}/resolve`,
      { method: "POST", body: JSON.stringify({ action }) },
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
    }>("/admin/stats");
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
    }>("/admin/users");
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
    }>("/resume/usage/today");
  }

  // ── Feedback (user side) ──────────────────────────────────────
  async submitFeedback(message: string, type: "general" | "quota_bump" | "bug" | "idea" = "general") {
    return this.request<{ id: string; status: string }>("/resume/feedback/submit", {
      method: "POST",
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
    }>("/resume/feedback/mine");
  }

  // ── Admin: user quota + feedback management ──────────────────
  async updateAdminUserQuota(email: string, dailyTailorLimit: number | null) {
    return this.request<{
      email: string;
      daily_tailor_limit_custom: number | null;
      daily_tailor_limit_effective: number;
      tailored_today: number;
    }>(`/admin/user/${encodeURIComponent(email)}/quota`, {
      method: "PATCH",
      body: JSON.stringify({ daily_tailor_limit: dailyTailorLimit }),
    });
  }

  async getAdminFeedback(status?: "open" | "responded" | "resolved") {
    const qs = status ? `?status=${status}` : "";
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
    fields: { admin_response?: string; status?: "open" | "responded" | "resolved" },
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
      method: "PATCH",
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
  // Career portals — direct Workday fan-out (/api/jobs/workday)
  // ============================================

  async getWorkdayCatalog() {
    return this.request<import("../types/jobs").WorkdayCatalog>(
      "/jobs/workday/catalog",
      { method: "GET" },
    );
  }

  async searchWorkdayJobs(
    params: import("../types/jobs").WorkdayJobsParams,
    onPartial?: (partial: import("../types/jobs").WorkdayJobsResult) => void,
  ): Promise<ApiResponse<import("../types/jobs").WorkdayJobsResult>> {
    const submitResp = await this.request<{ job_id: string }>(
      "/jobs/workday/search",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      30000,
    );
    if (submitResp.error) {
      // Forward status + payload so a 403 upgrade_required / 429 quota surfaces.
      return { error: submitResp.error, status: submitResp.status, errorPayload: submitResp.errorPayload };
    }
    if (!submitResp.data?.job_id) return { error: "Failed to start Workday search" };
    // A cold full-catalog fan-out can take several minutes on Lambda; poll up
    // to the function's 15-min ceiling. Matches stream in via onPartial the
    // whole time, so the wait is visible, not a spinner.
    return this.pollJob<import("../types/jobs").WorkdayJobsResult>(
      submitResp.data.job_id,
      900000,
      undefined,
      onPartial,
    );
  }

  // ============================================
  // Career portals — non-Workday ATS universe (/api/jobs/career-pages)
  // ============================================

  async getCareerPagesCatalog() {
    return this.request<import("../types/jobs").WorkdayCatalog>(
      "/jobs/career-pages/catalog",
      { method: "GET" },
    );
  }

  async searchCareerPagesJobs(
    params: import("../types/jobs").WorkdayJobsParams,
    onPartial?: (partial: import("../types/jobs").WorkdayJobsResult) => void,
  ): Promise<ApiResponse<import("../types/jobs").WorkdayJobsResult>> {
    const submitResp = await this.request<{ job_id: string }>(
      "/jobs/career-pages/search",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      30000,
    );
    if (submitResp.error) {
      // Forward status + payload so a 403 upgrade_required / 429 quota surfaces.
      return { error: submitResp.error, status: submitResp.status, errorPayload: submitResp.errorPayload };
    }
    if (!submitResp.data?.job_id) return { error: "Failed to start career-pages search" };
    return this.pollJob<import("../types/jobs").WorkdayJobsResult>(
      submitResp.data.job_id,
      900000,
      undefined,
      onPartial,
    );
  }

  // ============================================
  // Auto-Apply (opt-in auto-submit) — /api/apply/auto-submit
  // Rides the existing ANY /api/apply/{proxy+} edge route (no new Terraform).
  // All endpoints 404 when AUTO_SUBMIT_ENABLED is off; callers treat 404 as
  // "feature unavailable" and hide the surface.
  // ============================================

  async getAutoSubmitSettings() {
    return this.request<import("../types/autoSubmit").AutoSubmitSettings>(
      "/apply/auto-submit/settings",
    );
  }

  async updateAutoSubmitSettings(enabled: boolean, autonomyThreshold?: number) {
    return this.request<import("../types/autoSubmit").AutoSubmitSettings>(
      "/apply/auto-submit/settings",
      {
        method: "PUT",
        body: JSON.stringify(
          autonomyThreshold === undefined
            ? { enabled }
            : { enabled, autonomy_threshold: autonomyThreshold },
        ),
      },
    );
  }

  async approveAutoSubmit(
    body: import("../types/autoSubmit").AutoSubmitApproveBody,
  ) {
    return this.request<import("../types/autoSubmit").AutoSubmitApproveResult>(
      "/apply/auto-submit/approve",
      { method: "POST", body: JSON.stringify(body) },
    );
  }

  async cancelAutoSubmit(applicationId: string) {
    return this.request<{
      approval: import("../types/autoSubmit").AutoSubmitApprovalView;
    }>("/apply/auto-submit/cancel", {
      method: "POST",
      body: JSON.stringify({ application_id: applicationId }),
    });
  }

  async getAutoSubmitPending() {
    return this.request<import("../types/autoSubmit").AutoSubmitPending>(
      "/apply/auto-submit/pending",
    );
  }

  /**
   * Unified "Today" inbox — one backend-composed feed of everything that may
   * need the user today (approvals, auto-submit hand-offs, inbox suggestions,
   * "did you apply?" nudges). Newest-first, capped at 50 server-side.
   */
  async getTodayInbox() {
    return this.request<import("../types/todayInbox").TodayInbox>(
      "/apply/today-inbox",
    );
  }

  async markAutoSubmitSubmitted(applicationId: string) {
    return this.request<{
      approval: import("../types/autoSubmit").AutoSubmitApprovalView;
    }>("/apply/auto-submit/mark-submitted", {
      method: "POST",
      body: JSON.stringify({ application_id: applicationId }),
    });
  }
}

export const apiService = new ApiService(API_BASE_URL);
