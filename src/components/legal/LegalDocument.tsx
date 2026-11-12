import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { PublicPageShell } from '@/components/landing/PublicPageShell';
import { cn } from '@/lib/utils';

/**
 * The shell every legal and trust page shares: the public page chrome (nav,
 * footer, skip link, one `main`), a readable measure, an `h1`, the
 * "Last updated" line and an optional "On this page" index.
 *
 * Structure only. Every color and font comes from the design tokens, so the
 * public redesign restyles these pages by changing tokens, not this file.
 */

export const LEGAL_LINK_CLASS =
  'font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm';

export interface LegalTocEntry {
  id: string;
  title: string;
}

export interface LegalDocumentProps {
  title: string;
  eyebrow?: string;
  /** e.g. LAST_UPDATED. Rendered as "Last updated: ...". */
  lastUpdated?: string;
  /** One or two plain sentences under the title. */
  lede?: ReactNode;
  toc?: readonly LegalTocEntry[];
  children: ReactNode;
  className?: string;
}

export function LegalDocument({
  title,
  eyebrow,
  lastUpdated,
  lede,
  toc,
  children,
  className,
}: LegalDocumentProps) {
  return (
    <PublicPageShell>
      <article className={cn('mx-auto w-full max-w-3xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16', className)}>
        <header className="space-y-3">
          {eyebrow && (
            <p className="text-caption-sm font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
          )}
          <h1 className="text-balance font-display text-display-sm text-foreground">
            {title}
          </h1>
          {lastUpdated && <p className="text-body-sm text-muted-foreground">Last updated: {lastUpdated}</p>}
          {/* Reading measure: legal text is read line by line, so every
              paragraph is capped near 65ch (`max-w-prose`) even though the
              page column is wider for the index card. */}
          {lede && <div className="max-w-prose text-pretty text-body-md leading-relaxed text-foreground">{lede}</div>}
        </header>

        {toc && toc.length > 0 && (
          <nav aria-label="On this page" className="mt-8 rounded-xl border border-border bg-card p-5">
            <h2 className="text-label-lg text-foreground">On this page</h2>
            <ol className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {toc.map((entry) => (
                <li key={entry.id}>
                  <a href={`#${entry.id}`} className={LEGAL_LINK_CLASS}>
                    {entry.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mt-4">{children}</div>
      </article>
    </PublicPageShell>
  );
}

export function LegalSection({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={cn('scroll-mt-20 pt-10', className)}>
      <h2
        id={`${id}-heading`}
        className="max-w-prose font-display text-h2 text-foreground"
      >
        {title}
      </h2>
      {/* Prose children are capped at ~65ch; wide blocks (the Privacy data
          table) keep the full column and scroll inside their own frame. */}
      <div className="mt-4 space-y-4 text-body-md leading-relaxed text-foreground [&>h3]:max-w-prose [&>ol]:max-w-prose [&>p]:max-w-prose [&>ul]:max-w-prose">
        {children}
      </div>
    </section>
  );
}

export function LegalSubheading({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 font-display text-h3 text-foreground">{children}</h3>;
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6 marker:text-muted-foreground">{children}</ul>;
}

/** A route inside the app, styled as a legal-text link. */
export function LegalLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className={LEGAL_LINK_CLASS}>
      {children}
    </Link>
  );
}

/** An external page or a mailto: address. External pages open in a new tab. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  const isMail = href.startsWith('mailto:');
  return (
    <a
      href={href}
      className={LEGAL_LINK_CLASS}
      {...(isMail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
    >
      {children}
      {!isMail && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

/** A mailto link that shows the address itself. */
export function MailLink({ address }: { address: string }) {
  return <ExternalLink href={`mailto:${address}`}>{address}</ExternalLink>;
}

/** A summary callout, used for the notice at collection and plain-language recaps. */
export function LegalCallout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside
      aria-label={title}
      className="mt-8 max-w-prose rounded-xl border border-primary/30 bg-primary/5 p-5 text-body-md leading-relaxed text-foreground"
    >
      <p className="font-semibold text-foreground">{title}</p>
      <div className="mt-2 space-y-3">{children}</div>
    </aside>
  );
}
