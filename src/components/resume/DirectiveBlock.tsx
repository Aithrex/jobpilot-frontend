/**
 * DirectiveBlock — the signed-in Home's opener. Not a greeting, not a stat grid:
 * it answers "what do I do right now?" with up to three concrete roles worth
 * applying to today, each with its match % and the honest reason it surfaced,
 * behind ONE primary action.
 *
 * The roles come straight from the saved/scored jobs DashboardTab already
 * fetched — strongest match first, preferring ones still in the "interested"
 * (un-submitted) state. When there are no concrete roles yet, we fold in the
 * existing HeroAction ranker, which is itself a designed single-action state
 * (add a resume, run a search, protect an OPT clock, …).
 */
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Building2, Sparkles } from 'lucide-react';
import type { Job } from '@/types/jobs';
import type { DashboardCtx } from './widgets/types';
import { EASE } from './widgets/types';
import { MetaChip } from './widgets/primitives';
import { scoredMatches, isVisaUser } from './widgets/selectors';
import { HeroAction } from './widgets/HeroAction';

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** The one honest line for why a role surfaced — sponsorship, skills, or fit. */
function whyReason(j: Job, onVisa: boolean): string {
  const sp = j.sponsorship;
  if (onVisa && sp && (sp.band === 'strong' || sp.band === 'moderate') && sp.approvals_5y > 0) {
    return `Sponsored ${sp.approvals_5y.toLocaleString()} H-1Bs in 5 years`;
  }
  const matched = (j.matched_skills || []).length;
  if (matched > 0) {
    return `${matched} of your ${matched === 1 ? 'skill lines' : 'skills line'} up`;
  }
  const score = Math.round(j.match_score || 0);
  if (score >= 75) return 'Strong fit for your resume';
  if (j.is_remote) return 'Remote-friendly and on target';
  return 'Matches your target role';
}

export function DirectiveBlock({ ctx }: { ctx: DashboardCtx }) {
  const reduce = useReducedMotion();
  const onVisa = isVisaUser(ctx);

  // Strongest matches first; prefer roles still awaiting a submission.
  const scored = scoredMatches(ctx);
  const interested = scored.filter((j) => j.status === 'interested');
  const roles = (interested.length > 0 ? interested : scored).slice(0, 3);

  // No concrete roles yet → the ranker's single best next step is the opener.
  if (roles.length === 0) {
    return <HeroAction ctx={ctx} />;
  }

  const n = roles.length;

  return (
    <motion.section
      aria-labelledby="directive-heading"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="relative overflow-hidden rounded-container border border-primary/20 p-6 shadow-soft mesh-accent sm:p-7"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Today's focus
          </div>
          <h1
            id="directive-heading"
            className="mt-2 text-balance font-display text-xl font-extrabold leading-tight tracking-tight sm:text-[1.6rem]"
          >
            <span className="tabular-nums">{n}</span> {plural(n, 'role', 'roles')} worth applying to today
          </h1>

          <ul className="mt-4 flex flex-col divide-y divide-border/60">
            {roles.map((m) => {
              const j = m.job_data;
              const score = Math.round(j.match_score || 0);
              return (
                <li key={m._id} className="flex items-center gap-3 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-card/70 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {j.company || 'Company'}
                      </span>
                      {score > 0 && (
                        <span className="shrink-0">
                          <MetaChip tone="primary">
                            <span className="tabular-nums">{score}%</span>
                          </MetaChip>
                        </span>
                      )}
                    </div>
                    <span className="block truncate text-xs text-muted-foreground">
                      {j.title || 'Role'}
                    </span>
                    <span className="mt-0.5 block truncate text-xs tabular-nums text-muted-foreground/90">
                      {whyReason(j, onVisa)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end lg:self-center">
          <button
            type="button"
            onClick={() => ctx.navigate('jobs')}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Review &amp; apply <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.section>
  );
}

export default DirectiveBlock;
