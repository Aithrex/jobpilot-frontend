import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck, Check, ExternalLink, ShieldCheck, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CompanyLogo } from '@/components/CompanyLogo';
import { FreshnessTag, ScoreBadge, stepTransition } from '@/components/guest/_shared';
import { GuestFitBreakdown, fitOf } from '@/components/guest/GuestFitBreakdown';
import { cn } from '@/lib/utils';
import type { GuestJobMatch } from '@/types/guest';

export type GuestJobDetailState = 'available' | 'tailored' | 'locked';

export interface GuestJobDetailProps {
  match: GuestJobMatch;
  state: GuestJobDetailState;
  onConfirmTailor: (match: GuestJobMatch) => void;
  onViewTailored: () => void;
  /** Hovering a matched skill reports it to the host so the OTHER visible
   * cards can dim (null on leave). Optional - hover is an enhancement. */
  onSkillHover?: (skill: string | null) => void;
  /** false when the host already renders the title/company/score header
   * (the mobile accordion card) - avoids a doubled header. */
  showHeader?: boolean;
  className?: string;
}

/**
 * Full detail for the selected match: the match reasoning, matched skills,
 * source link, and the sponsorship signal in precise public-filing language.
 * Tailoring requires an EXPLICIT confirmation - a guest gets exactly one free
 * tailor, so the first click opens a confirm block instead of spending it.
 */
export function GuestJobDetail({
  match,
  state,
  onConfirmTailor,
  onViewTailored,
  onSkillHover,
  showHeader = true,
  className,
}: GuestJobDetailProps) {
  const reduceMotion = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const postingLink = match.apply_link || match.url;
  // FitScore v2 when the server sent it; null degrades to the scalar badge.
  const fit = fitOf(match);

  // Selecting a different job always resets the pending confirmation and any
  // lingering skill-hover highlight.
  useEffect(() => {
    setConfirming(false);
    onSkillHover?.(null);
  }, [match.match_id, onSkillHover]);

  // Never leave the host's cards dimmed after this detail unmounts.
  useEffect(() => () => onSkillHover?.(null), [onSkillHover]);

  return (
    <motion.div
      key={match.match_id}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={stepTransition}
      className={cn(
        'flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5',
        className,
      )}
    >
      {showHeader && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <CompanyLogo
              company={match.company || match.title}
              logoUrl={match.logo_url}
              size={40}
            />
            <div className="min-w-0">
              <h3 className="text-balance font-semibold leading-snug sm:text-lg">{match.title}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {match.company}
                {match.location ? ` · ${match.location}` : ''}
              </p>
              {/* Server-authoritative freshness - omitted entirely when the
  backend sent no date for this row. */}
              <FreshnessTag match={match} className="mt-1" />
            </div>
          </div>
          <ScoreBadge score={match.match_score} band={fit?.band} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!showHeader && <FreshnessTag match={match} />}
        {match.source && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            Direct source · {match.source}
          </Badge>
        )}
        {postingLink && (
          <a
            href={postingLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1 rounded py-1 text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View the original posting
            <ExternalLink className="h-3 w-3" aria-hidden />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>

      {match.why && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Why this matches
          </p>
          <p className="mt-1 text-sm leading-relaxed">{match.why}</p>
        </div>
      )}

      {/* FitScore v2 breakdown. Absent block = no breakdown rendered at all;
  nothing here is ever reconstructed client-side. */}
      {fit && <GuestFitBreakdown fit={fit} />}

      {(match.matched_skills?.length ?? 0) > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Skills you match
          </p>
          <div className="flex flex-wrap gap-1.5" onMouseLeave={() => onSkillHover?.(null)}>
            {match.matched_skills!.map((skill) => (
              <span
                key={skill}
                onMouseEnter={() => onSkillHover?.(skill)}
                onMouseLeave={() => onSkillHover?.(null)}
              >
                <Badge variant="secondary" className="text-[11px] font-normal">
                  {skill}
                </Badge>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resume-relative score context: the guest's OWN skills this posting
  does not mention - never framed as requirements they lack. */}
      {(match.gaps?.length ?? 0) > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            From your resume, not mentioned in this posting
          </p>
          <div className="flex flex-wrap gap-1.5">
            {match.gaps!.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="border-warning/40 bg-warning/5 text-[11px] font-normal text-muted-foreground"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {match.sponsorship && (
        <p className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span>
            {match.sponsorship.note ||
              'This employer shows visa sponsorship signals from public filings.'}
          </span>
        </p>
      )}

      <div className="mt-auto space-y-2 pt-1">
        {state === 'available' && !confirming && (
          <>
            <Button
              className="h-11 w-full"
              onClick={() => setConfirming(true)}
              aria-label={`Tailor my resume for ${match.title} at ${match.company}`}
            >
              <Wand2 className="h-4 w-4" aria-hidden />
              Tailor my resume for this role
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              As a guest you can tailor exactly one resume, free.
            </p>
          </>
        )}

        {state === 'available' && confirming && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stepTransition}
            className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <p className="flex items-start gap-2 text-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                This uses your <span className="font-semibold">one free guest tailor</span> on{' '}
                {match.title} at {match.company}. You get the result as a polished PDF and DOCX, and
                IntegrityGuard keeps your real employers, titles, dates, and skills.
              </span>
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="h-11 flex-1" onClick={() => onConfirmTailor(match)}>
                <Wand2 className="h-4 w-4" aria-hidden />
                Use my free tailor
              </Button>
              <Button variant="outline" className="h-11" onClick={() => setConfirming(false)}>
                Not yet
              </Button>
            </div>
          </motion.div>
        )}

        {state === 'tailored' && (
          <Button
            variant="outline"
            className="h-11 w-full border-success/40 text-success hover:text-success"
            onClick={onViewTailored}
          >
            <Check className="h-4 w-4" aria-hidden />
            View my tailored resume
          </Button>
        )}

        {state === 'locked' && (
          <div className="space-y-1.5">
            <Button className="h-11 w-full" disabled aria-disabled>
              <Wand2 className="h-4 w-4" aria-hidden />
              Free tailor used
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              <Link
                to="/register"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Create a free account
              </Link>{' '}
              to save this work and unlock 5 tailors a day.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
