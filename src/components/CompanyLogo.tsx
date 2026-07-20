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
 *
 * Loading contract: the monogram renders FIRST and the favicon fades in over
 * it only after a successful load. The backend stamps `logo_url` for every
 * company but 404s when no icon could be fetched (and the inline fetch can
 * take seconds), so painting the bordered image box optimistically left an
 * empty square for the whole wait. Tiny tracking-pixel responses (≤2px) are
 * treated as misses too. The image pad is a hairline (not size/12) so small
 * favicons no longer float in a visible gap inside the border.
 */
export function CompanyLogo({ company, logoUrl, size = 32, className }: CompanyLogoProps) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = companyLogoSrc(logoUrl);
  const rounded = size >= 40 ? 'rounded-xl' : size >= 28 ? 'rounded-lg' : 'rounded-md';
  const box = { width: size, height: size };
  const showImage = !!src && !errored;

  const hue = hueFromString(company || '?');
  return (
    <div
      className={cn(
        'relative grid flex-shrink-0 place-items-center overflow-hidden font-bold',
        rounded,
        className,
      )}
      style={{
        ...box,
        fontSize: Math.round(size * 0.375),
        backgroundColor: `hsl(${hue} 68% 55% / 0.14)`,
        color: `hsl(${hue} 60% 52%)`,
        boxShadow:
          showImage && loaded
            ? 'inset 0 0 0 1px hsl(var(--border))'
            : `inset 0 0 0 1px hsl(${hue} 68% 55% / 0.28)`,
      }}
      aria-hidden
    >
      {(company || '?').charAt(0).toUpperCase()}
      {showImage && (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onLoad={(e) => {
            const img = e.currentTarget;
            // A "successful" 1x1/2x2 response is a placeholder, not a logo.
            if (img.naturalWidth <= 2 || img.naturalHeight <= 2) setErrored(true);
            else setLoaded(true);
          }}
          onError={() => setErrored(true)}
          className={cn(
            'absolute inset-0 h-full w-full bg-card object-contain transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          style={{ padding: size >= 40 ? 3 : 2 }}
        />
      )}
    </div>
  );
}
