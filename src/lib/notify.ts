/**
 * Error toasts in one shape: a short title that says what did not happen
 * ("Couldn't save your profile"), and under it the reason and the next step.
 *
 * Use this instead of `toast.error(resp.error)`: a raw server message as the
 * whole toast says something failed without saying what the user was doing.
 */
import { toast } from 'sonner';
import { userFacingError } from '@/lib/errorCopy';

export function notifyError(title: string, reason?: unknown, status?: number): void {
  const text = reason === undefined || reason === null || reason === '' ? '' : userFacingError(reason, status);
  // Never repeat the title as its own explanation.
  const description = text && text.toLowerCase() !== title.toLowerCase() ? text : undefined;
  toast.error(title, description ? { description } : undefined);
}
