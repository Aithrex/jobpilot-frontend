import { useState } from 'react';
import { companyLogoSrc } from '@/lib/api';
import { hueFromString } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CompanyLogoProps {
  /** Monogram seed + fallback letter. Callers pass the same seed they hue
   *  the rest of the card with (e.g. `job.company || job.title`). */
  company: string;
  /** Backend-relative logo path ("/api/jobs/logo/<hash>") — may 404. */
  logoUrl?: string | null;
  /** Square edge in px. Fixed on the container so a 404 never shifts layout. */
  size?: number;
  className?: string;
}

/**
 * Company mark: real favicon served by the backend when `logoUrl` resolves,
 * otherwise the deterministic hued letter-monogram (the same visual JobCard
 * and the Kanban tiles have always used — the per-company hue is a sanctioned
 * design-token exception). Decorative only: the company NAME is always
 * adjacent text, so the mark is `alt=""` + `aria-hidden`. Logos are public —
 * plain <img>, no auth headers.
 */
export function CompanyLogo({ company, logoUrl, size = 32, className }: CompanyLogoProps) {
  const [errored, setErrored] = useState(false);
  const src = companyLogoSrc(logoUrl);
  const rounded = size >= 40 ? 'rounded-xl' : size >= 28 ? 'rounded-lg' : 'rounded-md';
  const box = { width: size, height: size };

  if (src && !errored) {
    return (
      <div
        className={cn('flex-shrink-0 overflow-hidden border border-border bg-card', rounded, className)}
        style={box}
        aria-hidden
      >
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          className="h-full w-full object-contain"
          style={{ padding: Math.max(2, Math.round(size / 12)) }}
        />
      </div>
    );
  }

  const hue = hueFromString(company || '?');
  return (
    <div
      className={cn('grid flex-shrink-0 place-items-center font-bold', rounded, className)}
      style={{
        ...box,
        fontSize: Math.round(size * 0.375),
        backgroundColor: `hsl(${hue} 68% 55% / 0.14)`,
        color: `hsl(${hue} 60% 52%)`,
        boxShadow: `inset 0 0 0 1px hsl(${hue} 68% 55% / 0.28)`,
      }}
      aria-hidden
    >
      {(company || '?').charAt(0).toUpperCase()}
    </div>
  );
}
