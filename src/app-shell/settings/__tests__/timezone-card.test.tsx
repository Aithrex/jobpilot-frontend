import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import TimezoneCard from '@/app-shell/settings/TimezoneCard';
import { timeZoneOverride, viewerTimeZone } from '@/lib/viewerTimezone';

const ORIGINAL_TZ = process.env.TZ;
beforeEach(() => {
  localStorage.clear();
  process.env.TZ = 'America/Phoenix';
});
afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
  localStorage.clear();
});

describe('Settings time zone', () => {
  it('starts on Automatic, naming the zone detected from this device', () => {
    render(<TimezoneCard />);
    const select = screen.getByRole('combobox', { name: 'Time zone' }) as HTMLSelectElement;
    expect(select.value).toBe('__auto__');
    expect(select.selectedOptions[0].textContent).toContain('America/Phoenix');
    expect(screen.getByTestId('timezone-active')).toHaveTextContent('detected from this device');
  });

  it('pins a chosen zone and returns to Automatic', async () => {
    const user = userEvent.setup();
    render(<TimezoneCard />);
    const select = screen.getByRole('combobox', { name: 'Time zone' });
    await user.selectOptions(select, 'America/Chicago');
    expect(timeZoneOverride()).toBe('America/Chicago');
    expect(viewerTimeZone()).toBe('America/Chicago');
    expect(screen.getByTestId('timezone-active')).toHaveTextContent('until you choose Automatic');

    await user.selectOptions(select, '__auto__');
    expect(timeZoneOverride()).toBeNull();
    expect(viewerTimeZone()).toBe('America/Phoenix');
  });
});
