/**
 * How the search is going, as a picture first and numbers second.
 *
 * Owner, 2026-11-16: the tracker should be "easy to understand by default,
 * more analytic, more insightful, more delightful". The old strip was four
 * text tiles. This one shows:
 *
 *   - the week: a ring that fills toward a weekly goal (Simplify and Huntr
 *     both use one), with a streak of weeks with at least one application
 *     (weeks, not days: a missed day should never feel like failing);
 *   - the journey: Applied, Heard back, Interview, Offer as a funnel whose
 *     bars are the counts, with the share that made each step between them;
 *   - the wait: how many are waiting and how long a reply usually takes.
 *
 * Every part is a button that opens the rows behind it.
 */
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock3, Flame, MailOpen, PartyPopper, Send, Target, Users } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCountUp } from '@/hooks/useCountUp';
import { EASE_DECELERATE } from '@/lib/motion';
import { cn } from '@/lib/utils';

import { percent, type TrackerInsights } from './trackerInsights';

export type JourneyTarget = 'recent' | 'insights' | 'interviewing' | 'waiting' | 'applied' | 'replied' | 'offer';

const GOAL_KEY = 'tracker_weekly_goal_v1';
const GOALS = [3, 5, 10, 15, 20, 25];

function readGoal(): number {
  try {
    const n = Number(window.localStorage.getItem(GOAL_KEY));
    return GOALS.includes(n) ? n : 10;
  } catch {
    return 10;
  }
}

/** Weeks in a row with at least one application, counting back from this
 *  week (or last week, while this one is still empty). */
export function weekStreak(weeks: { count: number }[]): number {
  const counts = weeks.map((w) => w.count);
  let i = counts.length - 1;
  if (i >= 0 && counts[i] === 0) i -= 1;
  let streak = 0;
  for (; i >= 0 && counts[i] > 0; i -= 1) streak += 1;
  return streak;
}

function GoalRing({ sent, goal }: { sent: number; goal: number }) {
  const reduce = useReducedMotion();
  const size = 64;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const share = Math.min(1, goal ? sent / goal : 0);
  const done = sent >= goal;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? 'hsl(var(--signal))' : 'hsl(var(--primary))'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - share * c }}
          transition={{ duration: reduce ? 0 : 0.9, ease: EASE_DECELERATE }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        {done ? (
          <PartyPopper className="h-5 w-5 text-signal" />
        ) : (
          <Send className="h-4 w-4 text-primary" />
        )}
      </span>
    </span>
  );
}

function Count({ value }: { value: number }) {
  const shown = useCountUp(value, 800);
  return <>{shown}</>;
}

interface Step {
  key: JourneyTarget;
  label: string;
  value: number;
  icon: typeof Send;
  tone: string;
  hint: string;
}

export default function JourneyStrip({
  insights,
  onOpen,
}: {
  insights: TrackerInsights;
  onOpen: (target: JourneyTarget) => void;
}) {
  const reduce = useReducedMotion();
  const [goal, setGoal] = useState<number>(readGoal);
  useEffect(() => {
    try {
      window.localStorage.setItem(GOAL_KEY, String(goal));
    } catch {
      /* a goal that is not remembered is still shown */
    }
  }, [goal]);

  const sent = insights.last7;
  const streak = weekStreak(insights.weeks);
  const steps: Step[] = [
    { key: 'applied', label: 'Applied', value: insights.applied, icon: Send, tone: 'bg-primary', hint: 'Show every application you sent' },
    { key: 'replied', label: 'Heard back', value: insights.replied, icon: MailOpen, tone: 'bg-info', hint: 'Show the ones that answered' },
    { key: 'interviewing', label: 'Interview', value: insights.interviewed, icon: Users, tone: 'bg-signal', hint: 'Show the ones that reached an interview' },
    { key: 'offer', label: 'Offer', value: insights.offers, icon: PartyPopper, tone: 'bg-success', hint: 'Show your offers' },
  ];
  const top = Math.max(1, steps[0].value);

  return (
    <section aria-label="How your search is going" className="grid gap-px bg-border lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)_minmax(0,13.5rem)]">
      {/* This week, toward a goal. */}
      <div className="flex items-center gap-3 bg-card px-4 py-3.5">
        <button
          type="button"
          onClick={() => onOpen('recent')}
          className="press flex items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Show the applications from the last 7 days"
        >
          <GoalRing sent={sent} goal={goal} />
          <span className="min-w-0">
            <span className="block font-display text-2xl font-semibold leading-none text-foreground">
              <Count value={sent} />
              <span className="text-body-sm font-medium text-muted-foreground"> / {goal}</span>
            </span>
            <span className="mt-1 block whitespace-nowrap text-caption text-muted-foreground">sent this week</span>
          </span>
        </button>
        <div className="ml-auto flex flex-col items-end gap-1.5">
          {streak >= 2 && (
            <span
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-warning/10 px-2 py-0.5 text-caption-sm font-semibold text-warning"
              title={`${streak} weeks in a row with at least one application`}
            >
              <Flame className="h-3 w-3" aria-hidden />
              {streak}-week streak
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-caption-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Change your weekly goal"
            >
              <Target className="h-3 w-3" aria-hidden />
              Goal
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Applications a week</DropdownMenuLabel>
              {GOALS.map((g) => (
                <DropdownMenuItem key={g} onSelect={() => setGoal(g)} className={cn(g === goal && 'font-semibold text-primary')}>
                  {g} a week
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* The journey: each step's bar is its count; under it, the share of
          the step before that made it here. Two by two on a phone. */}
      <div className="bg-card px-3 py-3 sm:px-4 sm:py-3.5">
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-stretch sm:gap-2">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const width = Math.max(step.value ? 8 : 0, Math.round((step.value / top) * 100));
            const prev = i > 0 ? steps[i - 1] : null;
            const share = prev ? percent(step.value, prev.value) : null;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => onOpen(step.key)}
                title={step.hint}
                className="press group min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{step.label}</span>
                </span>
                <span className="mt-1 block font-display text-2xl font-semibold leading-none tabular-nums text-foreground">
                  <Count value={step.value} />
                </span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.span
                    className={cn('block h-full rounded-full', step.tone)}
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.08 * i, ease: EASE_DECELERATE }}
                  />
                </span>
                <span className="mt-1 block truncate text-caption-sm text-muted-foreground">
                  {prev ? `${share ?? 0}% of ${prev.label.toLowerCase()}` : 'sent in all'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The wait. */}
      <button
        type="button"
        onClick={() => onOpen('waiting')}
        title="Show the applications nobody has answered yet"
        className="press flex items-center gap-3 bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground" aria-hidden>
          <Clock3 className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-2xl font-semibold leading-none text-foreground">
            <Count value={insights.waiting} />
          </span>
          <span className="mt-1 block text-caption text-muted-foreground">
            waiting
            {insights.medianReplyDays != null
              ? ` · usual reply: ${insights.medianReplyDays} ${insights.medianReplyDays === 1 ? 'day' : 'days'}`
              : ''}
          </span>
        </span>
      </button>
    </section>
  );
}
