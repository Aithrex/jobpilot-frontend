/** Actual retired routes are covered in product-cleanup.test.tsx. */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import ApplicationsPage from '@/app-shell/pages/ApplicationsPage';

vi.mock('@/components/autoSubmit/ApproveLinkConfirm', () => ({
  default: () => <div>Submission approval dialog</div>,
}));

test('an old approval URL cannot open submission controls in the tracker layout', () => {
  render(
    <MemoryRouter initialEntries={['/app/apply?approve=old-token']}>
      <Routes><Route path="/app/apply" element={<ApplicationsPage />} /></Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Application tracker' })).toBeInTheDocument();
  expect(screen.queryByText('Submission approval dialog')).not.toBeInTheDocument();
  expect(screen.queryByText(/auto.apply/i)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Tracker' })).toBeInTheDocument();
});
