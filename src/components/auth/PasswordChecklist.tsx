import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordRules {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  special: boolean;
}

/** Mirror of the backend password policy so users get instant, honest feedback. */
export function checkPasswordRules(pw: string): PasswordRules {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
    special: /[!@#$%^&*(),.?":{}|<>[\]\\/_+=~`';-]/.test(pw),
  };
}

export function isPasswordValid(pw: string): boolean {
  const r = checkPasswordRules(pw);
  return r.length && r.upper && r.lower && r.digit && r.special;
}

const LABELS: { key: keyof PasswordRules; label: string }[] = [
  { key: 'length', label: '8+ characters' },
  { key: 'upper', label: 'Uppercase letter' },
  { key: 'lower', label: 'Lowercase letter' },
  { key: 'digit', label: 'Number' },
  { key: 'special', label: 'Symbol' },
];

/**
 * Live password-requirement checklist. State is conveyed by both an icon and
 * text (never colour alone), and announced politely for assistive tech.
 */
export function PasswordChecklist({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  const rules = checkPasswordRules(password);
  return (
    <ul
      className={cn('grid grid-cols-2 gap-x-3 gap-y-1.5', className)}
      aria-label="Password requirements"
    >
      {LABELS.map(({ key, label }) => {
        const ok = rules[key];
        return (
          <li
            key={key}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              ok ? 'text-success' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                ok ? 'border-success/40 bg-success/10' : 'border-border',
              )}
              aria-hidden
            >
              {ok ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : (
                <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
              )}
            </span>
            <span className="sr-only">{ok ? 'Met: ' : 'Not met: '}</span>
            {label}
          </li>
        );
      })}
    </ul>
  );
}
