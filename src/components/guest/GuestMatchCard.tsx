import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck, Check, ExternalLink, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScoreBadge, stepTransition } from '@/components/guest/_shared';
import type { GuestJobMatch } from '@/types/guest';

/**
 * - 'available': the guest can spend their free tailor on this role.
 * - 'tailored': THIS role holds the finished tailor — offer to reopen it.
 * - 'locked': the single free tailor is spent (or already exhausted for a
 *   returning guest) — data stays fully visible, only the capability locks.
 */
export type GuestMatchCardState = 'available' | 'tailored' | 'locked';

export interface GuestMatchCardProps {
  match: GuestJobMatch;
  state: GuestMatchCardState;
  onTailor: (match: GuestJobMatch) => void;
  onViewTailored?: () => void;
  /** Stagger index for the entrance animation (reduced-motion safe). */
  index?: number;
}

export function GuestMatchCard({
  match,
  state,
  onTailor,
  onViewTailored,
  index = 0,
}: GuestMatchCardProps) {
  const reduceMotion = useReducedMotion();
  const postingLink = match.apply_link || match.url;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...stepTransition, delay: reduceMotion ? 0 : Math.min(index * 0.05, 0.3) }}
    >
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-semibold" title={match.title}>
                {match.title}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                {match.company}
                {match.location ? ` · ${match.location}` : ''}
              </p>
            </div>
            <ScoreBadge score={match.match_score} />
          </div>

          <div className="flex items-center gap-2">
            {match.source && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                {match.source}
              </Badge>
            )}
            {postingLink && (
              <a
                href={postingLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded py-1 text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View posting
                <ExternalLink className="h-3 w-3" aria-hidden />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>

          {match.why && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Why this matches: </span>
              {match.why}
            </p>
          )}

          {(match.matched_skills?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">You match:</span>
              {match.matched_skills!.slice(0, 4).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-[11px] font-normal">
                  {skill}
                </Badge>
              ))}
              {match.matched_skills!.length > 4 && (
                <span className="text-[11px] text-muted-foreground">
                  +{match.matched_skills!.length - 4} more
                </span>
              )}
            </div>
          )}

          {match.sponsorship && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span>
                {match.sponsorship.note ||
                  'This employer shows visa sponsorship signals from public filings.'}
              </span>
            </p>
          )}

          {state === 'available' && (
            <Button
              className="mt-auto"
              onClick={() => onTailor(match)}
              aria-label={`Tailor my resume for ${match.title} at ${match.company}, using your one free tailor`}
            >
              <Wand2 className="h-4 w-4" aria-hidden />
              Tailor my resume, free
            </Button>
          )}

          {state === 'tailored' && (
            <Button
              variant="outline"
              className="mt-auto border-success/40 text-success hover:text-success"
              onClick={onViewTailored}
              aria-label={`View your tailored resume for ${match.title} at ${match.company}`}
            >
              <Check className="h-4 w-4" aria-hidden />
              View my tailored resume
            </Button>
          )}

          {state === 'locked' && (
            <div className="mt-auto space-y-1.5">
              <Button className="w-full" disabled aria-disabled>
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
