import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Briefcase,
  ChevronRight,
  MapPin,
  RefreshCw,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { startHref } from './_shared';
import { IllustrativeTag, MOTION, useDemoInView } from './demos/_kit';

/**
 * HeroShortlist - the hero's centerpiece: a live "matching jobs" panel that
 * tells the product story visually. A white card with a ticking match count,
 * working filter chips, and a feed of sponsor-checked roles where a new match
 * slides in every few seconds.
 *
 * Alive, honestly:
 *   - rows stagger in on load; every ~4s a new match enters at the top, the
 *     count ticks up, and the oldest row exits. Pauses on hover/focus,
 *     off-screen, and under prefers-reduced-motion (static list).
 *   - "Visa sponsorship" and "Remote" genuinely filter the illustrative rows
 *     (derived, deterministic). "Location" / "Job type" are cosmetic buttons
 *     with press states only - no fake dropdowns.
 *   - every row links to the honest destination (start matching), with hover
 *     lift + indigo border + chevron nudge.
 *
 * Integrity: companies are fictional-but-plausible (letter monograms, no real
 * trademarks); counts, filings and salary bands are examples - the panel
 * carries the mono ILLUSTRATIVE tag. No invented users, ratings, or logos.
 */

// -- Illustrative data (labelled as such) ------------------------------------
type Job = {
  id: string;
  company: string;
  role: string;
  location: string;
  salary: string;
  sponsor: boolean;
  /** e.g. '214 filings FY2025' - factual-style, illustrative */
  filings: string | null;
  remote: boolean;
  /** chart-token text class for the monogram tile */
  markClass: string;
};

const JOBS: Job[] = [
  // Sponsors, remote (every filter combination keeps 5+ rows on screen)
  { id: 'nim', company: 'Nimbus Analytics', role: 'Senior Data Engineer', location: 'Remote (US)', salary: '$135K-$170K', sponsor: true, filings: '262 filings FY2025', remote: true, markClass: 'text-chart-4' },
  { id: 'bri', company: 'Brightpath Systems', role: 'Backend Engineer', location: 'Remote (US)', salary: '$120K-$155K', sponsor: true, filings: '118 filings FY2025', remote: true, markClass: 'text-chart-2' },
  { id: 'osp', company: 'Osprey Cloud', role: 'Platform Engineer', location: 'Remote (US)', salary: '$130K-$165K', sponsor: true, filings: '87 filings FY2025', remote: true, markClass: 'text-chart-5' },
  { id: 'qui', company: 'Quillstack', role: 'Full Stack Engineer', location: 'Remote (US)', salary: '$115K-$150K', sponsor: true, filings: '44 filings FY2025', remote: true, markClass: 'text-chart-8' },
  { id: 'van', company: 'Vantora Labs', role: 'ML Engineer', location: 'Remote (US)', salary: '$145K-$185K', sponsor: true, filings: '173 filings FY2025', remote: true, markClass: 'text-chart-1' },
  // Sponsors, on-site
  { id: 'hel', company: 'Helios Grid', role: 'Software Engineer', location: 'Austin, TX', salary: '$125K-$160K', sponsor: true, filings: '96 filings FY2025', remote: false, markClass: 'text-chart-3' },
  { id: 'mer', company: 'Meridian Biotech', role: 'Data Scientist', location: 'Boston, MA', salary: '$128K-$162K', sponsor: true, filings: '141 filings FY2025', remote: false, markClass: 'text-chart-6' },
  { id: 'arb', company: 'Arbor Robotics', role: 'Robotics Engineer', location: 'Pittsburgh, PA', salary: '$122K-$158K', sponsor: true, filings: '63 filings FY2025', remote: false, markClass: 'text-chart-7' },
  { id: 'blu', company: 'Bluepine Software', role: 'Frontend Engineer', location: 'Seattle, WA', salary: '$118K-$152K', sponsor: true, filings: '205 filings FY2025', remote: false, markClass: 'text-chart-2' },
  // No sponsor record - these appear when "Visa sponsorship" is toggled off,
  // showing WHY the filter matters.
  { id: 'fer', company: 'Fernline Health', role: 'Product Engineer', location: 'Denver, CO', salary: '$110K-$140K', sponsor: false, filings: null, remote: false, markClass: 'text-chart-5' },
  { id: 'sun', company: 'Suncrest Media', role: 'QA Engineer', location: 'Chicago, IL', salary: '$95K-$120K', sponsor: false, filings: null, remote: false, markClass: 'text-chart-3' },
  { id: 'tra', company: 'Trailway Logistics', role: 'Systems Engineer', location: 'Remote (US)', salary: '$105K-$135K', sponsor: false, filings: null, remote: true, markClass: 'text-chart-4' },
];

