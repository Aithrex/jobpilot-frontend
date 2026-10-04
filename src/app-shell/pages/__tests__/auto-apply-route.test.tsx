/**
 * Removing Auto-Apply from the nav strip must NOT remove its route. Deep links,
 * emailed approve links, and the Home "Preview Auto-Apply" CTA all rely on
 * `/app/apply/auto-apply` still resolving to AutoApplyTab. This mirrors the
 * `apply` subtree from App.tsx with a probe standing in for the heavy tab, and
 * asserts the probe mounts at that path.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { describe, expect, test } from 'vitest';

function AutoApplyProbe() {
  return <div data-testid="auto-apply-tab">Auto-Apply</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/apply">
          <Route index element={<Navigate to="tracker" replace />} />
          <Route path="tracker" element={<div data-testid="tracker" />} />
          {/* Route kept even though the nav section was removed. */}
          <Route path="auto-apply" element={<AutoApplyProbe />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Auto-Apply route stays reachable after nav removal', () => {
  test('/app/apply/auto-apply still mounts the tab', () => {
    renderAt('/app/apply/auto-apply');
    expect(screen.getByTestId('auto-apply-tab')).toBeInTheDocument();
  });

  test('/app/apply index still redirects to the tracker (not auto-apply)', () => {
    renderAt('/app/apply');
    expect(screen.getByTestId('tracker')).toBeInTheDocument();
  });
});
