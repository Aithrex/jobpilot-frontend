import { motion } from 'framer-motion';
import { FileSearch, ListChecks, Send, Sparkles, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DOCK_CAPABILITIES,
  STATUS_LABEL,
  isLive,
  type Capability,
  type CapabilityStatus,
} from '@/lib/capabilities';

/**
 * The capability dock that settles into the bottom of the workspace window.
 *
 * Design rules, all of them honesty rules first and aesthetics second:
 *  - Live capabilities are illuminated; upcoming ones are frosted and carry a
 *    visible text status badge. Status is NEVER communicated by colour or
 *    opacity alone.
 *  - No padlock iconography. A lock reads "pay to unlock"; none of these are
 *    paid, and the upgrade endpoint is a stub, so a lock would be doubly
 *    misleading.
 *  - Upcoming items are focusable buttons that reveal a description. They call
 *    no API, submit nothing, and claim no waitlist — the only real action
 *    offered anywhere is creating an account.
 */

const ICONS: Record<string, typeof FileSearch> = {
  match: FileSearch,
  tailor: Sparkles,
  track: ListChecks,
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
        live
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          : 'border-white/15 bg-white/[0.06] text-muted-foreground',
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function DockItem({
  cap,
  onPreview,
}: {
  cap: Capability;
  onPreview?: (cap: Capability) => void;
}) {
  const Icon = ICONS[cap.id] ?? Sparkles;
  const live = isLive(cap.status);

  return (
    <button
      type="button"
      // Upcoming items open a concept preview; live items are descriptive
      // only here (the real control is the workspace itself).
      onClick={onPreview && !live ? () => onPreview(cap) : undefined}
      aria-disabled={live || !onPreview ? true : undefined}
      title={cap.blurb}
      className={cn(
        'group flex min-h-[44px] items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        live
          ? 'border-white/[0.09] bg-white/[0.05]'
          : 'border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:border-white/15',
      )}
    >
      <Icon
        className={cn(
          'h-3.5 w-3.5 shrink-0',
          live ? 'text-[hsl(var(--brand-to))]' : 'text-muted-foreground/60',
        )}
        aria-hidden
      />
      <span
        className={cn(
          'whitespace-nowrap text-[11px] font-semibold',
          live ? 'text-foreground/85' : 'text-muted-foreground/80',
        )}
      >
        {/* The dock uses the short product noun; the full name lives in the
            roadmap section below. */}
        {cap.id === 'whatsapp' ? 'WhatsApp' : cap.name}
      </span>
      {!live && <StatusBadge status={cap.status} />}
    </button>
  );
}

export interface CapabilityDockProps {
  /** Reveal the dock (the cinematic has settled and no real work is running). */
  show: boolean;
  onPreview?: (cap: Capability) => void;
}

export function CapabilityDock({ show, onPreview }: CapabilityDockProps) {
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
        <span className="hidden shrink-0 pr-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/50 xl:inline">
          Coming next
        </span>
        {DOCK_CAPABILITIES.map((cap) => (
          <DockItem key={cap.id} cap={cap} onPreview={onPreview} />
        ))}
      </div>
    </motion.div>
  );
}
