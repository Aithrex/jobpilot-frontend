import { useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import {
  BookOpen,
  KanbanSquare,
  MessagesSquare,
  Radar,
  Route,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, EASE } from './_shared';

/**
 * Second movement: the career operating system as a live orbital scene — the
 * profile is the central node, six workspace modes orbit it, and selecting a
 * mode transforms the central visual (radar scan, stage flow, section
 * realignment, interview waveform, gap graph, milestone path). Everything is
 * illustrative structure: no companies, no scores, no claims. Code-native
 * SVG only — no screenshots.
 */

type OrbitMode = 'discover' | 'track' | 'tailor' | 'prepare' | 'learn' | 'plan';

const MODES: readonly {
  key: OrbitMode;
  label: string;
  Icon: typeof Radar;
  phrase: string;
  /** Orbital position (degrees, 0 = right, counter-clockwise). */
  angle: number;
}[] = [
  { key: 'discover', label: 'Discover', Icon: Radar, phrase: 'An opportunity radar scans live sources.', angle: 150 },
  { key: 'track', label: 'Track', Icon: KanbanSquare, phrase: 'Applications flow across stages you control.', angle: 90 },
  { key: 'tailor', label: 'Tailor', Icon: Wand2, phrase: 'Resume sections realign to one chosen role.', angle: 30 },
  { key: 'prepare', label: 'Prepare', Icon: MessagesSquare, phrase: 'Interview signals take shape before the call.', angle: 330 },
  { key: 'learn', label: 'Learn', Icon: BookOpen, phrase: 'Skill gaps connect to concrete next steps.', angle: 270 },
  { key: 'plan', label: 'Plan', Icon: Route, phrase: 'Career milestones form a path forward.', angle: 210 },
] as const;

/** Central scene (SVG 420×300) for one mode. Loops gate on `animate`. */
function ModeScene({ mode, animate }: { mode: OrbitMode; animate: boolean }) {
  const loop = (duration: number, extra?: object) =>
    animate ? { duration, repeat: Infinity, ease: 'easeInOut' as const, ...extra } : { duration: 0 };

  switch (mode) {
    case 'discover':
      return (
        <g>
          {[50, 90, 130].map((r) => (
            <circle key={r} cx={210} cy={150} r={r} fill="none" stroke="hsl(var(--primary) / 0.25)" strokeWidth={1} />
          ))}
          <motion.line
            x1={210}
            y1={150}
            x2={210}
            y2={20}
            stroke="hsl(var(--brand-to))"
            strokeWidth={1.5}
            strokeLinecap="round"
            initial={false}
            animate={animate ? { rotate: 360 } : { rotate: 45 }}
            transition={animate ? { duration: 6, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
            style={{ transformOrigin: '210px 150px' }}
          />
          {[
            [275, 95],
            [150, 200],
            [260, 205],
            [140, 110],
          ].map(([x, y], i) => (
            <motion.circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={5}
              fill="hsl(var(--brand-to))"
              initial={false}
              animate={animate ? { opacity: [0.2, 1, 0.2] } : { opacity: 0.9 }}
              transition={loop(2.4, { delay: i * 0.5 })}
            />
          ))}
        </g>
      );
    case 'track': {
      const stages = [60, 160, 260, 360];
      return (
        <g>
          <line x1={40} y1={150} x2={380} y2={150} stroke="hsl(var(--primary) / 0.35)" strokeWidth={1.5} />
          {stages.map((x, i) => (
            <g key={x}>
              <circle cx={x} cy={150} r={7} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth={1.5} />
              <text x={x} y={180} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">
                {['Saved', 'Applied', 'Interview', 'Offer'][i]}
              </text>
            </g>
          ))}
          <motion.circle
            cy={150}
            r={6}
            fill="hsl(var(--brand-to))"
            initial={false}
            animate={animate ? { cx: [60, 160, 260, 360] } : { cx: 260 }}
            transition={loop(4.5)}
          />
        </g>
      );
    }
    case 'tailor':
      return (
        <g>
          <rect x={140} y={40} width={140} height={220} rx={12} fill="hsl(var(--card))" stroke="hsl(var(--primary) / 0.5)" strokeWidth={1.5} />
          {[0, 1, 2, 3, 4].map((row) => (
            <motion.rect
              key={row}
              x={160}
              height={8}
              rx={4}
              fill={row === 1 ? 'hsl(var(--brand-to) / 0.8)' : 'hsl(var(--primary) / 0.4)'}
              initial={false}
              animate={
                animate
                  ? { y: [64 + row * 36, 64 + ((row + 1) % 5) * 36, 64 + row * 36], width: [100, 70 + row * 8, 100] }
                  : { y: 64 + row * 36, width: 100 - row * 6 }
              }
              transition={loop(5, { delay: row * 0.2 })}
            />
          ))}
        </g>
      );
    case 'prepare':
      return (
        <g>
          {Array.from({ length: 13 }, (_, i) => (
            <motion.rect
              key={i}
              x={80 + i * 22}
              width={8}
              rx={4}
              fill="hsl(var(--primary) / 0.7)"
              initial={false}
              animate={
                animate
                  ? { height: [14, 20 + ((i * 37) % 70), 14], y: [143, 140 - ((i * 37) % 70) / 2, 143] }
                  : { height: 16 + ((i * 37) % 60), y: 142 - ((i * 37) % 60) / 2 }
              }
              transition={loop(1.8, { delay: i * 0.08 })}
            />
          ))}
        </g>
      );
    case 'learn': {
      const have = [
        [120, 90],
        [100, 170],
        [150, 240],
      ];
      const next = [
        [300, 80],
        [320, 160],
        [290, 235],
      ];
      return (
        <g>
          {have.map(([x, y], i) => (
            <g key={`h${i}`}>
              <motion.path
                d={`M ${x} ${y} C ${(x + next[i][0]) / 2} ${y}, ${(x + next[i][0]) / 2} ${next[i][1]}, ${next[i][0]} ${next[i][1]}`}
                fill="none"
                stroke="hsl(var(--brand-to) / 0.7)"
                strokeWidth={1.5}
                strokeDasharray="4 5"
                initial={false}
                animate={animate ? { pathLength: [0, 1] } : { pathLength: 1 }}
                transition={animate ? { duration: 2.2, repeat: Infinity, repeatDelay: 1, ease: EASE, delay: i * 0.3 } : { duration: 0 }}
              />
              <circle cx={x} cy={y} r={7} fill="hsl(var(--primary))" opacity={0.85} />
              <circle cx={next[i][0]} cy={next[i][1]} r={7} fill="hsl(var(--card))" stroke="hsl(var(--brand-to))" strokeWidth={1.5} />
            </g>
          ))}
          <text x={110} y={45} fontSize={12} fill="hsl(var(--muted-foreground))">You have</text>
          <text x={280} y={45} fontSize={12} fill="hsl(var(--muted-foreground))">Next up</text>
        </g>
      );
    }
    case 'plan': {
      const steps = [
        [60, 240],
        [150, 190],
        [240, 140],
        [330, 80],
      ];
      return (
        <g>
          <motion.path
            d={`M ${steps.map(([x, y]) => `${x} ${y}`).join(' L ')}`}
            fill="none"
            stroke="hsl(var(--primary) / 0.6)"
            strokeWidth={1.5}
            initial={false}
            animate={animate ? { pathLength: [0, 1] } : { pathLength: 1 }}
            transition={animate ? { duration: 3, repeat: Infinity, repeatDelay: 1.4, ease: EASE } : { duration: 0 }}
          />
          {steps.map(([x, y], i) => (
            <motion.circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={8}
              fill="hsl(var(--card))"
              stroke="hsl(var(--brand-to))"
              strokeWidth={2}
              initial={false}
              animate={animate ? { opacity: [0.3, 1] } : { opacity: 1 }}
              transition={animate ? { duration: 3, repeat: Infinity, repeatDelay: 1.4, delay: (i / 4) * 3 } : { duration: 0 }}
            />
          ))}
        </g>
      );
    }
  }
}

export function CareerOrbit() {
  const reduce = !!useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { margin: '-15% 0px' });
  const [mode, setMode] = useState<OrbitMode>('discover');
  const active = MODES.find((m) => m.key === mode)!;
  const animate = inView && !reduce;

  return (
    <section
      id="workspace"
      aria-labelledby="workspace-heading"
      className="scroll-mt-24 border-t border-border/60 py-16 sm:py-24"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="workspace-heading"
            className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl"
          >
            One signal, your whole search
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
            A free account grows your resume into a working career system. Explore a mode.
          </p>
        </div>

        <div ref={ref} data-orbit-mode={mode} className="relative mx-auto mt-10 max-w-3xl">
          {/* Mode ring: buttons orbit the scene on lg, wrap above it below. */}
          <div
            role="group"
            aria-label="Workspace modes"
            className="mb-6 flex flex-wrap justify-center gap-2 lg:mb-0"
          >
            {MODES.map(({ key, label, Icon, angle }) => {
              const selected = key === mode;
              const rad = (angle * Math.PI) / 180;
              // Orbit placement (lg+): an ellipse around the central scene.
              const left = 50 + 46 * Math.cos(rad);
              const top = 50 - 44 * Math.sin(rad);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMode(key)}
                  onFocus={() => setMode(key)}
                  className={cn(
                    'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    'lg:absolute lg:-translate-x-1/2 lg:-translate-y-1/2',
                    selected
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : 'border-border bg-card/60 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                  )}
                  /* left/top only take effect at lg+ where the button is
                     absolutely positioned; static flow ignores them below. */
                  style={{ left: `${left}%`, top: `${top}%` }}
                  data-orbit-button
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Central scene. */}
          <div className="relative mx-auto max-w-xl lg:py-14">
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 p-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.svg
                  key={mode}
                  viewBox="0 0 420 300"
                  className="h-auto w-full"
                  role="img"
                  aria-label={`${active.label}: ${active.phrase}`}
                  initial={reduce ? false : { opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.99, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  {/* The profile stays the origin of every mode. */}
                  <circle cx={210} cy={150} r={13} fill="hsl(var(--primary))" opacity={0.15} />
                  <circle cx={210} cy={150} r={6} fill="hsl(var(--primary))" />
                  <ModeScene mode={mode} animate={animate} />
                </motion.svg>
              </AnimatePresence>
            </div>
            <p aria-live="polite" className="mt-3 text-center text-sm text-muted-foreground">
              {active.phrase}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
