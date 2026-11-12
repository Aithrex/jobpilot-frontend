import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/api';
import { PRIVACY_EMAIL } from '@/lib/legal';
import { formatRetryAfter, saveBlob } from './privacyFormat';

/**
 * Data portability: downloads every user-owned record as one JSON file,
 * named by the server. A 429 states when the next export is allowed; a 404
 * (backend not deployed yet) points to the email route instead.
 */
export function ExportDataButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onExport = async () => {
    setBusy(true);
    setMessage(null);
    const res = await apiService.exportAccountData();
    setBusy(false);
    if (res.data) {
      saveBlob(res.data, res.filename || 'aspirely-data-export.json');
      toast.success('Your data export is downloading.');
      return;
    }
    if (res.status === 429) {
      const when = res.retryAfter ? formatRetryAfter(res.retryAfter) : 'tomorrow';
      setMessage(`You have reached the limit of 5 exports a day. You can export again ${when}.`);
      return;
    }
    if (res.status === 404) {
      setMessage(
        `Self-service export is not available yet. Email ${PRIVACY_EMAIL} and we will send you a copy of your data.`,
      );
      return;
    }
    // A 401 already signed the session out and sent the person to sign in.
    if (res.status === 401) return;
    setMessage(
      res.error ? `We could not create your export: ${res.error}` : 'We could not create your export.',
    );
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={() => void onExport()} disabled={busy}>
        {busy ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <Download aria-hidden className="h-4 w-4" />
        )}
        {busy ? 'Preparing your export...' : 'Download my data'}
      </Button>
      <p className="min-h-4 text-xs text-muted-foreground" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}

export default ExportDataButton;
