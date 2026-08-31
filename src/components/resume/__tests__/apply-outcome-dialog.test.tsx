import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import ApplyOutcomeDialog from '@/components/resume/ApplyOutcomeDialog';
import { appliedDayOf, civilDayToInstant, formatCivilDay } from '@/lib/applicationDates';

function renderDialog(onSubmit = vi.fn(), onDismiss = vi.fn()) {
  render(
    <ApplyOutcomeDialog
      open
      jobTitle="Platform Engineer"
      company="Acme"
      onSubmit={onSubmit}
      onDismiss={onDismiss}
    />,
  );
  return { onSubmit, onDismiss };
}

describe('ApplyOutcomeDialog', () => {
  test('marks the record applied with an instant for today', async () => {
    const { onSubmit } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: /yes, i applied/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const outcome = onSubmit.mock.calls[0][0];
    expect(outcome.status).toBe('applied');
    expect(outcome.applied_at).toBeTruthy();
  });

  test('save for later moves it to saved without an applied date', async () => {
    const { onSubmit } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: /save for later/i }));

    expect(onSubmit).toHaveBeenCalledWith({ status: 'saved' });
  });

  test('not yet leaves the record in draft', async () => {
    const { onSubmit } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: /not yet/i }));

    expect(onSubmit).toHaveBeenCalledWith({ status: 'draft' });
  });

  test('back-dating sends the picked day and the posting link', async () => {
    const { onSubmit } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: /applied on another day/i }));

    const date = screen.getByLabelText(/date applied/i);
    await userEvent.clear(date);
    await userEvent.type(date, '2026-08-20');
    await userEvent.type(screen.getByLabelText(/job posting link/i), 'https://jobright.ai/x');
    await userEvent.click(screen.getByRole('button', { name: /save to tracker/i }));

    const outcome = onSubmit.mock.calls[0][0];
    expect(outcome.status).toBe('applied');
    expect(outcome.job_url).toBe('https://jobright.ai/x');
    // The picked civil day must survive the round-trip through the instant.
    expect(appliedDayOf({ applied_at: outcome.applied_at })).toBe('2026-08-20');
  });
});

describe('civil day handling', () => {
  test('a back-dated day survives being anchored as an instant', () => {
    // Noon-local anchoring is what keeps this stable; a midnight anchor would
    // slide to the 19th for anyone west of the storage zone.
    expect(appliedDayOf({ applied_at: civilDayToInstant('2026-08-20') }))
      .toBe('2026-08-20');
  });

  test('the stored day wins over the instant, so travel cannot move it', () => {
    // 03:00Z on Aug 30 is Aug 29 evening in Los Angeles. The frozen label says
    // so regardless of where the viewer currently is.
    expect(appliedDayOf({
      applied_date: '2026-08-29',
      applied_at: '2026-08-30T03:00:00Z',
    })).toBe('2026-08-29');
  });

  test('a zone-less backend timestamp is read as UTC, not local', () => {
    // The backend serializes naive UTC with no trailing Z. Reading it as local
    // time is what shifted evening applications into the next day.
    const withZone = appliedDayOf({ applied_at: '2026-08-30T03:00:00Z' });
    const withoutZone = appliedDayOf({ applied_at: '2026-08-30T03:00:00' });
    expect(withoutZone).toBe(withZone);
  });

  test('records with no applied date report none', () => {
    expect(appliedDayOf({})).toBeNull();
    expect(appliedDayOf(null)).toBeNull();
  });

  test('formatting a civil day does not shift it', () => {
    expect(formatCivilDay('2026-08-29')).toBe('Aug 29');
  });
});
