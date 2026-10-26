import { useBillingPlan } from '@/hooks/useEntitlements';
import { useUpgrade } from './UpgradeModalProvider';
import { QuotaMeter } from './QuotaMeter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PLAN_LABEL, PLAN_PRICE, nextPlan, type PlanId } from '@/lib/entitlements';
import { Crown, Zap, Sparkles, Check } from 'lucide-react';

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
  const { data, isLoading } = useBillingPlan();
  const { open } = useUpgrade();

  if (isLoading || !data) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
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
        <div className="flex flex-col gap-4 bg-gradient-to-br from-primary/10 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
              <PlanIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="text-2xl font-bold">{data.plan_label || PLAN_LABEL[plan]}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold">${PLAN_PRICE[plan]}<span className="text-base font-medium text-muted-foreground">/mo</span></p>
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
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Usage</h3>
        <Card className="divide-y divide-border">
          {USAGE_ORDER.filter((k) => data.usage[k]).map((k) => {
            const u = data.usage[k];
            return (
              <div key={k} className="p-4">
                <QuotaMeter label={USAGE_LABEL[k] || k} used={u.used} limit={u.limit} feature={k} />
              </div>
            );
          })}
        </Card>
      </div>

      {/* Plans comparison */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Plans</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {(['free', 'premium', 'premium_plus'] as PlanId[]).map((p) => {
            const isCurrent = p === plan;
            return (
              <Card key={p} className={`flex flex-col p-4 ${isCurrent ? 'ring-1 ring-primary' : ''}`}>
                <p className="font-bold">{PLAN_LABEL[p]}</p>
                <p className="mt-1 text-2xl font-extrabold">${PLAN_PRICE[p]}<span className="text-sm font-medium text-muted-foreground">/mo</span></p>
                <ul className="mt-3 flex-1 space-y-1.5 text-xs text-muted-foreground">
                  {(data.plans?.[p]?.features || []).filter((f) => !['auto_apply', 'auto_submit', 'six_seconds', 'voice_graph'].includes(f)).slice(0, 6).map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 shrink-0 text-primary" />
                      <span>{f.replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" disabled className="mt-3">Current plan</Button>
                ) : (
                  <Button
                    variant={p === 'free' ? 'ghost' : 'default'}
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
