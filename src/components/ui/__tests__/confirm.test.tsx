/**
 * The app's one confirmation dialog, asked for with `confirmAction`.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ConfirmHost, confirmAction } from '@/components/ui/confirm';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('confirmAction', () => {
  test('asks in the app dialog, with the action named on its button', async () => {
    const user = userEvent.setup();
    render(<ConfirmHost />);

    const answer = confirmAction({
      title: 'Delete this contact?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete contact',
      destructive: true,
    });

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this contact?' });
    expect(dialog).toHaveTextContent('This cannot be undone.');
    // Never a bare "OK".
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete contact' }));

    await expect(answer).resolves.toBe(true);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  test('Cancel and Escape both answer no', async () => {
    const user = userEvent.setup();
    render(<ConfirmHost />);

    const first = confirmAction({ title: 'Discard your edits?', cancelLabel: 'Keep editing' });
    await user.click(await screen.findByRole('button', { name: 'Keep editing' }));
    await expect(first).resolves.toBe(false);

    const second = confirmAction({ title: 'Discard your edits?' });
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');
    await expect(second).resolves.toBe(false);
  });

  test('a second question answers the first with no instead of stacking', async () => {
    render(<ConfirmHost />);

    const first = confirmAction({ title: 'First?' });
    await screen.findByRole('alertdialog', { name: 'First?' });
    const second = confirmAction({ title: 'Second?' });

    await expect(first).resolves.toBe(false);
    expect(await screen.findByRole('alertdialog', { name: 'Second?' })).toBeInTheDocument();
    void second;
  });

  test("with no host mounted it falls back to the browser's confirm", async () => {
    const native = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await expect(confirmAction({ title: 'Clear this chat?', description: 'This cannot be undone.' })).resolves.toBe(true);
    expect(native).toHaveBeenCalledWith('Clear this chat? This cannot be undone.');
  });
});
