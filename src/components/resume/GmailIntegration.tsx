import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import GmailSuggestions, { useGmailSuggestions } from "@/components/resume/GmailSuggestions";

type GmailStatus = {
  configured: boolean;
  connected: boolean;
  gmail_address?: string | null;
  last_synced_at?: string | null;
  pending_suggestions: number;
};

/** Gmail mark - Google's literal brand colors (intentional; all chrome around it stays tokenized). */
const GMAIL_MARK = "bg-gradient-to-br from-[#EA4335] via-[#FBBC05] to-[#34A853]";

function formatRelative(iso?: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "never";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function GmailIntegration({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState(false);
  const [linking, setLinking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const loadStatus = useCallback(async () => {
    const resp = await apiService.getGmailStatus();
    if (resp.data) {
      setStatus(resp.data);
      setStatusError(false);
    } else if (resp.error) {
      setStatusError(true);
    }
    setLoading(false);
  }, []);

  const {
    suggestions,
    busyId,
    apply: handleApply,
    dismiss: handleDismiss,
    reload: loadSuggestions,
    setSuggestions,
  } = useGmailSuggestions(Boolean(status?.connected), onSyncComplete);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // If we land here via the OAuth callback, refresh once the user arrives.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("gmail") === "linked") {
      toast.success("Gmail linked. Use Sync now to scan recent emails.");
      url.searchParams.delete("gmail");
      window.history.replaceState({}, "", url.toString());
      loadStatus();
    }
  }, [loadStatus]);

  const handleConnect = useCallback(async () => {
    setLinking(true);
    const resp = await apiService.getGmailAuthUrl();
    setLinking(false);
    if (resp.error || !resp.data?.auth_url) {
      toast.error(resp.error || "Failed to start Gmail link");
      return;
    }
    window.location.href = resp.data.auth_url;
  }, []);

  // Track the in-flight sync so we can keep polling across remounts (e.g.
  // user switches tabs) and clean up on unmount without leaking timers.
  const syncPollRef = useRef<{ jobId: string; cancelled: boolean } | null>(null);

  // Progressive backoff: short waits up front (most syncs finish in <30s),
  // longer waits as it drags on (avoids hammering the API for slow inboxes).
  // Total horizon at index 60 ≈ 7 minutes, which covers the worst-case first
  // sync after a 60-day backfill with per-record LLM calls.
  const pollDelayMs = (attempt: number): number => {
    if (attempt < 3) return 2000;        // 0-6s
    if (attempt < 8) return 3000;        // 6-21s
    if (attempt < 16) return 5000;       // 21-61s
    if (attempt < 30) return 8000;       // 61-173s
    return 12000;                        // 173s+
  };

  const handleSync = useCallback(async () => {
    setSyncing(true);
    const resp = await apiService.syncGmail();
    if (resp.error || !resp.data?.job_id) {
      setSyncing(false);
      toast.error(resp.error || "Failed to start sync");
      return;
    }

    const jobId = resp.data.job_id;
    syncPollRef.current = { jobId, cancelled: false };
    const toastId = toast.loading("Scanning your inbox... this can take ~30-90s");

    // Poll loop: progressive backoff, no fixed deadline. We keep going until
    // the job either completes or fails - a slow first-time scan can take
    // several minutes, and asking the user to refresh felt broken. To avoid
    // lying to ourselves, we cap at attempt=80 (~12 minutes wall clock at the
    // settled cadence) which is well past any legitimate sync time.
    let final: { messages_scanned: number; auto_applied: number; suggested: number; ignored: number } | null = null;
    let lastError: string | null = null;
    let stalledToastShown = false;

    for (let attempt = 0; attempt < 80; attempt++) {
      // Bail early if a newer sync started or the component unmounted  - 
      // syncPollRef.current is reset to null on unmount.
      if (!syncPollRef.current || syncPollRef.current.cancelled || syncPollRef.current.jobId !== jobId) {
        return;
      }
      await new Promise(r => setTimeout(r, pollDelayMs(attempt)));
      if (!syncPollRef.current || syncPollRef.current.cancelled || syncPollRef.current.jobId !== jobId) {
        return;
      }
      const poll = await apiService.pollGmailSyncJob(jobId);
      if (poll.error) {
        // Transient errors (network blip, brief 5xx) are common during long
        // jobs - don't break the loop, just remember the latest and continue.
        lastError = poll.error;
        continue;
      }
      lastError = null;
      const status = poll.data?.status;
      if (status === "completed") {
        final = poll.data!.result || null;
        break;
      }
      if (status === "failed") {
        lastError = poll.data?.error || "Sync failed";
        break;
      }
      // Update the toast text once we cross the "this is taking a while"
      // threshold so the user sees we're still on it instead of stuck.
      if (!stalledToastShown && attempt >= 16) {
        toast.loading("Still scanning. Large inboxes can take a couple of minutes...", { id: toastId });
        stalledToastShown = true;
      }
    }

    syncPollRef.current = null;
    setSyncing(false);

    if (final) {
      toast.success(
        `Scanned ${final.messages_scanned} email${final.messages_scanned === 1 ? "" : "s"} · ${final.auto_applied} auto-applied · ${final.suggested} to review`,
        { id: toastId },
      );
      await Promise.all([loadStatus(), loadSuggestions()]);
      onSyncComplete?.();
      return;
    }

    if (lastError) {
      toast.error(lastError, { id: toastId });
      return;
    }

    // We ran out of attempts without a terminal status. Refresh the data
    // anyway - the job is almost certainly done; we just stopped polling.
    toast.success("Sync is taking longer than usual. Showing what's ready so far.", { id: toastId });
    await Promise.all([loadStatus(), loadSuggestions()]);
    onSyncComplete?.();
  }, [loadStatus, loadSuggestions, onSyncComplete]);

  // Cancel any in-flight poll loop on unmount so we don't keep hitting the
  // API after the user has navigated away.
  useEffect(() => () => {
    if (syncPollRef.current) syncPollRef.current.cancelled = true;
    syncPollRef.current = null;
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!window.confirm("Disconnect Gmail? Pending suggestions will be discarded.")) return;
    const resp = await apiService.disconnectGmail();
    if (resp.error) { toast.error(resp.error); return; }
    setSuggestions([]);
    await loadStatus();
    toast.success("Gmail disconnected.");
  }, [loadStatus, setSuggestions]);

  const pendingCount = suggestions.length;

  // Loading - a stable-height stand-in for the banner so nothing shifts.
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-soft" aria-hidden="true">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-56 max-w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // Error - quiet inline failure with a retry, in place of the banner.
  if (statusError && !status) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-3.5 text-xs text-muted-foreground shadow-soft">
        <span>Couldn't check your Gmail connection.</span>
        <button
          onClick={() => { setLoading(true); void loadStatus(); }}
          className="font-semibold text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status) return null;
  if (!status.configured) return null; // server has no Google creds - hide silently

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-soft">
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`w-9 h-9 rounded-xl ${GMAIL_MARK} flex items-center justify-center text-white text-sm font-bold shadow-soft`}>
            ✉
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-foreground">
              {status.connected ? "Gmail linked" : "Auto-update from Gmail"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {status.connected
                ? <>{status.gmail_address || " - "} · last sync {formatRelative(status.last_synced_at)}</>
                : "Link your inbox so confirmations, interviews, and rejections move cards automatically."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!status.connected ? (
              <button
                onClick={handleConnect}
                disabled={linking}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {linking ? "Opening Google..." : "Connect Gmail"}
              </button>
            ) : (
              <>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {syncing ? "Syncing..." : "Sync now"}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {status.connected && pendingCount > 0 && (
        <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="overline text-primary">
              Suggested updates · {pendingCount}
            </p>
            <button
              onClick={() => setShowSuggestions(s => !s)}
              className="text-[10px] font-medium text-primary hover:underline"
            >
              {showSuggestions ? "Hide" : "Show"}
            </button>
          </div>
          {showSuggestions && (
            <GmailSuggestions
              suggestions={suggestions}
              busyId={busyId}
              onApply={handleApply}
              onDismiss={handleDismiss}
              className="rounded-lg border border-border/70 bg-background/60"
            />
          )}
        </div>
      )}
    </div>
  );
}
