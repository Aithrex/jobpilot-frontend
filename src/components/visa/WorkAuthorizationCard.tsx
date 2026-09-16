/**
 * The settings home of the work-authorization question.
 *
 * Owns the hook; the question itself stays presentational so onboarding can
 * render the same control against its own draft state. A failed save is stated
 * plainly and the chosen value stays on screen - the alternative, silently
 * reverting the radio, teaches the user their choice did not register when in
 * fact we simply could not persist it.
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { WorkAuthorizationQuestion } from '@/components/visa/WorkAuthorizationQuestion';
import { useWorkAuthorization } from '@/hooks/useWorkAuthorization';
import type { WorkAuthorizationStatus } from '@/types/workAuthorization';

export function WorkAuthorizationCard({ className }: { className?: string }) {
  const { status, persisted, isLoading, isSaving, error, save } = useWorkAuthorization();
  const [draft, setDraft] = useState<WorkAuthorizationStatus>(status);
  const [dirty, setDirty] = useState(false);

  // Adopt the server's answer until the user touches the control. After that
  // the draft wins, so a background refetch cannot yank a selection away
  // mid-interaction.
  useEffect(() => {
    if (!dirty) setDraft(status);
  }, [status, dirty]);

  const onChange = async (next: WorkAuthorizationStatus) => {
    setDirty(true);
    setDraft(next);
    const landed = await save(next);
    if (landed) toast.success('Work authorization saved');
    else toast.error('We could not save that just now', { description: 'Try again in a moment.' });
  };

  return (
    <WorkAuthorizationQuestion
      className={className}
      value={isLoading ? 'unset' : draft}
      onChange={(next) => void onChange(next)}
      saving={isSaving}
      saved={persisted && !dirty ? true : persisted && draft === status}
      error={error}
    />
  );
}

export default WorkAuthorizationCard;
