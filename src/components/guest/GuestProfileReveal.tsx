import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Briefcase, FileText, MapPin, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { stepTransition } from '@/components/guest/_shared';
import { cn } from '@/lib/utils';
import type { GuestExtractedCounts } from '@/hooks/useGuestFlow';
import type { GuestProfileBlock } from '@/types/guest';

/**
 * The profile reveal between parsing and matches: "here is what we understood
 * from your resume". Renders ONLY genuinely extracted fields (server profile
 * block, or the client-side synthesis for pre-v3 results) - a missing field
 * simply does not render; there is no edit UI (the product does not support
 * correction yet). The extracted name is presentation-only, never identity.
 *
 * Auto-advances to matches after ~2.5s of idle UNLESS the user interacted or
 * prefers reduced motion (then it is a plain button). Skill chips animate in
 * from the resume glyph (transform + opacity only).
 */
export interface GuestProfileRevealProps {
  profile: GuestProfileBlock;
  /** What the parser ACTUALLY extracted, counted from the real structured
   * resume. Absent counts render nothing. */
  counts?: GuestExtractedCounts;
  fileName?: string | null;
  onContinue: () => void;
  /** Idle auto-advance delay in ms (exposed for tests). */
  autoAdvanceMs?: number;
  className?: string;
}

/**
 * Honest extracted counts, e.g. "12 skills · 3 roles · 6 years detected".
 *
 * This deliberately replaces the old "profile completeness" ring, which
 * scored a resume against seven OPTIONAL parser fields and so made a
 * correctly-parsed resume look defective. Counts are not a score: a count the
 * parser did not produce is simply omitted, never rendered as a zero.
 */
function countPhrases(counts: GuestExtractedCounts): string[] {
  const out: string[] = [];
  if (counts.skills) out.push(`${counts.skills} ${counts.skills === 1 ? 'skill' : 'skills'}`);
  if (counts.roles) out.push(`${counts.roles} ${counts.roles === 1 ? 'role' : 'roles'}`);
  if (counts.years) out.push(`${counts.years} ${counts.years === 1 ? 'year' : 'years'} detected`);
  return out;
}

export function GuestProfileReveal({
  profile,
  counts = {},
  fileName,
  onContinue,
  autoAdvanceMs = 2500,
  className,
}: GuestProfileRevealProps) {
  const reduceMotion = useReducedMotion();
  const [autoArmed, setAutoArmed] = useState(!reduceMotion);
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;

  // Idle auto-advance: cancelled by any USER interaction (pointer/keys)  -
  // deliberately not focus, because the flow shell moves focus here itself.
  // Reduced motion: never armed; the button is the only way forward.
  useEffect(() => {
    if (reduceMotion || !autoArmed) return;
    const cancel = () => setAutoArmed(false);
    window.addEventListener('pointerdown', cancel);
    window.addEventListener('pointermove', cancel);
    window.addEventListener('keydown', cancel);
    const t = window.setTimeout(() => continueRef.current(), autoAdvanceMs);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', cancel);
      window.removeEventListener('pointermove', cancel);
      window.removeEventListener('keydown', cancel);
    };
  }, [reduceMotion, autoArmed, autoAdvanceMs]);

  const extractedPhrases = countPhrases(counts);
  const skills = (profile.skills ?? []).slice(0, 10);
  const experienceLine =
    profile.experience_level && typeof profile.years === 'number'
      ? `${profile.experience_level} (${profile.years} ${profile.years === 1 ? 'year' : 'years'})`
      : profile.experience_level ||
        (typeof profile.years === 'number'
          ? `${profile.years} ${profile.years === 1 ? 'year' : 'years'} of experience`
          : null);

  const chipMotion = (i: number) =>
    reduceMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, x: -28, y: 10 },
          animate: { opacity: 1, x: 0, y: 0 },
          transition: { ...stepTransition, delay: 0.15 + i * 0.05 },
        };

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            {profile.first_name ? `${profile.first_name}, here is` : 'Here is'} what we understood
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Built only from what your resume actually says. Nothing invented.
          </p>
        </div>
        {extractedPhrases.length > 0 && (
          <div
            className="shrink-0 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5"
            data-testid="extracted-counts"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              Extracted from your resume
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {extractedPhrases.join(' · ')}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* ── The resume glyph the skill chips animate out of ── */}
        <div className="flex flex-col gap-3 self-start rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" title={fileName ?? undefined}>
                {fileName ?? 'Your resume'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Read and structured</p>
            </div>
          </div>

          {profile.headline_title && (
            <p className="flex items-start gap-2 text-sm">
              <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Likely title
                </span>
                {profile.headline_title}
              </span>
            </p>
          )}
          {experienceLine && (
            <p className="flex items-start gap-2 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Experience level
                </span>
                {experienceLine}
              </span>
            </p>
          )}
          {profile.location && (
            <p className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Location
                </span>
                {profile.location}
              </span>
            </p>
          )}
          {profile.work_authorization && (
            <p className="flex items-start gap-2 text-sm">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Work authorization
                </span>
                {profile.work_authorization}
              </span>
            </p>
          )}
        </div>

        <div className="space-y-4">
          {skills.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Skills we found
              </p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, i) => (
                  <motion.span key={skill} {...chipMotion(i)}>
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      {skill}
                    </Badge>
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          {profile.summary_short && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                What we understood
              </p>
              <p className="mt-1 text-sm leading-relaxed">{profile.summary_short}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button className="h-11 sm:w-auto" onClick={onContinue}>
          Find my matches
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
        <p className="text-xs text-muted-foreground">
          {autoArmed && !reduceMotion
            ? 'Continuing to your matches in a moment. Move the pointer or press a key to stay here.'
            : 'A wrong guess here does not block you. Matching uses your full resume.'}
        </p>
      </div>
    </div>
  );
}
