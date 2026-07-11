import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, type LucideIcon } from "lucide-react";

interface WorkspaceFallbackCardProps {
  icon: LucideIcon;
  /** Name of the tool as it appears in the classic workspace. */
  title: string;
  /** One line describing what the tool does. */
  description: string;
  /** Destination in the classic workspace, e.g. "/app?tab=tailor". */
  to: string;
}

/**
 * Tokenized "Open in workspace" card for Craft tools that still live inside the
 * ResumeParser monolith. Rather than risk extracting a monolith-embedded tab,
 * we deep-link the user into the classic workspace and set expectations that
 * the tool is migrating here. Purely presentational — no data, no gating.
 */
export function WorkspaceFallbackCard({
  icon: Icon,
  title,
  description,
  to,
}: WorkspaceFallbackCardProps) {
  return (
    <section className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center px-6 py-10 text-center">
      <span
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <Icon className="h-6 w-6" />
      </span>

      <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-left text-xs text-muted-foreground">
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          This tool still lives in the classic workspace — we&rsquo;re moving it
          here soon.
        </span>
      </div>

      <Link
        to={to}
        className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Open in workspace
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
