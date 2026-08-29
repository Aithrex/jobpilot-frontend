/**
 * A collapsible run of rows with a counted header. Used for the Focus queue's
 * reasons, and again for the day buckets inside a busy stage.
 *
 * Open state is local; a parent that needs it reset (because the grouping
 * changed underneath) should remount with a different `key` rather than
 * threading state down.
 */
import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface TrackerSectionProps {
  label: string;
  count: number;
  /** Status colour, on the header dot only. Rows never paint their stage. */
  dot?: string | null;
  /** A short qualifier after the count, e.g. "2 going quiet". */
  meta?: ReactNode;
  defaultOpen?: boolean;
  emptyText?: string;
  children: ReactNode;
}

export default function TrackerSection({
  label,
  count,
  dot,
  meta,
  defaultOpen = true,
  emptyText = 'Nothing here yet',
  children,
}: TrackerSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <ChevronRight
            aria-hidden
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-expo',
              open && 'rotate-90',
            )}
          />
          {dot && <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot)} />}
          <span className="overline truncate">{label}</span>
          <span className="text-label tabular-nums text-muted-foreground">{count}</span>
          {meta && <span className="truncate text-label text-muted-foreground">· {meta}</span>}
        </button>
      </h3>

      {open &&
        (count > 0 ? (
          children
        ) : (
          <p className="px-3 pb-3 pl-8 text-label text-muted-foreground/70">{emptyText}</p>
        ))}
    </section>
  );
}
