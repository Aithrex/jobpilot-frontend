import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Linkedin, Upload, Loader2, GitCompareArrows, AlertCircle, CheckCircle2, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import { useUpgrade } from "@/components/billing/UpgradeModalProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LinkedInDiff, LinkedInDiffItem } from "@/types/referrals";

const SEVERITY_STYLES: Record<NonNullable<LinkedInDiffItem["severity"]>, string> = {
  info: "border-border bg-muted/40 text-muted-foreground",
  minor: "border-warning/25 bg-warning/10 text-warning",
  major: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** LinkedIn brand blue — intentional brand literal for the mark only; chrome stays tokenized. */
const LINKEDIN_TILE = "bg-[#0a66c2]/10 text-[#0a66c2]";

function DiffRow({ item }: { item: LinkedInDiffItem }) {
  const sev = item.severity ?? "info";
  return (
    <li className="rounded-lg border border-border/70 bg-background/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{item.label || item.field}</p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide",
            SEVERITY_STYLES[sev],
          )}
        >
          {sev}
        </span>
      </div>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        <div className="rounded-md bg-muted/50 px-2 py-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Resume</p>
          <p className="text-xs text-foreground/85">{item.resume_value || "—"}</p>
        </div>
        <div className="rounded-md bg-muted/50 px-2 py-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">LinkedIn</p>
          <p className="text-xs text-foreground/85">{item.linkedin_value || "—"}</p>
        </div>
      </div>
      {item.suggestion && (
        <p className="mt-2 text-[11px] leading-snug text-primary/90">{item.suggestion}</p>
      )}
    </li>
  );
}

export function LinkedInArchiveCard() {
  const upgrade = useUpgrade();
  const inputRef = useRef<HTMLInputElement>(null);
  const [diff, setDiff] = useState<LinkedInDiff | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    (async () => {
      const res = await apiService.getLinkedInDiff().catch(() => null);
      if (cancelled) return;
      if (res?.data) setDiff(res.data);
      // 404 = no archive yet (the invitation state below); anything else is a real failure.
      else if (!res || (res.error && res.status !== 404)) setLoadError(true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const res = await apiService.uploadLinkedInArchive(file);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (res.error) {
      if (res.status === 403) {
        upgrade.open({ feature: "linkedin_archive", highlight: "premium_plus" });
        return;
      }
      toast.error("Couldn't process the archive", { description: res.error });
      return;
    }
    setDiff(res.data ?? null);
    toast.success("LinkedIn archive analyzed");
  };

  const items = diff?.items ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-soft"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${LINKEDIN_TILE}`}>
            <Linkedin className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold text-foreground">LinkedIn vs. resume</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {diff?.has_archive ? "Re-upload" : "Upload archive"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      {loading ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
      ) : loadError ? (
        <div className="flex h-16 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
          <CloudOff className="h-3.5 w-3.5 shrink-0 text-warning" />
          <span>Couldn't load your comparison.</span>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="font-semibold text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      ) : !diff?.has_archive ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
          <GitCompareArrows className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Upload your LinkedIn data export to spot where your profile and resume disagree.
          </p>
          <a
            href="https://www.linkedin.com/mypreferences/d/download-my-data"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-[11px] font-medium text-primary hover:underline"
          >
            How to get your archive
          </a>
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-3 text-xs text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Your LinkedIn and resume are consistent. Nice.
        </div>
      ) : (
        <>
          {diff?.summary && (
            <p className="mb-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              {diff.summary}
            </p>
          )}
          <ul className="space-y-2">
            {items.map((it, i) => (
              <DiffRow key={`${it.field}-${i}`} item={it} />
            ))}
          </ul>
        </>
      )}
    </motion.div>
  );
}
