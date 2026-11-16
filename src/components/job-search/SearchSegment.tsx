/**
 * One labelled answer in the Jobs search bar: the question on top, the current
 * answer under it, and a popover editor for just that answer.
 *
 * Its own file because the level and company pickers render as segments too,
 * and the bar imports them.
 */
import { forwardRef, useCallback, useState, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * A popover with an opaque surface.
 *
 * The shared `PopoverContent` is frosted glass, which suits a short menu. A
 * filter editor is a small form with several lines of explanation, opened on
 * top of a dense grid of cards, and the cards showed through the text. This
 * is the same popover on a solid surface (`.job-search-pop`).
 */
export const SolidPopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 8, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'job-search-pop z-50 origin-[--radix-popover-content-transform-origin] overscroll-contain rounded-2xl border border-border p-4 text-popover-foreground outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
SolidPopoverContent.displayName = 'SolidPopoverContent';

export interface SearchSegmentProps {
  icon: LucideIcon;
  /** The question, in a word or two ("Roles", "Visa"). */
  label: string;
  /** The current answer. */
  value: ReactNode;
  /** A short note beside the answer that never truncates ("Your level"). */
  tag?: string;
  /** Full sentence for assistive tech ("Experience level: Entry + Mid"). */
  ariaLabel: string;
  /** The answer differs from the default, so the value is tinted. */
  changed?: boolean;
  /** Something here still needs the user (titles changed, not searched). */
  attention?: boolean;
  /** Relative width. Roles carries the longest value. */
  grow?: 1 | 2;
  align?: 'start' | 'center' | 'end';
  contentClassName?: string;
  onOpenChange?: (open: boolean) => void;
  testId?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
}

/** A labelled answer that opens its own editor. Exported so the level and
 *  company pickers render as segments wherever they are mounted. */
export function SearchSegment({
  icon: Icon,
  label,
  value,
  tag,
  ariaLabel,
  changed = false,
  attention = false,
  grow = 1,
  align = 'start',
  contentClassName,
  onOpenChange,
  testId,
  children,
}: SearchSegmentProps) {
  const [open, setOpen] = useState(false);
  const change = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const close = useCallback(() => change(false), [change]);

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          data-testid={testId}
          className={cn(
            'job-search-segment group relative flex min-w-0 items-center gap-2.5 px-3.5 py-2 text-left',
            grow === 2 ? 'flex-[1.5_1_0%]' : 'flex-[1_1_0%]',
            open && 'is-open',
          )}
        >
          <span
            className={cn(
              'hidden h-8 w-8 shrink-0 place-items-center rounded-lg xl:grid',
              changed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
            aria-hidden
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[11px] font-medium leading-4 text-muted-foreground">
              {label}
              {attention && (
                <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
              )}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  'min-w-0 truncate text-sm font-semibold leading-5',
                  changed ? 'text-primary' : 'text-foreground',
                )}
              >
                {value}
              </span>
              {tag && (
                <span className="hidden shrink-0 rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold leading-4 text-primary 2xl:inline">
                  {tag}
                </span>
              )}
            </span>
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-base ease-standard motion-reduce:transition-none',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <SolidPopoverContent
        align={align}
        sideOffset={10}
        collisionPadding={16}
        className={cn('w-[min(23rem,calc(100vw-2rem))] overflow-y-auto', contentClassName)}
        style={{ maxHeight: 'var(--radix-popover-content-available-height, 80vh)' }}
      >
        {typeof children === 'function' ? children(close) : children}
      </SolidPopoverContent>
    </Popover>
  );
}
