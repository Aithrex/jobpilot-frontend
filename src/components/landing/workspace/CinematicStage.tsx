import { AnimatePresence, motion } from 'framer-motion';
import { FileText, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { atOrPast, type CinematicBeat } from './useCinematic';

/**
 * CinematicStage — the illustrative, pre-upload product sequence.
 *
 * HONESTY CONTRACT (enforced by tests):
 * Everything on this stage is REDACTED STRUCTURE — bars, pills and empty
 * slots. There is not one fictional company, job title, résumé line, or match
 * score anywhere in this file, because a landing page that invents a "92% match
 * at Stripe" is lying about the product. What the sequence shows is the SHAPE
 * of the workflow; the real content only ever arrives from a real upload.
 *
 * Region names ("Experience", "Skills") and UI affordance labels are the
 * product's own vocabulary, not fabricated user data, so they render as text.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

/** A redacted content line. Width is structural, never meaningful. */
function Bar({
  w,
  className,
  delay = 0,
  lit = false,
}: {
  w: string;
  className?: string;
  delay?: number;
  lit?: boolean;
}) {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0, scaleX: 0.4 }}
      animate={{ opacity: lit ? 1 : 0.55, scaleX: 1 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
      style={{ width: w, transformOrigin: 'left' }}
      className={cn(
        'block h-[5px] rounded-full transition-colors duration-500',
        lit ? 'bg-foreground/45' : 'bg-foreground/20',
        className,
      )}
    />
  );
}

/** A redacted skill chip — a pill with no invented label. */
function Chip({ w, delay = 0 }: { w: number; delay?: number }) {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      style={{ width: w }}
      className="inline-block h-[18px] rounded-full border border-[hsl(var(--brand-to)/0.35)] bg-[hsl(var(--brand-to)/0.14)]"
    />
  );
}

function RegionLabel({ children, lit }: { children: string; lit: boolean }) {
  return (
    <span
      className={cn(
        'text-[9px] font-semibold uppercase tracking-[0.13em] transition-colors duration-500',
        lit ? 'text-[hsl(var(--brand-to))]' : 'text-muted-foreground/45',
      )}
    >
      {children}
    </span>
  );
}

/** ── B: the résumé sheet, with the one-pass scanning light. ── */
function ResumeSheet({ beat }: { beat: CinematicBeat }) {
  const scanning = beat === 'scan';
  const read = atOrPast(beat, 'profile');
  const lit = scanning || read;

  // Definite width, not `w-full max-w-[190px]`: inside an auto-sized flex
  // wrapper a percentage width resolves circularly, which let this sheet and
  // the profile panel overlap the opportunity list.
  return (
    <motion.div
      initial={{ opacity: 0, y: -18, rotateZ: -1.5 }}
      animate={{ opacity: 1, y: 0, rotateZ: 0 }}
      transition={{ duration: 0.75, ease: EASE }}
      className="relative w-[168px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[hsl(var(--card))] p-3 shadow-panel sm:w-[190px]"
    >
      {/* Scanning light — a single pass, then gone. */}
      {scanning && (
        <motion.span
          aria-hidden
          initial={{ y: '-110%' }}
          animate={{ y: '110%' }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="pointer-events-none absolute inset-x-0 z-10 h-14"
          style={{
            background:
              'linear-gradient(to bottom, transparent, hsl(var(--brand-to) / 0.30), transparent)',
          }}
        />
      )}

      <div className="mb-2.5 flex items-center gap-1.5">
        <FileText className="h-3 w-3 text-muted-foreground/60" aria-hidden />
        <Bar w="52%" lit={lit} />
      </div>

      <div className="space-y-2.5">
        <div className="space-y-1">
          <RegionLabel lit={lit}>Experience</RegionLabel>
          <Bar w="92%" lit={lit} delay={0.05} />
          <Bar w="78%" lit={lit} delay={0.1} />
          <Bar w="85%" lit={lit} delay={0.15} />
        </div>
        <div className="space-y-1">
          <RegionLabel lit={lit}>Skills</RegionLabel>
          <Bar w="70%" lit={lit} delay={0.2} />
        </div>
        <div className="space-y-1">
          <RegionLabel lit={lit}>Education</RegionLabel>
          <Bar w="64%" lit={lit} delay={0.25} />
        </div>
        <div className="space-y-1">
          <RegionLabel lit={lit}>Impact</RegionLabel>
          <Bar w="88%" lit={lit} delay={0.3} />
          <Bar w="56%" lit={lit} delay={0.35} />
        </div>
      </div>
    </motion.div>
  );
}

/** ── C: the profile assembled from the résumé's own signals. ── */
function ProfilePanel({ beat }: { beat: CinematicBeat }) {
  const show = atOrPast(beat, 'profile');
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="w-[128px] shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5"
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span aria-hidden className="h-5 w-5 rounded-full bg-gradient-to-br from-[hsl(var(--brand-from))] to-[hsl(var(--brand-to))] opacity-70" />
        <span className="flex-1 space-y-1">
          <Bar w="80%" lit delay={0.1} />
          <Bar w="55%" delay={0.15} />
        </span>
      </div>

      {/* Experience → a concise timeline. */}
      <div className="my-2 space-y-1.5 border-l border-white/10 pl-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: 0.25 + i * 0.09 }}
            className="block"
          >
            <Bar w={`${86 - i * 14}%`} lit={i === 0} />
          </motion.span>
        ))}
      </div>

      {/* Skills → structural chips. */}
      <div className="flex flex-wrap gap-1">
        {[30, 22, 34, 26, 20].map((w, i) => (
          <Chip key={i} w={w} delay={0.5 + i * 0.06} />
        ))}
      </div>
    </motion.div>
  );
}