const ROTATE_MS = 4000;
const VISIBLE_ROWS = 5;

/** Deterministic illustrative totals per filter combination. */
function baseCount(sponsorOnly: boolean, remoteOnly: boolean): number {
  if (sponsorOnly) return remoteOnly ? 316 : 1248;
  return remoteOnly ? 1437 : 5731;
}

// -- Company monogram (fictional brand, no logo assets) ----------------------
function Monogram({ job }: { job: Job }) {
  return (
    <span
      aria-hidden
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/50"
    >
      <span className={cn('font-display text-base font-bold leading-none', job.markClass)}>
        {job.company.slice(0, 1)}
      </span>
    </span>
  );
}

// -- Sponsor badge with factual-style (illustrative) filings info ------------
function SponsorBadge({ job }: { job: Job }) {
  if (!job.sponsor) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
        No filings found
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
      <BadgeCheck className="h-3 w-3" aria-hidden />
      H1B Sponsor
      {job.filings && <span className="hidden font-medium min-[520px]:inline">&middot; {job.filings}</span>}
    </span>
  );
}

// -- One job row: the whole row is the honest CTA ----------------------------
function JobRow({ job }: { job: Job }) {
  return (
    <Link
      to={startHref()}
      aria-label="Start matching to see roles like this"
      className={cn(
        'group flex min-h-[64px] items-center gap-3 rounded-xl border border-transparent bg-card px-3 py-3',
        'transition-[transform,border-color,background-color,box-shadow] duration-200',
        'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-panel',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
      )}
    >
      <Monogram job={job} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate font-display text-sm font-bold text-foreground">{job.role}</span>
          <SponsorBadge job={job} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-medium">{job.company}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            {job.location}
          </span>
          <span className="font-medium tabular-nums text-foreground/80 transition-colors duration-200 group-hover:text-primary">
            {job.salary}
          </span>
        </div>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-[transform,color] duration-200 group-hover:translate-x-1 group-hover:text-primary"
        aria-hidden
      />
    </Link>
  );
}

// -- Filter chips ------------------------------------------------------------
function FilterChip({
  label,
  icon: Icon,
  pressed,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  /** present only on the working toggle chips */
  pressed?: boolean;
  onClick?: () => void;
}) {
  const toggle = typeof onClick === 'function';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={toggle ? pressed : undefined}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[13px] font-medium',
        'transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
        pressed ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:bg-muted/60',
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', pressed ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
      {label}
      {/* constant-width state dot on toggle chips - a second, non-colour cue
          that never shifts layout */}
      {toggle && (
        <span
          aria-hidden
          className={cn('h-1.5 w-1.5 rounded-full transition-colors duration-150', pressed ? 'bg-primary' : 'bg-input')}
        />
      )}
    </button>
  );
}

function RemoteToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-2 text-[13px] font-medium text-foreground',
        'transition-transform duration-150 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
      )}
    >
      Remote
      <span
        aria-hidden
        className={cn(
          'flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-200',
          on ? 'bg-primary' : 'bg-input',
        )}
      >
        <span
          className={cn('h-4 w-4 rounded-full bg-card shadow-soft transition-transform duration-200', on && 'translate-x-4')}
        />
      </span>
    </button>
  );
}

