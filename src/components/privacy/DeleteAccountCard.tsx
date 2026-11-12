import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';

const CONFIRM_WORD = 'DELETE';

/**
 * Right to delete: the front end for the existing `DELETE /api/auth/account`
 * flow (soft delete at once, then an async purge of every user-keyed record,
 * stored file and connected-account token). Typing DELETE is the
 * confirmation, mirroring the `{confirm: "DELETE"}` the endpoint requires.
 */
export function DeleteAccountCard({ className }: { className?: string }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tolerate a pasted space or lower case: the intent is unmistakable either way.
  const ready = typed.trim().toUpperCase() === CONFIRM_WORD;

  const onDelete = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const res = await apiService.deleteAccount();
    setBusy(false);
    if (res.data?.deleted) {
      setOpen(false);
      logout();
      toast.success('Your account is being erased.', {
        description: 'You have been signed out. Erasing everything can take a few minutes.',
      });
      navigate('/', { replace: true });
      return;
    }
    if (res.status === 401) return; // The session ended; the app is already signing out.
    setError(res.error ? `We could not delete your account: ${res.error}` : 'We could not delete your account.');
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Delete your account</h3>
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          Erases your resumes and generated files, tailoring history, tracked applications, saved jobs, visa and
          work authorization details, saved employer logins and the tokens for anything you connected. This cannot
          be undone. Copies in encrypted backups expire within 30 days.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => {
          setTyped('');
          setError(null);
          setOpen(true);
        }}
      >
        <Trash2 aria-hidden className="h-4 w-4" />
        Delete account
      </Button>

      <AlertDialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <AlertDialogContent solid>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your Aspirely account?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out and everything in your account will be erased. Download your data first if
              you want a copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-account-confirm">Type {CONFIRM_WORD} to confirm</Label>
            <Input
              id="delete-account-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={busy}
              aria-describedby={error ? 'delete-account-error' : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && ready && !busy) {
                  e.preventDefault();
                  void onDelete();
                }
              }}
            />
            {error && (
              <p id="delete-account-error" className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={!ready || busy}
              onClick={() => void onDelete()}
            >
              {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
              {busy ? 'Deleting...' : 'Delete my account'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DeleteAccountCard;