/** ── D: up to five EMPTY opportunity positions. Never populated. ── */
function OpportunityPanel({ beat }: { beat: CinematicBeat }) {
  const show = atOrPast(beat, 'match');
  const tailoring = atOrPast(beat, 'tailor');
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="min-w-0 flex-1 space-y-1.5"
    >
      <span className="block text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/50">
        Opportunities
      </span>
      {[0, 1, 2, 3, 4].map((i) => {
        const selected = tailoring && i === 0;
        return (
          <motion.div
            key={i}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: selected ? 1 : tailoring ? 0.3 : 1,
              y: 0,
            }}
            transition={{ duration: 0.4, ease: EASE, delay: show ? i * 0.08 : 0 }}
            className={cn(
              'flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors duration-500',
              selected
                ? 'border-[hsl(var(--brand-to)/0.5)] bg-[hsl(var(--brand-to)/0.10)]'
                : 'border-white/[0.07] bg-white/[0.02]',
            )}
          >
            {/* Empty slot: no logo, no company, no title, no score. */}
            <span aria-hidden className="h-5 w-5 shrink-0 rounded bg-foreground/10" />
            <span className="min-w-0 flex-1 space-y-1">
              <Bar w={`${74 - i * 6}%`} lit={selected} />
              <Bar w={`${46 - i * 4}%`} />
            </span>
            {/* Fit indicator is a bar of relative height — never a number. */}
            <span aria-hidden className="flex h-4 shrink-0 items-end gap-[2px]">
              {[0, 1, 2].map((b) => (
                <span
                  key={b}
                  style={{ height: `${(3 - b) * 4 + 4 - i * 1.5}px` }}
                  className={cn(
                    'w-[3px] rounded-full',
                    selected ? 'bg-[hsl(var(--brand-to))]' : 'bg-foreground/20',
                  )}
                />
              ))}
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/** ── E: Original vs Tailored, with IntegrityGuard holding the facts. ── */
function TailorPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5"
    >
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/50">
            Original
          </span>
          <Bar w="90%" />
          <Bar w="72%" />
          <Bar w="80%" />
        </div>
        <div className="space-y-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[hsl(var(--brand-to))]">
            Tailored
          </span>
          <Bar w="94%" lit delay={0.1} />
          <Bar w="84%" lit delay={0.18} />
          <Bar w="78%" lit delay={0.26} />
        </div>
      </div>

      {/* IntegrityGuard: the facts that stay locked. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-white/[0.07] pt-2"
      >
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          IntegrityGuard
        </span>
        {['Dates', 'Employers', 'Titles', 'Claims'].map((f, i) => (
          <motion.span
            key={f}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.07 }}
            className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-[1px] text-[9px] font-medium text-emerald-300/90"
          >
            <Lock className="h-2.5 w-2.5" aria-hidden />
            {f}
          </motion.span>
        ))}
      </motion.div>

      {/* Export affordances — real product actions, shown inert here. */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.8 }}
        className="mt-2 flex gap-1.5"
      >
        {['PDF', 'DOCX'].map((f) => (
          <span
            key={f}
            className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-[3px] text-[10px] font-semibold text-foreground/70"
          >
            {f}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}

export interface CinematicStageProps {
  beat: CinematicBeat;
  className?: string;
}

export function CinematicStage({ beat, className }: CinematicStageProps) {
  const showTailor = atOrPast(beat, 'tailor');

  return (
    <div
      className={cn('relative h-full p-4 sm:p-5', className)}
      // The whole illustration is decorative: the accessible description of
      // what Aspirely does lives in the hero copy and the aria-live region
      // used by the REAL flow. Screen readers skip the redacted shapes.
      aria-hidden
    >
      {/* At phone widths the three panels cannot sit side by side without the
          opportunity rows being clipped, so the résumé + profile pair rides on
          top and the opportunity list takes the full width beneath it. */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* shrink-0, NOT min-w-0: both children are fixed-width and shrink-0,
            so letting this wrapper collapse below its content made the profile
            panel overlap the opportunity list. */}
        <div className="flex shrink-0 gap-3">
          <ResumeSheet beat={beat} />
          <AnimatePresence>
            <ProfilePanel key="profile" beat={beat} />
          </AnimatePresence>
        </div>
        <OpportunityPanel beat={beat} />
      </div>
      <AnimatePresence>{showTailor && <TailorPanel key="tailor" />}</AnimatePresence>
    </div>
  );
}
