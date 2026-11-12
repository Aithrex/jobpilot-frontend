/**
 * SubscriptionTerms once a price IS published: the auto-renewal disclosure
 * states the price and interval from pricing.ts, that the plan renews until
 * canceled, that cancellation is online in Settings with access through the
 * paid period, and that Free needs no card. A plan with no price still gets
 * nothing. pricing.ts is mocked here because the real file publishes no price.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';

import { SubscriptionTerms } from '@/components/legal/SubscriptionTerms';

vi.mock('@/lib/pricing', () => ({
  PRICING_PUBLISHED: true,
  PRICE_TODO: {
    free: null,
    premium: { usd: { monthly: 12, annual: 99.5 }, inr: { monthly: null, annual: null } },
    premium_plus: null,
  },
}));

describe('SubscriptionTerms with a published price', () => {
  test('states price, interval, renewal and online cancellation', () => {
    render(
      <MemoryRouter>
        <SubscriptionTerms planId="premium" />
        <SubscriptionTerms planId="premium_plus" />
        <SubscriptionTerms planId="free" />
      </MemoryRouter>,
    );
    const text = screen.getByTestId('subscription-terms-premium').textContent ?? '';
    expect(text).toContain('$12 a month or $99.50 a year');
    expect(text).toContain('renews automatically until you cancel');
    expect(text).toContain('Cancel online at any time in Settings, under Billing');
    expect(text).toContain('you keep access through the end of the period you paid for');
    expect(text).toContain('The Free plan needs no card');
    expect(screen.getByRole('link', { name: 'subscription terms' })).toHaveAttribute('href', '/terms#plans');
    expect(screen.queryByTestId('subscription-terms-premium_plus')).toBeNull();
    expect(screen.queryByTestId('subscription-terms-free')).toBeNull();
  });
});
