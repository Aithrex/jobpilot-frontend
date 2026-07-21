/**
 * useGuestFlow — the guest onboarding state machine (spec v2 + v3 deltas):
 * upload → parse poll → profile reveal → matches poll → single tailor poll →
 * polished PDF/DOCX download via short-lived capability tokens.
 *
 * Extracted from pages/Start.tsx so the landing hero can embed the same flow
 * through GuestDropzone + this hook. All backend calls go through apiService;
 * every long phase is async {job_id} + poll (never blocking).
 *
 * Contract notes (jobpilot-backend/docs/specs/guest-onboarding.md v2):
 * - onboard returns a server-issued device_token → persisted and echoed on
 *   session/matches/tailor calls (first-party anti-abuse signal).
 * - tailor sends { guest_id, match_id, device_token? } ONLY.
 * - 429 bodies (quota_exhausted / capacity / challenge_required) become
 *   conversion CTAs — never error toasts, never logout.
 * - A failed tailor releases the server-side reservation, so quota numbers
 *   are re-read from the session endpoint instead of guessed client-side.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import {
  getDeviceToken,
  getFingerprintHash,
  getGuestId,
  setDeviceToken,
  setGuestId,
} from "@/lib/guest";
import type {
  GuestDetectedExperience,
  GuestDownloadFormat,
  GuestEmptyReason,
  GuestJobMatch,
  GuestJobProgress,
  GuestMatchesResult,
  GuestParseResult,
  GuestProfileBlock,
  GuestQuotaError,
  GuestSeniority,
  GuestSession,
  GuestSourcesReport,
  GuestTailorResult,
} from "@/types/guest";
import type { JobStatus } from "@/types/resume";

/** v2 default: ONE lifetime guest tailor (server is authoritative). */
export const GUEST_TAILOR_LIMIT_DEFAULT = 1;

/**
 * Client-side pointer to the finished tailor job so a refresh can restore the
 * completed result (the guest job route re-serves completed job docs). Holds
 * only opaque ids — never resume content.
 */
const TAILORED_POINTER_KEY = "guest_tailored_v1";

interface TailoredPointer {
  job_id: string;
  match_id: string;
  record_id?: string;
}