// -- The panel ---------------------------------------------------------------
export function HeroShortlist({ className }: { className?: string }) {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  const [sponsorOnly, setSponsorOnly] = useState(true);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  // First-mount flag: rows stagger on load, then later entrances are instant.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  // The live feed rotation: a new match enters at the top each tick. Paused on
  // hover/focus, off-screen, and (entirely) under prefers-reduced-motion.
  useEffect(() => {
    if (reduce || !active || paused) return;
    const id = window.setInterval(() => setTick((t) => t + 1), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reduce, active, paused]);

  const filtered = useMemo(
    () => JOBS.filter((j) => (!sponsorOnly || j.sponsor) && (!remoteOnly || j.remote)),
    [sponsorOnly, remoteOnly],
  );

  // Rotating window over the filtered set - each tick shifts the start back
  // one, so the "new" job slides in at the top and the oldest exits.
  const visible = useMemo(() => {
    const len = filtered.length;
    const count = Math.min(VISIBLE_ROWS, len);
    const start = (((-tick) % len) + len) % len;
    return Array.from({ length: count }, (_, i) => filtered[(start + i) % len]);
  }, [filtered, tick]);

  const count = baseCount(sponsorOnly, remoteOnly) + tick;

  return (
    <div
      ref={ref}
      className={cn('w-full', className)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-pop">
        {/* Header: the ticking match count + freshness hint */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-border px-4 py-3.5">
          <span className="flex items-center gap-2">
            <span className="font-display text-sm font-bold text-foreground">
              {reduce ? (
                <span className="tabular-nums">{count.toLocaleString('en-US')}</span>
              ) : (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={count}
                    className="inline-block tabular-nums"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: MOTION.micro, ease: MOTION.ease }}
                  >
                    {count.toLocaleString('en-US')}
                  </motion.span>
                </AnimatePresence>
              )}{' '}
              <span className="font-semibold text-muted-foreground">matching jobs</span>
            </span>
            <IllustrativeTag />
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <motion.span
              key={tick}
              className="grid place-items-center"
              initial={{ rotate: 0 }}
              animate={{ rotate: reduce ? 0 : 360 }}
              transition={{ duration: reduce ? 0 : 0.9, ease: MOTION.ease }}
            >
              <RefreshCw className="h-3 w-3" aria-hidden />
            </motion.span>
            Jobs updated 2h ago
          </span>
        </div>

        {/* Filter row: two working toggles, two cosmetic chips (no fake menus),
            horizontally scrollable on small screens */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-muted/40 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip
            label="Visa sponsorship"
            icon={ShieldCheck}
            pressed={sponsorOnly}
            onClick={() => setSponsorOnly((v) => !v)}
          />
          <FilterChip label="Location" icon={MapPin} />
          <FilterChip label="Job type" icon={Briefcase} />
          <span className="ms-auto ps-1">
            <RemoteToggle on={remoteOnly} onToggle={() => setRemoteOnly((v) => !v)} />
          </span>
        </div>

        {/* The feed: each row is a real link to start matching */}
        <ul aria-label="Illustrative matching jobs" className="space-y-1 px-2 pb-2 pt-2">
          {reduce ? (
            visible.map((job) => (
              <li key={job.id}>
                <JobRow job={job} />
              </li>
            ))
          ) : (
            <AnimatePresence mode="popLayout">
              {visible.map((job, i) => (
                <motion.li
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: -18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 14 }}
                  transition={{
                    duration: MOTION.settle,
                    ease: MOTION.ease,
                    delay: mounted.current ? 0 : 0.2 + i * 0.08,
                  }}
                >
                  <JobRow job={job} />
                </motion.li>
              ))}
            </AnimatePresence>
          )}
        </ul>
      </div>
    </div>
  );
}

export default HeroShortlist;
