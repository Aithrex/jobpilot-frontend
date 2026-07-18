import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, CheckCircle2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DemoStage,
  IllustrativeTag,
  MOTION,
  Panel,
  StepIn,
  useDemoInView,
  useDemoLoop,
} from './_kit';

/**
 * Track — chapter 05 of the journey. One evidence panel, three proofs:
 *   1. a mini pipeline board (Applied / Interview / Offer) where cards slide
 *      right as status changes (shared-layout transitions);
 *   2. a Gmail row: an interview invite arrives and auto-files its card from
 *      Applied to Interview;
 *   3. an OPT clock chip ticking down and crossing an amber alert threshold
 *      (never color-only: border + icon + "Under 90" text).
 *
 * Deterministic ~8s loop via useDemoLoop (in-view gated), paused on mouse
 * hover; under reduced motion it rests on the fully composed end state.
 * Fixed-height stage, token-driven, labels kept to 1-3 words.
 */

type CardId = 'meridian' | 'coreline' | 'statwerk';
type Card = { id: CardId; company: string; role: string };

const CARDS: Record<CardId, Card> = {
  meridian: { id: 'meridian', company: 'Meridian Labs', role: 'Backend Eng' },
  coreline: { id: 'coreline', company: 'Coreline', role: 'Data Analyst' },
  statwerk: { id: 'statwerk', company: 'Statwerk', role: 'Platform Eng' },
};

/**
 * Column composition per loop step — fully deterministic.
 *   step 0: quiet board       step 1: invite arrives
 *   step 2: Meridian auto-files to Interview
 *   step 3: Statwerk advances to Offer (the rest frame)
 */
function columnsAt(step: number): { title: string; cards: Card[] }[] {
  const filed = step >= 2;
  const offered = step >= 3;
  return [
    { title: 'Applied', cards: filed ? [CARDS.coreline] : [CARDS.meridian, CARDS.coreline] },
    {
      title: 'Interview',
      cards: [...(offered ? [] : [CARDS.statwerk]), ...(filed ? [CARDS.meridian] : [])],
    },
    { title: 'Offer', cards: offered ? [CARDS.statwerk] : [] },
  ];
}

/** OPT days per step — ticks down and crosses the amber threshold (<90). */
const DAYS = [92, 91, 90, 89] as const;
/** ~8.2s total cycle. */
const DURATIONS = [2000, 2400, 2400, 1400];

function BoardCard({
  card,
  highlight,
  reduce,
}: {
  card: Card;
  highlight?: 'primary' | 'success';
  reduce: boolean;
}) {
  return (
    <motion.div
      layoutId={card.id}
      transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease }}
      className={cn(
        'rounded-control border bg-card px-2 py-1.5 shadow-soft',
        highlight === 'primary' && 'border-primary/50 bg-primary/[0.05]',
        highlight === 'success' && 'border-success/40 bg-success/[0.05]',
        !highlight && 'border-border',
      )}
    >
      <p className="truncate text-[11px] font-semibold leading-tight text-foreground">{card.company}</p>
      <p className="truncate text-[10px] leading-tight text-muted-foreground">{card.role}</p>
    </motion.div>
  );
}

export function TrackDemo() {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  const [hovered, setHovered] = useState(false);
  const { step } = useDemoLoop(4, {
    active: active && !hovered,
    reduce,
    durations: DURATIONS,
    restAt: 3,
  });

  const cols = columnsAt(step);
  const days = DAYS[step];
  const alert = days < 90;

  const onEnter = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setHovered(true);
  };
  const onLeave = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setHovered(false);
  };

  const label =
    `A mini pipeline board with Applied, Interview and Offer columns. ` +
    (step >= 1
      ? `A Gmail interview invite for Thursday arrived${step >= 2 ? ' and auto-filed the Meridian Labs card into Interview' : ''}. `
      : `The inbox is synced. `) +
    (step >= 3 ? `Statwerk advanced to Offer. ` : '') +
    `The OPT clock shows ${days} days left${alert ? ', under the 90 day alert threshold' : ''}. Illustrative.`;

  return (
    <div ref={ref} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <DemoStage label={label} reserve={356} className="p-4">
        <div className="flex h-full flex-col">
          {/* The Gmail row — replies land here and file themselves */}
          <Panel className="flex min-h-[52px] items-center gap-2.5 px-3 py-2">
            <span
              aria-hidden
              className="grid h-8 w-8 shrink-0 place-items-center rounded-control border border-border bg-muted/60"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              {step >= 1 ? (
                <StepIn show reduce={reduce} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-caption font-semibold text-foreground">Interview invite</span>
                  <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    Thu 2:00 PM
                  </span>
                  {step >= 2 && (
                    <StepIn show reduce={reduce} className="inline-flex">
                      <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/[0.08] px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        <CheckCircle2 className="h-3 w-3 text-success" aria-hidden />
                        Auto-filed
                      </span>
                    </StepIn>
                  )}
                </StepIn>
              ) : (
                <span className="text-caption text-muted-foreground">Inbox synced</span>
              )}
            </div>
            <span className="hidden shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
              Gmail
            </span>
          </Panel>

          {/* The mini pipeline board */}
          <div className="mt-3 grid min-h-0 flex-1 grid-cols-3 gap-2">
            {cols.map((col) => (
              <div key={col.title} className="flex min-w-0 flex-col rounded-control border border-border bg-muted/30 p-1.5">
                <div className="flex items-center justify-between px-1 pb-1.5 pt-0.5">
                  <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {col.title}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{col.cards.length}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {col.cards.map((card) => (
                    <BoardCard
                      key={card.id}
                      card={card}
                      reduce={reduce}
                      highlight={
                        card.id === 'meridian' && step >= 2
                          ? 'primary'
                          : card.id === 'statwerk' && step >= 3
                            ? 'success'
                            : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* The OPT clock — amber alert under 90 days (border + icon + text) */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <span
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors',
                alert ? 'border-warning/50 bg-warning/10' : 'border-border bg-muted/40',
              )}
            >
              <CalendarClock className={cn('h-3.5 w-3.5', alert ? 'text-warning' : 'text-muted-foreground')} aria-hidden />
              <span className={cn('font-medium', alert ? 'text-foreground' : 'text-muted-foreground')}>OPT clock</span>
              <span className="font-display font-bold tabular-nums text-foreground">{days} days</span>
              {alert && <span className="font-semibold text-foreground">Under 90</span>}
            </span>
            <IllustrativeTag />
          </div>
        </div>
      </DemoStage>
    </div>
  );
}

export default TrackDemo;