function readTailoredPointer(): TailoredPointer | null {
  try {
    const raw = localStorage.getItem(TAILORED_POINTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TailoredPointer;
    return parsed && typeof parsed.job_id === "string" && typeof parsed.match_id === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function writeTailoredPointer(pointer: TailoredPointer | null): void {
  try {
    if (pointer) localStorage.setItem(TAILORED_POINTER_KEY, JSON.stringify(pointer));
    else localStorage.removeItem(TAILORED_POINTER_KEY);
  } catch {
    /* storage unavailable — restore simply won't survive refresh */
  }
}

export type GuestStep = "hero" | "parsing" | "profile" | "matches" | "tailor";
export type GuestMatchesState = "idle" | "loading" | "ready" | "error" | "cta";
export type GuestTailorState = "working" | "done" | "cta" | "error";

/** Honest completion metadata from the guest_matches result (v3 additive) —
 * drives "We found N strong matches" counts and the distinct empty vs
 * sources-unavailable vs low-signal states. */
export interface GuestMatchesMeta {
  totalConsidered?: number;
  emptyReason?: GuestEmptyReason | null;
  sourcesReport?: GuestSourcesReport | null;
  /** v4: seniority pool metadata — applied view, per-view counts, the
   * honest locked count behind the visible 5, and the deterministic
   * detected experience driving the default view. */
  seniority?: GuestSeniority;
  seniorityCounts?: Partial<Record<GuestSeniority, number>>;
  poolTotal?: number;
  lockedCount?: number;
  detectedExperience?: GuestDetectedExperience | null;
}

/** Title defense at the guest boundary: some source rows carry the role under
 * job_title/role — resolve to ONE trimmed `title` before anything renders or
 * keys off it (backend normalizes too; belt-and-braces). */
export function normalizeGuestMatch(m: GuestJobMatch): GuestJobMatch {
  let title = "";
  for (const t of [m.title, m.job_title, m.role]) {
    if (typeof t === "string" && t.trim()) {
      title = t.trim();
      break;
    }
  }
  return { ...m, title };
}

/**
 * Back-compat profile synthesis: when the parse result carries no `profile`
 * block (pre-v3 backend), derive one client-side from the parsed structured
 * resume — ONLY from fields genuinely present, never invented. Returns null
 * when nothing presentable was extracted (the flow then skips the reveal).
 */
export function profileFromStructured(
  structured: Record<string, unknown> | null,
): GuestProfileBlock | null {
  if (!structured) return null;
  const s = structured as {
    contact?: { name?: unknown; location?: unknown };
    summary?: unknown;
    skills?: unknown;
    experience?: Array<{ title?: unknown }>;
  };
  const out: GuestProfileBlock = {};

  const name = typeof s.contact?.name === "string" ? s.contact.name.trim() : "";
  if (name) out.first_name = name.split(/\s+/)[0];

  const title = s.experience?.[0]?.title;
  if (typeof title === "string" && title.trim()) out.headline_title = title.trim();

  // skills may be a flat list or grouped Record<string, string[]>.
  const flat: string[] = [];
  if (Array.isArray(s.skills)) {
    for (const sk of s.skills) if (typeof sk === "string" && sk.trim()) flat.push(sk.trim());
  } else if (s.skills && typeof s.skills === "object") {
    for (const group of Object.values(s.skills as Record<string, unknown>)) {
      if (!Array.isArray(group)) continue;
      for (const sk of group) if (typeof sk === "string" && sk.trim()) flat.push(sk.trim());
    }
  }
  if (flat.length) out.skills = flat.slice(0, 10);

  const loc = s.contact?.location;
  if (typeof loc === "string" && loc.trim()) out.location = loc.trim();

  if (typeof s.summary === "string" && s.summary.trim()) {
    const summary = s.summary.trim();
    out.summary_short = summary.length > 220 ? `${summary.slice(0, 217)}...` : summary;
  }

  return Object.keys(out).length ? out : null;
}

/** Conversion CTA copy (quota / capacity / challenge) — rendered as a card
 * with sign-in + create-account actions, never as an error. */
export interface GuestCta {
  title: string;
  body: string;
}

// Staged progress copy: honest status lines, no fake progress bars. Each list
// ends on a phrase that can truthfully PERSIST (parse ~30-60s, first matches
// scan ~1-2 min, tailor ~1-2 min are all longer than the staged run-through).
export const PARSE_STAGES = [
  "Uploading your resume…",
  "Reading the document…",
  "Extracting your experience and skills…",
  "Building your profile. Almost done…",
] as const;

export const TAILOR_STAGES = [
  "Reading the job description…",
  "Mapping it against your real experience…",
  "Rewriting with integrity checks. Nothing invented…",
  "Polishing and scoring keyword coverage…",
] as const;

export const MATCHES_STAGES = [
  "Scanning Workday, company career pages, and big tech boards in parallel…",
  "Scoring each role against your resume…",
  "Keeping only the strong matches…",
  "Ranking your best fits. A first full scan can take a few minutes…",
] as const;

/** Cycles through staged status copy while `active`; parks on the last line. */
export function useStagedCopy(
  active: boolean,
  stages: readonly string[],
  intervalMs = 5000,
) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) {
      setIdx(0);
      return;
    }
    const id = window.setInterval(
      () => setIdx((i) => Math.min(i + 1, stages.length - 1)),
      intervalMs,
    );
    return () => window.clearInterval(id);
  }, [active, stages, intervalMs]);
  return stages[Math.min(idx, stages.length - 1)];
}

function isUnavailable(status?: number): boolean {
  // 503 = backend feature flag off; 404 = guest edge route not deployed yet.
  return status === 503 || status === 404;
}

/** Map a guest 429 body to conversion CTA copy, or null for a plain
 * (retryable) throttle. `phase` only varies the wording. */
function ctaFor429(
  payload: GuestQuotaError,
  phase: "upload" | "matches" | "tailor",
): GuestCta | null {
  if (payload.error === "challenge_required") {
    return {
      title: "We need a quick pause on guest requests",
      body: "Requests from this network tripped our anti-abuse checks. Create a free account to keep going right away. Your work comes with you.",
    };
  }
  if (payload.global || payload.error === "capacity") {
    const bodies: Record<typeof phase, string> = {
      upload:
        "Guest uploads are maxed out for today. Create a free account to continue right now. It takes about a minute and has no daily guest cap.",
      matches:
        "Guest matching is maxed out for today. Create a free account to keep going. Your resume comes with you and there is no daily guest cap.",
      tailor:
        "Guest tailoring is at capacity today. Create a free account to keep going right now. Your resume and matches come with you.",
    };
    return { title: "We're at guest capacity today", body: bodies[phase] };
  }
  if (payload.quota_exhausted) {
    return {
      title: "Your free tailor is used. Nice work.",
      body: "Create a free account to save this work and unlock 5 tailors a day. Everything you made here carries over automatically.",
    };
  }
  return null;
}

