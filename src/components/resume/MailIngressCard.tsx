import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Inbox, Copy, Check, CloudOff, ExternalLink, Loader2, Sparkles, X, MailPlus,
} from "lucide-react";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  MailIngressAddress,
  MailIngressSuggestion,
} from "@/types/mailIngress";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };
  return (
    <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[11px]" onClick={copy} aria-label={`Copy ${label}`}>
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function MailIngressCard() {
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [address, setAddress] = useState<MailIngressAddress | null>(null);
  const [suggestions, setSuggestions] = useState<MailIngressSuggestion[]>([]);
  const [provisioning, setProvisioning] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    (async () => {
      const res = await apiService.getMailIngressSuggestions();
      if (cancelled) return;
      // 404 => feature flag off => hide the surface entirely.
      if (res.status === 404) {
        setHidden(true);
        setLoading(false);
        return;
      }
      if (res.data) {
        setAddress({
          provisioned: res.data.provisioned,
          address: res.data.address,
          gmail_filter: res.data.gmail_filter,
          gmail_deep_link: res.data.gmail_deep_link,
        });
        setSuggestions(res.data.suggestions ?? []);
      } else if (res.error) {
        setLoadError(true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const provision = async () => {
    setProvisioning(true);
    const res = await apiService.provisionMailIngress();
    setProvisioning(false);
    if (res.status === 404) {
      setHidden(true);
      return;
    }
    if (res.error) {
      toast.error("Couldn't provision an address", { description: res.error });
      return;
    }
    setAddress(res.data ?? null);
    toast.success("Your capture address is ready");
  };

  const resolve = async (id: string, action: "confirm" | "reject") => {
    setResolving(id);
    const res = await apiService.resolveMailIngressSuggestion(id, action);
    setResolving(null);
    if (res.error) {
      toast.error("Couldn't update suggestion", { description: res.error });
      return;
    }
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  if (hidden) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Inbox className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold leading-tight text-foreground">Inbox capture</h3>
          <p className="text-xs text-muted-foreground">Forward job emails to auto-update your pipeline.</p>
        </div>
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      ) : loadError ? (
        <div className="flex h-24 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
          <CloudOff className="h-3.5 w-3.5 shrink-0 text-warning" />
          <span>Couldn't load inbox capture.</span>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="font-semibold text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      ) : !address?.provisioned ? (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] px-4 py-6 text-center">
          <MailPlus className="mx-auto mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-medium">Get your personal capture address</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            We'll generate an address and a ready-made Gmail filter so recruiter emails flow straight into your pipeline.
          </p>
          <Button size="sm" className="mt-3 gap-1.5" disabled={provisioning} onClick={provision}>
            {provisioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Create my address
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Address */}
          {address.address && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-xs font-medium">{address.address}</code>
              <CopyButton value={address.address} label="address" />
            </div>
          )}

          {/* Gmail filter */}
          {address.gmail_filter && (
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="overline">Gmail filter</p>
                <CopyButton value={address.gmail_filter} label="Gmail filter" />
              </div>
              <code className="mt-1 block break-all text-xs text-foreground/85">{address.gmail_filter}</code>
              {address.gmail_deep_link && (
                <a
                  href={address.gmail_deep_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  Create this filter in Gmail <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Low-confidence suggestions */}
          <div>
            <p className="overline mb-2">
              Needs your call ({suggestions.length})
            </p>
            {suggestions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing waiting — captured emails with clear signals apply automatically.</p>
            ) : (
              <ul className="space-y-2">
                {suggestions.map((s) => (
                  <li key={s.id} className="rounded-lg border border-border/70 bg-background/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {s.role || s.subject || "Update"}
                          {s.company ? <span className="font-normal text-muted-foreground"> · {s.company}</span> : null}
                        </p>
                        {s.snippet && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.snippet}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                          {s.suggested_status && (
                            <span className="rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0 font-medium text-primary">
                              → {s.suggested_status}
                            </span>
                          )}
                          <span className="text-muted-foreground">{Math.round((s.confidence <= 1 ? s.confidence * 100 : s.confidence))}% sure</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn("h-8 gap-1 px-2 text-xs", resolving === s.id && "opacity-60")}
                          disabled={resolving === s.id}
                          onClick={() => resolve(s.id, "confirm")}
                        >
                          <Check className="h-3 w-3" /> Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground"
                          disabled={resolving === s.id}
                          onClick={() => resolve(s.id, "reject")}
                          aria-label="Reject suggestion"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
