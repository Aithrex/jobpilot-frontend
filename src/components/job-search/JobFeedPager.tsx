import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Job-feed pagination.
 *
 * Prev/Next match the page-number chips (same height, radius, hover) instead
 * of sitting as wider outline buttons that made the row look like two
 * components glued together.
 *
 * "Page X of Y" sits BELOW the controls, centered, as status — not beside
 * Next. Numbered chips already show the current page; the caption is the
 * total. Putting it inline made a third visual weight in the control row
 * (NN: group related actions; keep status out of the control cluster).
 */

function pageWindow(page: number, count: number): number[] {
  const span = Math.min(5, count);
  let start = Math.max(1, page - 2);
  const end = Math.min(count, start + span - 1);
  start = Math.max(1, end - span + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const CHIP =
  'inline-flex h-8 items-center justify-center rounded-md text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40';

const CHIP_IDLE =
  'border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary';

export function JobFeedPager({
  page,
  pageCount,
  onPageChange,
  labelledBy,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  labelledBy?: string;
}) {
  if (pageCount <= 1) return null;

  const window = pageWindow(page, pageCount);
  const showLeading = window[0] > 1;
  const showTrailing = window[window.length - 1] < pageCount;

  return (
    <nav className="flex flex-col items-center gap-2 pt-3" aria-label={labelledBy ?? 'Job results pages'}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className={cn(CHIP, CHIP_IDLE, 'gap-0.5 px-2.5')}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Prev
        </button>

        {showLeading && (
          <span className="grid h-8 w-6 place-items-center text-xs text-muted-foreground" aria-hidden>
            ...
          </span>
        )}

        {window.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPageChange(n)}
            aria-label={`Page ${n}`}
            aria-current={n === page ? 'page' : undefined}
            className={cn(
              CHIP,
              'min-w-8 px-2',
              n === page
                ? 'bg-primary text-primary-foreground shadow-soft'
                : CHIP_IDLE,
            )}
          >
            {n}
          </button>
        ))}

        {showTrailing && (
          <span className="grid h-8 w-6 place-items-center text-xs text-muted-foreground" aria-hidden>
            ...
          </span>
        )}

        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className={cn(CHIP, CHIP_IDLE, 'gap-0.5 px-2.5')}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <p className="text-[11px] tabular-nums text-muted-foreground" aria-live="polite">
        Page {page} of {pageCount}
      </p>
    </nav>
  );
}