export interface UseGuestFlowOptions {
  /** The flow is live (unauthenticated + feature flag on). */
  enabled: boolean;
  /** 503/404 from any guest endpoint = feature off / edge route missing. */
  onUnavailable: () => void;
}

export function useGuestFlow({ enabled, onUnavailable }: UseGuestFlowOptions) {
  const [step, setStep] = useState<GuestStep>("hero");
  const [session, setSession] = useState<GuestSession | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [tailorsUsed, setTailorsUsed] = useState(0);
  const [tailorsLimit, setTailorsLimit] = useState(GUEST_TAILOR_LIMIT_DEFAULT);

  const [parseStatus, setParseStatus] = useState<JobStatus | null>(null);
  /** Server-emitted parse sub-phase (v3) — null until the first marker. */
  const [parseProgress, setParseProgress] = useState<GuestJobProgress | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseCta, setParseCta] = useState<GuestCta | null>(null);
  /** Structured resume from the completed parse — drives the parsing morph
   * preview and the original-vs-tailored comparison. Kept in memory only. */
  const [parsedResume, setParsedResume] = useState<Record<string, unknown> | null>(null);
  /** Profile block for the reveal step: server-provided when present,
   * otherwise synthesized client-side from `structured` (back-compat). */
  const [profile, setProfile] = useState<GuestProfileBlock | null>(null);

  const [matches, setMatches] = useState<GuestJobMatch[]>([]);
  const [matchesState, setMatchesState] = useState<GuestMatchesState>("idle");
  /** Server-emitted matches sub-phase (v3) — null until the first marker. */
  const [matchesProgress, setMatchesProgress] = useState<GuestJobProgress | null>(null);
  const [matchesMeta, setMatchesMeta] = useState<GuestMatchesMeta>({});
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [matchesCta, setMatchesCta] = useState<GuestCta | null>(null);

  const [activeMatch, setActiveMatch] = useState<GuestJobMatch | null>(null);
  const [tailorState, setTailorState] = useState<GuestTailorState>("working");
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailorCta, setTailorCta] = useState<GuestCta | null>(null);
  const [tailored, setTailored] = useState<GuestTailorResult | null>(null);
  /** match_id of the successfully tailored role — locks every other card. */
  const [tailoredMatchId, setTailoredMatchId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<GuestDownloadFormat | null>(
    null,
  );

  const fingerprintRef = useRef<string | null>(null);
  const fileRef = useRef<File | null>(null);

  const remaining = Math.max(0, tailorsLimit - tailorsUsed);

  const applyQuota = useCallback(
    (used?: number, limit?: number) => {
      if (typeof used === "number") setTailorsUsed(Math.max(0, used));
      if (typeof limit === "number") setTailorsLimit(Math.max(0, limit));
    },
    [],
  );

  /** Re-read authoritative quota numbers (e.g. after a failed tailor, where
   * the server releases the reservation). Best-effort. */
  const refreshQuota = useCallback(async () => {
    const gid = getGuestId();
    if (!gid) return;
    const fp = fingerprintRef.current ?? (await getFingerprintHash());
    const resp = await apiService.guestSession(
      gid,
      fp,
      getDeviceToken() ?? undefined,
    );
    if (resp.data) applyQuota(resp.data.tailors_used, resp.data.tailors_limit);
  }, [applyQuota]);

  // Recognition probe: on mount, ask the backend who this device might be.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const fp = await getFingerprintHash();
      if (cancelled) return;
      fingerprintRef.current = fp;
      const resp = await apiService.guestSession(
        getGuestId() ?? undefined,
        fp,
        getDeviceToken() ?? undefined,
      );
      if (cancelled) return;
      if (isUnavailable(resp.status)) {
        onUnavailable();
        return;
      }
      if (resp.data) {
        setSession(resp.data);
        applyQuota(resp.data.tailors_used, resp.data.tailors_limit);

        // Refresh restore: a finished tailor leaves a client-side pointer to
        // its completed job — re-read it so the preview, "Tailored" mark, and
        // downloads survive a reload. Best-effort; a 404 (expired job doc)
        // clears the pointer and the flow degrades to the locked-quota state.
        const pointer = readTailoredPointer();
        const gid = getGuestId();
        if (pointer && gid && resp.data.exists) {
          const job = await apiService.guestJobPoll<GuestTailorResult>(
            pointer.job_id,
            gid,
            15000,
          );
          if (cancelled) return;
          if (job.data?.tailored_resume) {
            setTailored(job.data);
            setTailoredMatchId(pointer.match_id);
          } else if (job.status === 404) {
            writeTailoredPointer(null);
          }
        } else if (pointer && (!gid || (resp.data.exists === false && gid))) {
          // The session behind the pointer is gone — drop it.
          writeTailoredPointer(null);
        }
      }
      // Network/transient errors: stay put — the dropzone still works and
      // upload surfaces its own honest error state.
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, onUnavailable, applyQuota]);

  /** Fold a matches result into state — shared by the full load and the
   * instant seniority re-slice. */
  const applyMatchesResult = useCallback((data: GuestMatchesResult) => {
    // Render EXACTLY what the server returns — it caps at 5. No client-side
    // slicing, no hidden rows, no blur. Titles are normalized at this
    // boundary (job_title/role variants) before anything renders.
    setMatches((data.jobs ?? []).map(normalizeGuestMatch));
    setMatchesMeta({
      totalConsidered: data.total_considered,
      emptyReason: data.empty_reason ?? null,
      sourcesReport: data.sources_report ?? null,
      seniority: data.seniority,
      seniorityCounts: data.seniority_counts,
      poolTotal: data.pool_total,
      lockedCount: data.locked_count,
      detectedExperience: data.detected_experience ?? null,
    });
    setMatchesState("ready");
  }, []);

  const loadMatches = useCallback(async (seniority?: GuestSeniority) => {
    const gid = getGuestId();
    if (!gid) return;
    setMatchesState("loading");
    setMatchesError(null);
    setMatchesCta(null);
    setMatchesProgress(null);
    const resp = await apiService.guestMatches(
      gid,
      getDeviceToken() ?? undefined,
      undefined,
      undefined,
      setMatchesProgress,
      seniority,
    );
    if (isUnavailable(resp.status)) {
      onUnavailable();
      return;
    }
    if (resp.status === 429) {
      const payload = (resp.errorPayload ?? {}) as GuestQuotaError;
      const cta = ctaFor429(payload, "matches");
      if (cta) {
        setMatchesCta(cta);
        setMatchesState("cta");
        return;
      }
      // Plain per-IP throttle — genuinely retryable.
      setMatchesState("error");
      setMatchesError(
        "High demand right now. Give it a few minutes and try again.",
      );
      return;
    }
    if (resp.error || !resp.data) {
      setMatchesState("error");
      setMatchesError(
        resp.error || "We could not load your matches. Please try again.",
      );
      return;
    }
    applyMatchesResult(resp.data);
  }, [onUnavailable, applyMatchesResult]);

  /** Seniority toggle: an instant server-side re-slice of the day's scanned
   * pool (200 from cache — no re-scan, no quota). The current list stays on
   * screen while the swap is in flight. */
  const [seniorityPending, setSeniorityPending] = useState(false);
  const changeSeniority = useCallback(
    async (seniority: GuestSeniority) => {
      const gid = getGuestId();
      if (!gid) return;
      setSeniorityPending(true);
      try {
        const resp = await apiService.guestMatches(
          gid,
          getDeviceToken() ?? undefined,
          undefined,
          undefined,
          undefined,
          seniority,
        );
        if (resp.data) applyMatchesResult(resp.data);
      } finally {
        setSeniorityPending(false);
      }
    },
    [applyMatchesResult],
  );

  /** Returning guest with a resume on file → straight to today's matches. */
  const goToMatches = useCallback(() => {
    if (!getGuestId()) return;
    setStep("matches");
    void loadMatches();
  }, [loadMatches]);

  /** Kick off the upload → parse → matches chain. The dropzone has already
   * validated type/size. */
  const startUpload = useCallback(
    async (file: File) => {
      fileRef.current = file;
      setParseError(null);
      setParseCta(null);
      setParseStatus(null);
      setParseProgress(null);
      setParsedResume(null);
      setProfile(null);
      setStep("parsing");

      const fp = fingerprintRef.current ?? (await getFingerprintHash());
      fingerprintRef.current = fp;
      const submit = await apiService.guestOnboard(
        file,
        fp,
        getGuestId() ?? undefined,
        getDeviceToken() ?? undefined,
      );
      if (submit.error || !submit.data?.job_id) {
        if (isUnavailable(submit.status)) {
          onUnavailable();
          return;
        }
        if (submit.status === 429) {
          const payload = (submit.errorPayload ?? {}) as GuestQuotaError;
          const cta = ctaFor429(payload, "upload");
          if (cta) {
            setParseCta(cta);
          } else {
            setParseError(
              "We've hit the guest upload limit from your network for now. Create a free account to continue right away. It takes a minute.",
            );
          }
        } else {
          setParseError(submit.error || "Upload failed. Please try again.");
        }
        return;
      }

      setGuestId(submit.data.guest_id);
      // v2: persist the server-issued anti-abuse device token and echo it on
      // every later guest call.
      if (submit.data.device_token) setDeviceToken(submit.data.device_token);

      const poll = await apiService.guestJobPoll<GuestParseResult>(
        submit.data.job_id,
        submit.data.guest_id,
        180000,
        undefined,
        setParseStatus,
        setParseProgress,
      );
      if (poll.error || !poll.data) {
        setParseError(
          poll.error ||
            "We couldn't read that resume. If it's a scan or image-based PDF, try exporting a text-based version and upload again.",
        );
        return;
      }
      // Result is nested: { parsed_resume: { structured, filename }, guest: {...} }.
      const structured = poll.data.parsed_resume?.structured;
      if (structured) setParsedResume(structured);
      const contact = (structured as { contact?: { name?: string } } | undefined)
        ?.contact;
      if (contact?.name) setGuestName(contact.name);
      // The `guest` block carries recognition + quota — no extra session call.
      // v2: recognized_name is present ONLY when the owning guest_id proved
      // the session; never synthesize a name from anything else.
      const guest = poll.data.guest;
      if (guest) {
        applyQuota(guest.tailors_used, guest.tailors_limit);
        if (guest.recognized) {
          setSession((s) => {
            const next: GuestSession = {
              ...(s ?? { exists: true }),
              exists: true,
              recognized: true,
            };
            if (guest.recognized_name) next.recognized_name = guest.recognized_name;
            return next;
          });
        }
      }
      // Profile reveal (v3): prefer the server's profile block; synthesize
      // from structured when absent (back-compat). If neither yields any
      // genuinely extracted field, skip straight to matches — never show an
      // empty reveal.
      const serverProfile =
        poll.data.profile && Object.keys(poll.data.profile).length
          ? poll.data.profile
          : null;
      const revealProfile = serverProfile ?? profileFromStructured(structured ?? null);
      if (revealProfile) {
        setProfile(revealProfile);
        setStep("profile");
      } else {
        setStep("matches");
        void loadMatches();
      }
    },
    [onUnavailable, loadMatches, applyQuota],
  );

  const retryUpload = useCallback(() => {
    if (fileRef.current) void startUpload(fileRef.current);
  }, [startUpload]);

  /** Tailor for ONE served match. v2 sends { guest_id, match_id,
   * device_token? } only — the JD is resolved server-side from the cache. */
  const startTailor = useCallback(
    async (match: GuestJobMatch) => {
      const gid = getGuestId();
      if (!gid) {
        toast.error("Upload your resume first so we can tailor it.");
        setStep("hero");
        return;
      }
      setActiveMatch(match);
      setTailored(null);
      setTailorError(null);
      setTailorCta(null);
      setTailorState("working");
      setStep("tailor");

      const submit = await apiService.guestTailor({
        guest_id: gid,
        match_id: match.match_id,
        device_token: getDeviceToken() ?? undefined,
      });
      if (submit.error || !submit.data?.job_id) {
        if (isUnavailable(submit.status)) {
          onUnavailable();
          return;
        }
        if (submit.status === 429) {
          const payload = (submit.errorPayload ?? {}) as GuestQuotaError;
          applyQuota(payload.tailors_used, payload.tailors_limit);
          if (
            payload.quota_exhausted &&
            typeof payload.tailors_used !== "number"
          ) {
            setTailorsUsed((used) => Math.max(used, tailorsLimit));
          }
          setTailorCta(
            ctaFor429(payload, "tailor") ?? {
              title: "Guest tailoring is busy right now",
              body: "Create a free account to keep going right now. Your resume and matches come with you.",
            },
          );
          setTailorState("cta");
          return;
        }
        setTailorError(
          submit.error || "Could not start tailoring. Please try again.",
        );
        setTailorState("error");
        return;
      }

      // Both the fresh 202 and the idempotent 200 { existing:true } carry the
      // server-confirmed quota numbers — update the meter immediately (the
      // completed result doesn't repeat them; no double-count).
      applyQuota(submit.data.tailors_used, submit.data.tailors_limit);

      const poll = await apiService.guestJobPoll<GuestTailorResult>(
        submit.data.job_id,
        gid,
        240000,
      );
      if (poll.error || !poll.data?.tailored_resume) {
        setTailorError(poll.error || "Tailoring failed. Please try again.");
        setTailorState("error");
        // A failed tailor releases the server-side reservation — re-read the
        // authoritative numbers instead of guessing.
        void refreshQuota();
        return;
      }
      setTailored(poll.data);
      setTailoredMatchId(match.match_id);
      setTailorState("done");
      writeTailoredPointer({
        job_id: submit.data.job_id,
        match_id: match.match_id,
        record_id: poll.data.record_id,
      });
    },
    [onUnavailable, applyQuota, refreshQuota, tailorsLimit],
  );

  const retryTailor = useCallback(() => {
    if (activeMatch) void startTailor(activeMatch);
  }, [activeMatch, startTailor]);

  /** Reopen the finished tailor result from the matches list. */
  const openTailored = useCallback(() => {
    if (!tailored) return;
    setTailorState("done");
    setStep("tailor");
  }, [tailored]);

  /** Issue a fresh short-lived token for the chosen format and trigger the
   * browser download through a plain anchor (the token is the capability —
   * no auth header). Re-issuing never consumes quota. */
  const downloadTailored = useCallback(
    async (format: GuestDownloadFormat) => {
      const gid = getGuestId();
      const recordId = tailored?.record_id;
      if (!gid || !recordId) {
        toast.error("This tailored resume can't be downloaded right now.");
        return;
      }
      setDownloading(format);
      try {
        const resp = await apiService.guestDownloadIssue(gid, recordId, format);
        if (resp.error || !resp.data?.token) {
          toast.error(
            resp.error ||
              "Could not prepare the download. Please try again in a moment.",
          );
          return;
        }
        const a = document.createElement("a");
        a.href = apiService.guestDownloadUrl(resp.data.token);
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        setDownloading(null);
      }
    },
    [tailored],
  );

  const backToMatches = useCallback(() => setStep("matches"), []);
  const backToHero = useCallback(() => setStep("hero"), []);

  /** Profile reveal → matches ("Find my matches" or the idle auto-advance). */
  const continueToMatches = useCallback(() => {
    setStep("matches");
    void loadMatches();
  }, [loadMatches]);

  return {
    // step machine
    step,
    backToMatches,
    backToHero,
    goToMatches,
    continueToMatches,
    // identity / recognition
    session,
    guestName,
    // quota
    tailorsUsed,
    tailorsLimit,
    remaining,
    // upload/parse
    startUpload,
    retryUpload,
    hasPendingFile: !!fileRef.current,
    pendingFileName: fileRef.current?.name ?? null,
    parseStatus,
    parseProgress,
    parseError,
    parseCta,
    parsedResume,
    // profile reveal
    profile,
    // matches
    matches,
    matchesState,
    matchesProgress,
    matchesMeta,
    matchesError,
    matchesCta,
    loadMatches,
    changeSeniority,
    seniorityPending,
    // tailor
    activeMatch,
    tailorState,
    tailorError,
    tailorCta,
    tailored,
    tailoredMatchId,
    startTailor,
    retryTailor,
    openTailored,
    // download
    downloading,
    downloadTailored,
  };
}

export type GuestFlow = ReturnType<typeof useGuestFlow>;
