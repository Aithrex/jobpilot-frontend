import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { indicatorSpring } from '@/lib/motion';

/** Outer capsule - quiet track; the moving inner pill is the glass surface. */
export const PILL_TRACK_CLASS =
  'relative inline-flex max-w-full items-stretch overflow-x-auto overscroll-x-contain scrollbar-hide snap-x snap-mandatory rounded-full border border-border/50 bg-muted/45 p-1 backdrop-blur-md';

const SIZE: Record<'sm' | 'md', string> = {
  sm: 'min-h-9 px-3 text-[11px] font-semibold',
  md: 'min-h-10 px-3.5 text-sm font-medium',
};

/**
 * Scroll the active item to the center of its overflow track - Instagram-style
 * horizontal tab switching - without scrolling the page.
 */
export function scrollPillIntoView(
  track: HTMLElement | null,
  item: HTMLElement | null,
  smooth: boolean,
) {
  if (!track || !item) return;
  const t = track.getBoundingClientRect();
  const c = item.getBoundingClientRect();
  const delta = (c.left + c.right) / 2 - (t.left + t.right) / 2;
  if (Math.abs(delta) < 1) return;
  track.scrollBy({ left: delta, behavior: smooth ? 'smooth' : 'auto' });
}

export function useScrollActivePill(activeKey: string) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const item =
      track.querySelector<HTMLElement>('[data-pill-active="true"]') ??
      track.querySelector<HTMLElement>('[aria-current="page"]');
    scrollPillIntoView(track, item, !reduceMotion);
  }, [activeKey, reduceMotion]);

  return trackRef;
}

/** Sliding inner pill that lives behind the selected item. */
export function PillThumb({ layoutId }: { layoutId: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      layoutId={layoutId}
      className="liquid-glass liquid-glass-thumb absolute inset-0 z-0 overflow-hidden rounded-full"
      transition={indicatorSpring(reduceMotion)}
      aria-hidden="true"
    />
  );
}

export function PillTrack({
  children,
  className,
  trackRef,
  role = 'group',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  trackRef?: Ref<HTMLDivElement>;
  role?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div ref={trackRef} role={role} className={cn(PILL_TRACK_CLASS, className)} {...rest}>
      {children}
    </div>
  );
}

export function pillItemClass(active: boolean, size: 'sm' | 'md' = 'md') {
  return cn(
    'interactive relative z-[1] flex shrink-0 snap-center items-center justify-center gap-1.5 whitespace-nowrap rounded-full outline-none transition-colors duration-200',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    SIZE[size],
    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
  );
}

export interface PillOption<T extends string = string> {
  value: T;
  label: ReactNode;
  title?: string;
  disabled?: boolean;
}

/**
 * Exclusive segmented control: outer capsule + sliding inner pill, with
 * horizontal overflow scroll when the options don't fit.
 */
export function PillSwitch<T extends string>({
  value,
  onValueChange,
  options,
  'aria-label': ariaLabel,
  size = 'sm',
  className,
  layoutId,
  fill = false,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly PillOption<T>[];
  'aria-label': string;
  size?: 'sm' | 'md';
  className?: string;
  layoutId?: string;
  /** Stretch the track and items to fill the parent (drawer / full-width rows). */
  fill?: boolean;
}) {
  const autoId = useId();
  const thumbId = layoutId ?? `pill-switch-${autoId}`;
  const trackRef = useScrollActivePill(value);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
      const enabled = options.filter((o) => !o.disabled);
      if (enabled.length === 0) return;
      const idx = enabled.findIndex((o) => o.value === value);
      let next = idx;
      if (key === 'ArrowRight') next = idx < 0 ? 0 : (idx + 1) % enabled.length;
      else if (key === 'ArrowLeft') next = idx <= 0 ? enabled.length - 1 : idx - 1;
      else if (key === 'Home') next = 0;
      else if (key === 'End') next = enabled.length - 1;
      event.preventDefault();
      onValueChange(enabled[next].value);
    },
    [onValueChange, options, value],
  );

  return (
    <PillTrack
      trackRef={trackRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(fill && 'w-full', className)}
      onKeyDown={onKeyDown}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-pill-active={active ? 'true' : undefined}
            title={opt.title}
            disabled={opt.disabled}
            onClick={() => onValueChange(opt.value)}
            className={cn(pillItemClass(active, size), fill && 'flex-1')}
          >
            {active && <PillThumb layoutId={thumbId} />}
            <span className="relative z-10 inline-flex items-center gap-1">{opt.label}</span>
          </button>
        );
      })}
    </PillTrack>
  );
}
