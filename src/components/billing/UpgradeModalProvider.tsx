import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Crown, Zap, Loader2 } from 'lucide-react';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PLAN_PRICE, type PlanId } from '@/lib/entitlements';
import { toast } from 'sonner';

interface OpenOpts {
  feature?: string;
  title?: string;
  description?: string;
  highlight?: PlanId;
}

interface UpgradeCtx {
  open: (opts?: OpenOpts) => void;
}

const Ctx = createContext<UpgradeCtx | undefined>(undefined);

const TIERS: { id: PlanId; name: string; icon: typeof Zap; tagline: string; bullets: string[] }[] = [
  {
    id: 'premium',
    name: 'Premium',
    icon: Zap,
    tagline: 'For an active, serious job hunt',
    bullets: [
      '30 tailored resumes / day',
      'Unlimited ATS scores & cover letters',
      'Batch tailoring (up to 10 at once)',
      'Interview Pattern Coach + trends',
      'Interview-fit analysis & salary percentiles',
      'Personalized events feed',
      'AI recruiter advisor',
      '5 active learning paths · 8 posts / mo',
    ],
  },
  {
    id: 'premium_plus',
    name: 'Premium+',
    icon: Crown,
    tagline: 'Everything, unlimited. The full edge',
    bullets: [
      'Unlimited tailoring, ATS, cover letters & answers',
      'Predictive interview coaching + targeted drills',
      'Curated & early-access events',
      'Advisor auto-actions',
      'Negotiation scripts',
      'Unlimited learning paths + capstones',
      'Unlimited posts + history',
    ],
  },
];

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const { refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [opts, setOpts] = useState<OpenOpts>({});
  const [pending, setPending] = useState<PlanId | null>(null);

  const open = useCallback((o?: OpenOpts) => {
    setOpts(o || {});
    setIsOpen(true);
  }, []);

  const choose = async (tier: PlanId) => {
    setPending(tier);
    const res = await apiService.upgradePlan(tier);
    setPending(null);
    if (res.error) {
      toast.error('Could not start upgrade', { description: res.error });
      return;
    }
    if (res.data?.checkout_url) {
      window.location.assign(res.data.checkout_url);
      return;
    }
    toast(res.data?.message || 'Billing is coming soon.', { icon: '✨' });
    setIsOpen(false);
    refreshProfile();
  };

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl overflow-hidden p-0 sm:rounded-2xl">
          <div className="bg-gradient-to-br from-primary/10 via-background to-background px-6 pt-6">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Upgrade</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              {opts.title || 'Unlock your full job-hunt edge'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {opts.description ||
                'Go beyond the free tier. More tailoring, deeper coaching, and the all-in-one tools that get you hired faster.'}
            </p>
          </div>

          <div className="grid gap-4 px-6 pb-6 pt-4 sm:grid-cols-2">
            {TIERS.map((tier, i) => {
              const Icon = tier.icon;
              const highlighted = opts.highlight ? opts.highlight === tier.id : tier.id === 'premium';
              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`relative flex flex-col rounded-xl border p-4 ${
                    highlighted ? 'border-primary ring-1 ring-primary/40 shadow-lg' : 'border-border'
                  }`}
                >
                  {highlighted && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                      Most popular
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-lg font-bold">{tier.name}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tier.tagline}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">${PLAN_PRICE[tier.id]}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  <ul className="mt-4 flex-1 space-y-2">
                    {tier.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-4 w-full"
                    variant={highlighted ? 'default' : 'outline'}
                    disabled={pending !== null}
                    onClick={() => choose(tier.id)}
                  >
                    {pending === tier.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    Choose {tier.name}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

export function useUpgrade(): UpgradeCtx {
  const ctx = useContext(Ctx);
  // Safe no-op fallback so components can call it even outside the provider.
  return ctx ?? { open: () => undefined };
}
