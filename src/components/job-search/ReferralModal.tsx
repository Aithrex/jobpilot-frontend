import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Users, GraduationCap, Loader2, Copy, Check, MessageSquarePlus, ExternalLink, AlertCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiService } from "@/lib/api";
import { useUpgrade } from "@/components/billing/UpgradeModalProvider";
import { cn } from "@/lib/utils";
import type { Job } from "@/types/jobs";
import type { Referral } from "@/types/referrals";

interface ReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Pick<Job, "company" | "title" | "job_id" | "description">;
}

function ReferralRow({ referral, job }: { referral: Referral; job: ReferralModalProps["job"] }) {
  const [drafting, setDrafting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const upgrade = useUpgrade();

  const draft = async () => {
    setDrafting(true);
    const res = await apiService.draftReferralAsk(referral, {
      company: job.company,
      title: job.title,
      job_id: job.job_id,
      description: job.description,
    });
    setDrafting(false);
    if (res.error) {
      if (res.status === 403) {
        upgrade.open({ feature: "referrals", highlight: "premium_plus" });
        return;
      }
      toast.error("Couldn't draft the ask", { description: res.error });
      return;
    }
    setMessage(res.data?.message ?? "");
  };

  const copy = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <li className="rounded-xl border border-border/70 bg-background/50 p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {(referral.name || "?").charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{referral.name}</p>
            {referral.is_alumni && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                <GraduationCap className="h-2.5 w-2.5" /> Alumni
              </span>
            )}
          </div>
          {(referral.headline || referral.title) && (
            <p className="truncate text-xs text-muted-foreground">{referral.headline || referral.title}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {referral.alumni_of && <span>{referral.alumni_of}</span>}
            {referral.mutuals != null && referral.mutuals > 0 && <span>{referral.mutuals} mutual</span>}
            {referral.location && <span>{referral.location}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {referral.profile_url && (
            <a
              href={referral.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              Profile <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {!message && (
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" disabled={drafting} onClick={draft}>
              {drafting ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquarePlus className="h-3 w-3" />}
              Draft the ask
            </Button>
          )}
        </div>
      </div>

      {message != null && (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
          <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/90">{message}</p>
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={copy}>
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export function ReferralModal({ open, onOpenChange, job }: ReferralModalProps) {
  const [loading, setLoading] = useState(false);
  const [referrals, setReferrals] = useState<Referral[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const upgrade = useUpgrade();

  useEffect(() => {
    if (!open || !job.company) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setReferrals(null);
      const res = await apiService.getReferrals(job.company);
      if (cancelled) return;
      setLoading(false);
      if (res.error) {
        if (res.status === 403) {
          onOpenChange(false);
          upgrade.open({ feature: "referrals", highlight: "premium_plus" });
          return;
        }
        setError(res.error);
        return;
      }
      setReferrals(res.data?.referrals ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, job.company, onOpenChange, upgrade]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Find a referral
          </DialogTitle>
          <DialogDescription>
            People at <span className="font-medium text-foreground">{job.company}</span> who could put in a word
            {job.title ? ` for ${job.title}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className={cn("max-h-[60vh] overflow-y-auto", loading && "overflow-hidden")}>
          {loading && (
            <ul className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </ul>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && referrals && referrals.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-10 text-center">
              <Users className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No referral matches found for this company yet.</p>
            </div>
          )}

          {!loading && !error && referrals && referrals.length > 0 && (
            <ul className="space-y-2">
              {referrals.map((r, i) => (
                <ReferralRow key={r.id || `${r.name}-${i}`} referral={r} job={job} />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
