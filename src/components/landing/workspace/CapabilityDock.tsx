import { motion } from 'framer-motion';
import { Send, Sparkles, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DOCK_CAPABILITIES,
  STATUS_LABEL,
  isLive,
  type Capability,
  type CapabilityStatus,
} from '@/lib/capabilities';

/**
 * The "Coming next" dock that settles into the bottom of the workspace window.
 *
 * Design rules, all of them honesty rules first and aesthetics second:
 *  - It shows ONLY upcoming capabilities. The shipped ones are already
 *  illustrated in the workspace above, so restating them here under a "Coming
 *  next" label was redundant and read as untrue. Every chip is frosted and
 *  carries a visible text status badge - status is NEVER colour/opacity alone.
 *  - The chips are inert. They are not buttons and they navigate nowhere: a
 *  small chrome pill that silently scrolled the whole page felt broken. The
 *  full description of each item lives in the roadmap section below; the only
 *  real action offered anywhere is creating an account.
 *  - No padlock iconography. A lock reads "pay to unlock"; none of these are
 *  paid, and the upgrade endpoint is a stub, so a lock would be doubly
 *  misleading.
 */

const ICONS: Record<string, typeof Send> = {
  'auto-apply': Send,
  whatsapp: MessageCircle,
};

export function StatusBadge({
  status,
  className,
}: {
  status: CapabilityStatus;
  className?: string;
}) {
  const live = isLive(status);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-1.5 py-[1px] text-[9px] font-semibold leading-none tracking-[0.02em]',
        // Token-driven, so the same badge is legible on the obsidian product
        // dock AND on the pearl editorial surface. `success` is reserved for
        // "this genuinely works today" and used nowhere decorative.
        live
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-border bg-muted text-muted-foreground',
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/** An inert, frosted chip. Not a button; it navigates nowhere. Its full
 *  description lives in the roadmap section below the workspace. */
function DockItem({ cap }: { cap: Capability }) {
  const Icon = ICONS[cap.id] ?? Sparkles;

  return (
    <span
      title={cap.blurb}
      className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 backdrop-blur-sm"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
      <span className="whitespace-nowrap text-[11px] font-semibold text-muted-foreground/80">
        {/* The dock uses the short product noun; the full name lives in the
  roadmap section below. */}
        {cap.id === 'whatsapp' ? 'WhatsApp' : cap.name}
      </span>
      <StatusBadge status={cap.status} />
    </span>
  );
}

export interface CapabilityDockProps {
  /** Reveal the dock (the cinematic has settled and no real work is running). */
  show: boolean;
}

export function CapabilityDock({ show }: CapabilityDockProps) {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 border-t border-white/[0.07] bg-white/[0.03] px-3 py-2 backdrop-blur-xl"
    >
      {/* Wraps rather than scrolls: a clipped capability with its status badge
  cut off is exactly the ambiguity this dock exists to prevent. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="shrink-0 pr-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/50">
          Coming next
        </span>
        {DOCK_CAPABILITIES.map((cap) => (
          <DockItem key={cap.id} cap={cap} />
        ))}
      </div>
    </motion.div>
  );
}
