import type { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Tokenized empty state used by shell destinations still being migrated out of
 * the ResumeParser monolith. Purely presentational — no data, no gating.
 */
export function ComingSoon({ icon: Icon, title, description }: ComingSoonProps) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <span
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <Icon className="h-7 w-7" />
      </span>
      <p className="overline mb-2">Migrating</p>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
        Coming soon
      </span>
    </section>
  );
}
