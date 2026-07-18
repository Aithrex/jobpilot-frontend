import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Check, Github, Linkedin, Loader2, Plug } from "lucide-react";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ConnectStatus } from "@/types/career";
import GmailIntegration from "@/components/resume/GmailIntegration";
// import { ApifyKeyCard } from "@/components/job-search/ApifyKeyCard";  // APIFY DISABLED (temporary)

type Provider = "github" | "linkedin";

interface ProviderRowProps {
  provider: Provider;
  icon: typeof Github;
  label: string;
  connected: boolean;
  detail?: string;
  description: string;
  onChanged: () => void;
}

function ProviderRow({
  provider,
  icon: Icon,
  label,
  connected,
  detail,
  description,
  onChanged,
}: ProviderRowProps) {
  const [busy, setBusy] = useState(false);

  const connect = useCallback(async () => {
    setBusy(true);
    const r = await apiService.getConnectAuthorizeUrl(provider);
    if (r.data?.authorize_url) {
      // Full-page redirect out to the provider's OAuth consent screen.
      window.location.href = r.data.authorize_url;
      return;
    }
    setBusy(false);
    toast.error(r.error || `${label} connect is unavailable right now.`);
  }, [provider, label]);

  const disconnect = useCallback(async () => {
    setBusy(true);
    const r = await apiService.disconnectProvider(provider);
    setBusy(false);
    if (r.data?.ok) {
      toast.success(`${label} disconnected.`);
      onChanged();
      return;
    }
    toast.error(r.error || `Couldn't disconnect ${label}.`);
  }, [provider, label, onChanged]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                connected
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {connected && <Check className="h-3 w-3" aria-hidden="true" />}
              {connected ? "Connected" : "Not connected"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {connected && detail ? detail : description}
          </p>
        </div>
      </div>
      <Button
        variant={connected ? "outline" : "default"}
        size="sm"
        onClick={connected ? disconnect : connect}
        disabled={busy}
        className="min-h-[44px] shrink-0"
      >
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {connected ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

/**
 * Unified integrations hub — consolidates the previously scattered connections
 * (Gmail inbox sync, GitHub + LinkedIn OAuth, and the personal Apify key) into
 * one settings panel. Each connection reuses its existing feature component or
 * the shared connect endpoints via apiService.
 */
export default function IntegrationsPanel() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await apiService.getConnectStatus();
    setLoading(false);
    if (r.error || !r.data) {
      setError(r.error || "Couldn't load your connections.");
      return;
    }
    setStatus(r.data);
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  return (
    <div className="max-w-2xl space-y-8">
      {/* Gmail inbox sync */}
      <section className="space-y-3">
        <SectionHeading
          title="Gmail"
          description="Sync your inbox so JobPilot can suggest application status updates."
        />
        <GmailIntegration />
      </section>

      {/* GitHub + LinkedIn OAuth */}
      <section className="space-y-3">
        <SectionHeading
          title="Professional accounts"
          description="Connect GitHub and LinkedIn to power proof-of-work and profile audits."
        />
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-[76px] w-full rounded-xl" />
            <Skeleton className="h-[76px] w-full rounded-xl" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="space-y-3">
              <p className="text-sm text-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void loadStatus()} className="min-h-[44px]">
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ProviderRow
              provider="github"
              icon={Github}
              label="GitHub"
              connected={!!status?.github.connected}
              detail={status?.github.login ? `Connected as ${status.github.login}` : undefined}
              description="Surface real projects as proof-of-work on your résumé."
              onChanged={loadStatus}
            />
            <ProviderRow
              provider="linkedin"
              icon={Linkedin}
              label="LinkedIn"
              connected={!!status?.linkedin.connected}
              detail={status?.linkedin.name ? `Connected as ${status.linkedin.name}` : undefined}
              description="Audit and polish your public profile against target roles."
              onChanged={loadStatus}
            />
          </div>
        )}
      </section>

      {/* --- APIFY DISABLED (temporary): BYO Apify key card hidden. Restore to re-enable. ---
      <section className="space-y-3">
        <SectionHeading
          title="Job search"
          description="Add your own Apify key so daily pipeline runs use your credit."
        />
        <ApifyKeyCard />
      </section>
      --- APIFY DISABLED (temporary) --- */}
    </div>
  );
}
