import { type ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { Container, Reveal, RevealGroup, RevealItem } from './_shared';
import {
  DataLifecycleBase,
  GlyphClaimed,
  GlyphDeleted,
  GlyphDoc,
  GlyphProcess,
  GlyphResults,
  GlyphSignal,
  GlyphToken,
} from './assets/data-lifecycle';

/**
 * Trust and privacy as ONE visual data-lifecycle diagram: upload -> secure
 * AI processing -> privacy-protected quota signals -> guest results ->
 * branch (claim the account and the data becomes yours, or unclaimed guest
 * data is deleted after 30 days).
 *
 * The illustration (assets/data-lifecycle.tsx) is aria-hidden inside a
 * role="img" wrapper with a thorough label; every fact also lives as plain
 * DOM text in the numbered captions and legend, so the section is fully
 * understandable with animation (and the image itself) off. Deliberately NO
 * testimonials, user counts, ratings, employer logos, awards, or success
 * rates.
 */

const DIAGRAM_LABEL =
  'Data lifecycle diagram. Step 1: you upload your resume, which becomes resume content. ' +
  'Step 2: secure AI processing reads and scores it; IntegrityGuard can reword and reorder your real experience and never invents facts. ' +
  'Step 3: privacy-protected quota signals: a small first-party device token in your browser plus HMAC-protected identity signals help keep the free trial fair. ' +
  'Step 4: guest results: five matched roles and one tailored resume, with no account. ' +
  'Then one of two endings: A, you claim a free account and the data is kept and becomes yours, or B, unclaimed guest data is automatically deleted after 30 days.';

const STEPS: Array<{
  n: string;
  Glyph: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = [
  {
    n: '1',
    Glyph: GlyphDoc,
    title: 'You upload your resume',
    body: 'A PDF or DOCX. Its parsed experience, skills, and education are resume content, used only to match and tailor for you.',
  },
  {
    n: '2',
    Glyph: GlyphProcess,
    title: 'Secure AI processing',
    body: 'The AI reads and scores your experience against direct employer openings. IntegrityGuard can reword and reorder it, and never invents employers, titles, dates, or skills.',
  },
  {
    n: '3',
    Glyph: GlyphSignal,
    title: 'Privacy-protected quota signals',
    body: 'We store a small first-party device token in your browser to help keep the free trial fair. It is used for abuse prevention and free-trial limits, and identity signals are HMAC protected.',
  },
  {
    n: '4',
    Glyph: GlyphResults,
    title: 'Your guest results',
    body: 'Five matched roles and one tailored resume, ready without an account.',
  },
];

const LEGEND: Array<{ Glyph: ComponentType<{ className?: string }>; label: string }> = [
  { Glyph: GlyphDoc, label: 'Resume content' },
  { Glyph: GlyphToken, label: 'First-party device token' },
  { Glyph: GlyphSignal, label: 'HMAC-protected identity signals' },
  { Glyph: GlyphProcess, label: 'AI processing' },
  { Glyph: GlyphClaimed, label: 'Claimed account data' },
  { Glyph: GlyphDeleted, label: 'Deleted unclaimed data' },
];

export function TrustSection() {
  return (
    <section id="trust" aria-label="Trust and privacy" className="scroll-mt-24 border-t border-border py-16 sm:py-20">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            What happens to your data
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
            One lifecycle, start to finish: what we read, the signals we keep, and the moment your data is either yours
            or gone.
          </p>
        </Reveal>

        <figure className="mx-auto mt-10 grid max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
          <div role="img" aria-label={DIAGRAM_LABEL} className="mx-auto w-full max-w-[320px] lg:max-w-[380px]">
            <DataLifecycleBase />
          </div>

          <figcaption className="min-w-0">
            <RevealGroup as="ol" className="space-y-3">
              {STEPS.map(({ n, Glyph, title, body }) => (
                <RevealItem as="li" key={n} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5">
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted font-mono text-[11px] font-bold text-muted-foreground"
                    aria-hidden
                  >
                    {n}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Glyph className="h-4 w-4" />
                      {title}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>

            {/* the branch: two endings, distinct shape AND color */}
            <RevealGroup className="mt-3 grid gap-3 sm:grid-cols-2">
              <RevealItem className="rounded-xl border border-success/30 bg-success/5 p-3.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <GlyphClaimed className="h-4 w-4" />
                  <span aria-hidden className="font-mono text-[11px] font-bold text-muted-foreground">
                    A
                  </span>
                  Claim your account
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Create a free account and your resume, matches, and tailored draft are kept. The data becomes yours,
                  in your workspace.
                </p>
              </RevealItem>
              <RevealItem className="rounded-xl border border-dashed border-input bg-muted/30 p-3.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <GlyphDeleted className="h-4 w-4" />
                  <span aria-hidden className="font-mono text-[11px] font-bold text-muted-foreground">
                    B
                  </span>
                  Or walk away
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Unclaimed guest data is deleted after 30 days.
                </p>
              </RevealItem>
            </RevealGroup>

            {/* legend: shape + color, never color alone */}
            <Reveal className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Legend</p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                {LEGEND.map(({ Glyph, label }) => (
                  <li key={label} className={cn('flex items-center gap-1.5 text-xs text-muted-foreground')}>
                    <Glyph className="h-4 w-4" />
                    {label}
                  </li>
                ))}
              </ul>
            </Reveal>
          </figcaption>
        </figure>
      </Container>
    </section>
  );
}
