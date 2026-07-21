import { forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends React.ComponentProps<'input'> {
  /** Surface a "Caps Lock is on" hint when the modifier is detected. */
  capsLockWarning?: boolean;
}

/**
 * Password field with an accessible show/hide toggle and optional Caps Lock
 * hint. Composes the shadcn `Input` primitive so it inherits token-driven
 * focus/border styling and works in both themes.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, capsLockWarning = false, onKeyDown, onKeyUp, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const [caps, setCaps] = useState(false);

    const detectCaps = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (capsLockWarning) setCaps(e.getModifierState('CapsLock'));
    };

    return (
      <div className="space-y-1.5">
        <div className="relative">
          <Input
            ref={ref}
            type={visible ? 'text' : 'password'}
            className={cn('pr-11', className)}
            onKeyDown={(e) => {
              detectCaps(e);
              onKeyDown?.(e);
            }}
            onKeyUp={(e) => {
              detectCaps(e);
              onKeyUp?.(e);
            }}
            {...props}
          />
          {/* Keyboard-reachable by design - never tabIndex={-1}: sighted
              keyboard users need the same reveal affordance pointer users get. */}
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {capsLockWarning && caps && (
          <p className="inline-flex items-center gap-1.5 text-xs text-warning" role="status">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Caps Lock is on
          </p>
        )}
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
