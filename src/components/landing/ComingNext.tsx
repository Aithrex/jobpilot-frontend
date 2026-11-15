import {
  AUTO_APPLY,
  AUTOFILL,
  NO_WAITLIST_CTA,
  ROADMAP_FEATURED,
  ROADMAP_SECONDARY,
  STATUS_LABEL,
  WHATSAPP,
  type Capability,
} from '@/lib/capabilities';
import { Container, Section } from './_shared';

/**
 * "Coming next": the roadmap, shown because it is part of what a reader is
 * buying into, and labelled so that none of it can be mistaken for something
 * that works today.
 *
 * It is the quietest section on the page and that is deliberate. How much
 * page a feature occupies is itself a claim about how real it is, so the
 * roadmap is three small cards of text. Everything that ships gets a scene
 * you can operate; nothing here does, and there is no picture of an interface
 * that does not exist yet.
 *
 * Every guardrail here is load-bearing:
 *  - each status label is read from the capability registry, never typed;
 *  - nothing is called an autonomous agent. Auto Apply is approval-first, and
 *    the copy says so before it says anything else;
 *  - no application counts, success rates, employer names or hiring-system
 *    logos appear;
 *  - the WhatsApp line describes opt-in alerts and approval requests the user
 *    asked for, never recruiter outreach, and never implies Meta is involved;
 *  - the only action offered is creating an account. There is no waitlist;
 *  - no padlock: a lock reads "pay to unlock", and none of this is for sale.
 */

/** One line each. The registry's full description sits in the fold below it. */
const TEASER: Record<string, string> = {
  [AUTO_APPLY.id]: 'Applications prepared or sent, inside limits you set.',
  [AUTOFILL.id]: 'A browser extension that fills application forms for you.',
  [WHATSAPP.id]: 'Match alerts and approval requests in WhatsApp.',
};

/** The constraints that come with each feature, as short checkable lines. */
const GUARDRAILS: Record<string, readonly string[]> = {
  [AUTO_APPLY.id]: [
    'You choose the ceiling: prepare only, ask me first, or apply within the daily limit you set.',
    'Sensitive or unclear fields stop and ask you, in every mode.',
  ],
  [AUTOFILL.id]: [
    'Fills the form in your own browser, from your own profile.',
    'Every field is yours to review. You press submit.',
  ],
  [WHATSAPP.id]: [
    'Explicit opt-in, quiet hours, one-tap unsubscribe.',
    'Only your own applications, never recruiter outreach.',
  ],
};

/**
 * The secondary row states its items' status ONCE, in its own label, when they
 * all share one. Derived from the registry rather than typed, so the label can
 * never claim a readiness the data does not have.
 */
const sharedSecondaryStatus =
  ROADMAP_SECONDARY.length > 0 &&
  ROADMAP_SECONDARY.every((c) => c.status === ROADMAP_SECONDARY[0].status)
    ? ROADMAP_SECONDARY[0].status
    : null;

const secondaryLabel = sharedSecondaryStatus
  ? `Also ${STATUS_LABEL[sharedSecondaryStatus].toLowerCase()}:`
  : 'Also on the roadmap:';

function Entry({ cap }: { cap: Capability }) {
  return (
    <li className="flex flex-col rounded-[1.25rem] border border-border p-6">
      <span className="pub-chip self-start">{STATUS_LABEL[cap.status]}</span>
      <h3 className="pub-h4 mt-4">{cap.name}</h3>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-muted">{TEASER[cap.id]}</p>
      {/* The detail is one press away rather than on the page: a roadmap item
          should take less room than anything that ships. Native disclosure,
          so it works without script and costs nothing in the bundle. */}
      <details className="pub-faq group mt-4 border-t border-border pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-[0.875rem] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          How you stay in control
          <span aria-hidden className="pub-faq-icon text-muted-foreground" />
        </summary>
        <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-muted">{cap.blurb}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {(GUARDRAILS[cap.id] ?? []).map((line) => (
            <li key={line} className="flex gap-2.5 text-[0.875rem] leading-relaxed text-foreground">
              <span
                aria-hidden
                className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ink-subtle))]"
              />
              {line}
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export function ComingNext() {
  return (
    <Section id="coming-next" labelledBy="coming-next-heading" pad="bottom">
      <Container>
        <h2 id="coming-next-heading" className="pub-h3">
          Coming next.{' '}
          <span className="text-[hsl(var(--ink-subtle))]">Not available yet.</span>
        </h2>

        <ul className="mt-8 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {ROADMAP_FEATURED.map((cap) => (
            <Entry key={cap.id} cap={cap} />
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3 text-[0.9375rem] sm:flex-row sm:items-baseline sm:justify-between">
          {ROADMAP_SECONDARY.length > 0 && (
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-ink-muted">
              <span className="font-semibold text-foreground">{secondaryLabel}</span>
              {ROADMAP_SECONDARY.map((cap, i) => (
                <span key={cap.id}>
                  <span>{cap.name}</span>
                  {!sharedSecondaryStatus && (
                    <span className="ml-1.5 text-muted-foreground">
                      {STATUS_LABEL[cap.status]}
                    </span>
                  )}
                  {i < ROADMAP_SECONDARY.length - 1 && <span aria-hidden>,</span>}
                </span>
              ))}
            </p>
          )}
          <p className="text-muted-foreground">{NO_WAITLIST_CTA}</p>
        </div>
      </Container>
    </Section>
  );
}
