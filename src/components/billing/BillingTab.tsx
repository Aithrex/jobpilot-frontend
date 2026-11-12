import { useBillingPlan } from '@/hooks/useEntitlements';
import { useUpgrade } from './UpgradeModalProvider';
import { QuotaMeter } from './QuotaMeter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PLAN_LABEL, PLAN_PRICE, nextPlan, type PlanId } from '@/lib/entitlements';
import { AlertCircle, Crown, Zap, Sparkles, Check } from 'lucide-react';

const USAGE_LABEL: Record<string, string> = {
  tailor: 'Resume tailors',
  ats_scores: 'ATS scores',
  cover_letter: 'Cover letters',
  auto_submit: 'Auto-apply submissions',
  autoapply_answer: 'Auto-apply answers',
  quiz: 'Quizzes',
  practice_question: 'Practice questions',
  mock_evaluate: 'Mock evaluations',
  salary: 'Salary lookups',
  post_draft: 'LinkedIn posts',
  learning_plan_generate: 'Learning plans',
};

const USAGE_ORDER = [
  'tailor',
  'ats_scores',
  'cover_letter',
  'mock_evaluate',
  'practice_question',
  'quiz',
  'salary',
  'post_draft',
  'learning_plan_generate',
];

export default function BillingTab() {
  const { data, isLoading, isError, refetch, isFetching } = useBillingPlan();
  const { open } = useUpgrade();

  if (isError && !data) {
    return (
      <div className="max-w-3xl rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="space-y-3">
            <p className="text-sm text-foreground">We could not load your plan and usage.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? 'Retrying...' : 'Try again'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    // Shaped like the loaded view: plan card, usage list, three plan cards.
    return (
      <div className="max-w-3xl space-y-6" aria-busy="true">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const plan = (data.plan as PlanId) || 'free';
  const PlanIcon = plan === 'premium_plus' ? Crown : plan === 'premium' ? Zap : Sparkles;
  const upgradeTo = nextPlan(plan);

  return (
    // No self-container (mx-auto/p-4): both mounts - /next settings and the
    // classic workspace - already pad and align their content; centering here
    // broke the settings panels' shared left alignment.
    <div className="max-w-3xl space-y-6">
      {/* Current plan */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
              <PlanIcon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="font-display text-headline-sm text-foreground">{data.plan_label || PLAN_LABEL[plan]}</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-headline-sm tabular-nums text-foreground">${PLAN_PRICE[plan]}<span className="text-base font-medium text-muted-foreground">/mo</span></p>
            {upgradeTo && (
              <Button className="mt-2" onClick={() => open({ highlight: upgradeTo })}>
                Upgrade to {PLAN_LABEL[upgradeTo]}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Usage */}
      <div>
        <h2 className="overline mb-3">Usage</h2>
        {USAGE_ORDER.some((k) => data.usage?.[k]) ? (
          <Card className="divide-y divide-border">
            {USAGE_ORDER.filter((k) => data.usage?.[k]).map((k) => {
              const u = data.usage[k];
              return (
                <div key={k} className="p-4">
                  <QuotaMeter label={USAGE_LABEL[k] || k} used={u.used} limit={u.limit} feature={k} />
                </div>
              );
            })}
          </Card>
        ) : (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">
              No usage yet. Your counts appear here once you use a metered feature, like tailoring a resume.
            </p>
          </Card>
        )}
      </div>

      {/* Plans comparison */}
      <div>
        <h2 className="overline mb-3">Plans</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(['free', 'premium', 'premium_plus'] as PlanId[]).map((p) => {
            const isCurrent = p === plan;
            return (
              <Card key={p} className={`flex flex-col p-4 ${isCurrent ? 'ring-1 ring-primary' : ''}`}>
                <h3 className="text-title-sm text-foreground">{PLAN_LABEL[p]}</h3>
                <p className="mt-1 font-display text-headline-sm tabular-nums text-foreground">${PLAN_PRICE[p]}<span className="text-sm font-medium text-muted-foreground">/mo</span></p>
                <ul className="mt-3 flex-1 space-y-1.5 text-xs text-muted-foreground">
                  {(data.plans?.[p]?.features || []).filter((f) => !['auto_apply', 'auto_submit', 'six_seconds', 'voice_graph'].includes(f)).slice(0, 6).map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 shrink-0 text-signal" aria-hidden="true" />
                      <span>{f.replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" disabled className="mt-3">Current plan</Button>
                ) : (
                  <Button
                    // One primary per region: only the next plan up is filled.
                    variant={p === 'free' ? 'ghost' : p === upgradeTo ? 'default' : 'outline'}
                    className="mt-3"
                    onClick={() => open({ highlight: p })}
                    disabled={p === 'free'}
                  >
                    {p === 'free' ? 'Included' : `Get ${PLAN_LABEL[p]}`}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
