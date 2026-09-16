/**
 * "Not scored" is a state with a cause and a fix. Say both.
 *
 * When a page of results carries no fit verdict, every card reads "Not scored"
 * and the feed looks broken. It is not broken: the scoring engine declined,
 * almost always because there is no parsed resume on the account to compare
 * against. A row of grey chips does not say that, and a zero would be a lie,
 * so the reason goes above the list with the one action that resolves it.
 *
 * Three honest states, in order of how often they are true:
 *  - nothing is scored -> we could not read enough from your resume;
 *  - most are scored -> nothing is said at all, because a handful of
 *    unscorable postings is normal and not worth a banner;
 *  - some are scored -> a quiet count, so the mixed page is explained without
 *    being alarming.
 */
import { FileSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export interface TechFeedScoringNoticeProps {
  /** Rows on this page with no fit verdict. */
  unscoredCount: number;
  /** Rows on this page in total. */
  totalCount: number;
  className?: string;
}

export function TechFeedScoringNotice({
  unscoredCount,
  totalCount,
  className,
}: TechFeedScoringNoticeProps) {
  if (unscoredCount <= 0 || totalCount <= 0) return null;

  const all = unscoredCount === totalCount;
  // Below this share it is noise, not a signal about the account.
  if (!all && unscoredCount / totalCount < 0.5) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs',
        className,
      )}
      data-testid="tech-feed-scoring-notice"
      role="status"
    >
      <p className="flex items-start gap-2 text-foreground">
        <FileSearch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span>
          {all
            ? 'These postings are not scored. A fit score compares a posting to your resume, and we could not read enough from a resume on your account to do that.'
            : `${unscoredCount} of these ${totalCount} postings are not scored - we could not compare them to your resume.`}
        </span>
      </p>
      <p className="ml-5 mt-1.5 text-muted-foreground">
        The results below are still real jobs, ranked by how well they match your
        search. They are not ranked against you.{' '}
        <Link
          to="/app/resume/library"
          className="interactive font-medium text-primary underline underline-offset-2"
        >
          Add or check your resume
        </Link>{' '}
        to turn scoring on.
      </p>
    </div>
  );
}

export default TechFeedScoringNotice;
