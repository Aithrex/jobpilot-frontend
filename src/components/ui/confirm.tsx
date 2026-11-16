/**
 * One confirmation dialog for the whole app, asked for with a function call.
 *
 *   if (!(await confirmAction({ title: 'Delete this contact?', ... }))) return;
 *
 * It replaces `window.confirm`, whose box is drawn by the browser: its own
 * font, the site's address as a heading, "OK" and "Cancel" whatever the
 * question was, and no way to say which button destroys something. This one
 * is the app's own dialog, names the action on its button, and marks a
 * destructive one.
 *
 * `ConfirmHost` is mounted once at the app root. Where there is no host (a
 * component rendered on its own, as in a unit test) the call falls back to the
 * browser's confirm, so behaviour is unchanged there.
 */
import { useCallback, useEffect, useState } from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConfirmOptions {
  /** The question, ending in a question mark. */
  title: string;
  /** What will happen, in a sentence. */
  description?: string;
  /** The action, as a verb ("Delete contact"). Never "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** The action cannot be undone: the confirm button is the destructive one. */
  destructive?: boolean;
}

type Ask = (options: ConfirmOptions) => Promise<boolean>;
let hostAsk: Ask | null = null;

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (hostAsk) return hostAsk(options);
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') return Promise.resolve(false);
  const text = options.description ? `${options.title} ${options.description}` : options.title;
  return Promise.resolve(!!window.confirm(text));
}

interface Pending {
  options: ConfirmOptions;
  resolve: (answer: boolean) => void;
}

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    const ask: Ask = (options) =>
      new Promise<boolean>((resolve) => {
        setPending((current) => {
          // A second question while one is open answers the first with "no".
          current?.resolve(false);
          return { options, resolve };
        });
      });
    hostAsk = ask;
    return () => {
      if (hostAsk === ask) hostAsk = null;
    };
  }, []);

  const answer = useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const options = pending?.options;

  return (
    <AlertDialogPrimitive.Root open={!!pending} onOpenChange={(open) => { if (!open) answer(false); }}>
      <AlertDialogPrimitive.Portal>
        {/* Above every other layer, including the full-screen resume editor. */}
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialogPrimitive.Content
          className={cn(
            'job-search-pop fixed left-1/2 top-1/2 z-[91] grid w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-border p-6 outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          <div className="space-y-2">
            <AlertDialogPrimitive.Title className="font-display text-h3 text-foreground">
              {options?.title}
            </AlertDialogPrimitive.Title>
            {options?.description ? (
              <AlertDialogPrimitive.Description className="text-sm leading-relaxed text-muted-foreground">
                {options.description}
              </AlertDialogPrimitive.Description>
            ) : (
              <AlertDialogPrimitive.Description className="sr-only">
                Confirm or cancel this action.
              </AlertDialogPrimitive.Description>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel asChild>
              <Button type="button" variant="outline" className="min-h-11">
                {options?.cancelLabel ?? 'Cancel'}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <Button
              type="button"
              variant={options?.destructive ? 'destructive' : 'default'}
              className="min-h-11"
              onClick={() => answer(true)}
            >
              {options?.confirmLabel ?? 'Confirm'}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
