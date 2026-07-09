import { ShieldCheck, ArrowRight, FileText, GitPullRequest } from 'lucide-react';
import { Container, Eyebrow, Reveal } from './_shared';

/** The differentiation angle: honesty is a feature, not a disclaimer. */
export function IntegritySection() {
  return (
    <section className="border-y border-border bg-muted/30 py-20 sm:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <Eyebrow icon={ShieldCheck}>Integrity by design</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            We never fabricate. Every line traces to your real work.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Other tools invent impressive-sounding experience you can&apos;t defend in an interview. JobPilot only ever
            reshapes what you&apos;ve actually done — so every claim on your résumé links back to a source you can stand
            behind when it counts.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'No invented titles, metrics, or employers',
              'Each bullet is traceable to your input',
              'You approve every change before it ships',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm text-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* claim → source trace */}
        <Reveal delay={0.08}>
          <div className="mesh-accent rounded-2xl border border-border p-5 shadow-lg shadow-primary/5 sm:p-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">On your résumé</p>
              <p className="mt-2 font-medium leading-snug text-foreground">
                “Cut checkout latency 40% by re-architecting the payments flow.”
              </p>
            </div>

            <div className="my-3 flex items-center gap-2 pl-4 text-xs font-medium text-primary">
              <ArrowRight className="h-4 w-4 rotate-90" aria-hidden />
              traces to
            </div>

            <div className="space-y-2">
              <TraceRow icon={GitPullRequest} title="GitHub · PR #482" sub="Payments latency refactor" />
              <TraceRow icon={FileText} title="Your intake notes" sub="“led the checkout perf project”" />
            </div>

            <p className="mt-4 flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-xs font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
              Verified against your own sources — nothing invented.
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function TraceRow({ icon: Icon, title, sub }: { icon: typeof FileText; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
