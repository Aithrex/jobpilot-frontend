import { useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE, Mark, SampleTag } from '@/components/landing/_shared';
import {
  RESUME_LINES,
  SAMPLE_ROLES,
  TAILOR_PLAN,
  tailoredOrder,
  type SampleRole,
} from '@/components/landing/sample';
import { FitRing, Monogram, VisaChip } from '@/components/landing/scenes/parts';

/**
 * The picture beside the sign-in form: the product doing its three things,
 * in the same sample data the home page uses.
 *
 *   1. Fresh    roles arrive on the board and their fit is scored.
 *   2. Visa     sponsorship evidence appears and the board re-sorts by it.
 *   3. Tailor   a resume's own lines move into a new order. Nothing is added.
 *
 * It plays by itself, holds under the pointer, has a pause control (it loops
 * for longer than five seconds, WCAG 2.2.2), and the three dots choose a beat
 * directly. With reduced motion nothing plays: it opens resolved on the
 * sponsorship beat and the dots still work.
 *
 * Everything shown is fictional and the scene says so in words.
 */

const BEATS = [
  { id: 'fresh', line: "From employers' own careers pages" },
  { id: 'visa', line: 'Sponsorship evidence on every card' },
  { id: 'tailor', line: 'Tailoring that invents nothing' },
] as const;

const BEAT_MS = 3800;
const ROLES = SAMPLE_ROLES.slice(0, 4);
const TAILOR_ROLE = ROLES[0];

function visaRank(role: SampleRole): number {
  switch (role.visa.kind) {
    case 'sponsors':
      return 0;
    case 'note':
      return 1;
    case 'none':
      return 2;
    default:
      return 3;
  }
}

function Board({ beat, reduce }: { beat: number; reduce: boolean }) {
  // The rings empty and redraw each time the board comes round again.
  const [drawn, setDrawn] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    if (beat !== 0) {
      setDrawn(true);
      return;
    }
    setDrawn(false);
    const id = window.setTimeout(() => setDrawn(true), 260);
    return () => window.clearTimeout(id);
  }, [beat, reduce]);

  const visa = beat >= 1;
  const roles = visa
    ? [...ROLES].sort((a, b) => visaRank(a) - visaRank(b) || b.score - a.score)
    : [...ROLES].sort((a, b) => b.score - a.score);

  return (
    <LayoutGroup>
      <ul className="flex flex-col p-2">
        {roles.map((role, i) => {
          const refused = visa && role.visa.kind === 'refuses';
          return (
            <motion.li
              key={role.id}
              layout={reduce ? false : 'position'}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: refused ? 0.5 : 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE, delay: reduce ? 0 : i * 0.07 }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            >
              <Monogram role={role} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.875rem] font-semibold text-foreground">{role.title}</p>
                <p className="truncate text-[0.75rem] text-muted-foreground">
                  {role.company} · {role.posted}
                </p>
              </div>
              <motion.span
                className="hidden shrink-0 xl:block"
                initial={false}
                animate={{ opacity: visa ? 1 : 0, scale: visa ? 1 : 0.9 }}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.35, ease: EASE, delay: visa ? 0.3 + i * 0.06 : 0 }
                }
              >
                <VisaChip role={role} />
              </motion.span>
              <FitRing score={role.score} size={34} draw={drawn} />
            </motion.li>
          );
        })}
      </ul>
    </LayoutGroup>
  );
}

function TailorSheet({ reduce }: { reduce: boolean }) {
  // Opens in the resume's own order, then the lines move. Same lines.
  const [tailored, setTailored] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const id = window.setTimeout(() => setTailored(true), 700);
    return () => window.clearTimeout(id);
  }, [reduce]);

  const order = tailored ? tailoredOrder(TAILOR_ROLE.id) : RESUME_LINES.map((l) => l.id);
  const marks = TAILOR_PLAN[TAILOR_ROLE.id]?.marks ?? [];
  const lines = order
    .map((id) => RESUME_LINES.find((l) => l.id === id))
    .filter((l): l is (typeof RESUME_LINES)[number] => Boolean(l));

  return (
    <motion.div
      className="absolute inset-x-3 bottom-3 top-3 flex flex-col rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-stage)]"
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <p className="text-[0.75rem] font-semibold text-muted-foreground">
        Tailored for {TAILOR_ROLE.title} · {TAILOR_ROLE.company}
      </p>
      <LayoutGroup>
        <ul className="mt-3 flex flex-1 flex-col gap-2">
          {lines.map((line) => (
            <motion.li
              key={line.id}
              layout={reduce ? false : 'position'}
              transition={{ duration: 0.6, ease: EASE }}
              className="rounded-lg bg-muted/60 px-3 py-2 text-[0.8125rem] leading-snug text-foreground"
            >
              {line.text.map((seg, i) =>
                typeof seg === 'string' ? (
                  <span key={i}>{seg}</span>
                ) : marks.includes(seg.mark) ? (
                  <Mark key={i} on={tailored} delay={500}>
                    {seg.mark}
                  </Mark>
                ) : (
                  <span key={i}>{seg.mark}</span>
                ),
              )}
            </motion.li>
          ))}
        </ul>
      </LayoutGroup>
      <p className="mt-3 text-[0.75rem] font-medium text-muted-foreground">
        Same lines. New order. Nothing added.
      </p>
    </motion.div>
  );
}

export function AuthScene() {
  const reduce = useReducedMotion() ?? false;
  const [beat, setBeat] = useState(reduce ? 1 : 0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (reduce || paused || hover) return;
    const id = window.setInterval(() => setBeat((b) => (b + 1) % BEATS.length), BEAT_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused, hover]);

  return (
    <div onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      {/* A picture of the product. The three lines below carry its meaning in
          words, so the picture itself is hidden from assistive technology. */}
      <div className="pub-stage relative min-h-[20.5rem] overflow-hidden" aria-hidden>
        <motion.div
          initial={false}
          animate={{ opacity: beat === 2 ? 0.25 : 1, scale: beat === 2 ? 0.97 : 1 }}
          transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
        >
          <Board beat={beat} reduce={reduce} />
        </motion.div>
        <AnimatePresence>{beat === 2 && <TailorSheet key="sheet" reduce={reduce} />}</AnimatePresence>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="relative h-7 min-w-0 flex-1" aria-hidden>
          <AnimatePresence initial={false}>
            <motion.p
              key={beat}
              className="pub-h4 absolute inset-0 truncate"
              style={{ color: 'hsl(var(--brand-band-foreground))' }}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {BEATS[beat].line}
            </motion.p>
          </AnimatePresence>
        </div>
        <SampleTag className="shrink-0" />
      </div>
      <ul className="sr-only">
        {BEATS.map((b) => (
          <li key={b.id}>{b.line}</li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-2">
        {BEATS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            aria-label={b.line}
            aria-pressed={beat === i}
            onClick={() => {
              setPaused(true);
              setBeat(i);
            }}
            className="pub-auth-beat"
          >
            <span className={cn('pub-auth-beat-bar', beat === i && 'pub-auth-beat-bar-on')} />
          </button>
        ))}
        {!reduce && (
          <button
            type="button"
            aria-label={paused ? 'Play the preview' : 'Pause the preview'}
            onClick={() => setPaused((p) => !p)}
            className="pub-auth-beat-toggle ml-auto"
          >
            {paused ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
          </button>
        )}
      </div>
    </div>
  );
}

export default AuthScene;
