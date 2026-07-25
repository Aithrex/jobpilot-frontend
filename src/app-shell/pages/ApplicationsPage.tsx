import { Suspense, lazy, useState } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { Inbox, LayoutList, Loader2 } from 'lucide-react';
import { SubNav, type SubNavItem } from '../SubNav';

// Emailed approve/review links 302 into `/next/applications?approve=<token>`.
// Lazy so the confirmation surface only loads for users who arrive via a link.
const ApproveLinkConfirm = lazy(
  () => import('@/components/autoSubmit/ApproveLinkConfirm'),
);

const APPLICATION_SECTIONS: SubNavItem[] = [
  { to: 'tracker', label: 'Tracker', icon: LayoutList },
  { to: 'inbox', label: 'Inbox', icon: Inbox },
];

function SectionFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center text-muted-foreground"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
    </div>
  );
}

/**
 * "Apply" destination in the app shell (`/next/applications`). A layout route: a
 * horizontal sub-nav over deep-linkable nested sections - the application
 * tracker and the managed-mailbox Inbox. Sections are lazy-loaded via the
 * nested routes in App.tsx.
 */
export default function ApplicationsPage() {
  // Capture the approve token on the FIRST render, before the index route's
  // redirect to `tracker` drops the query string. Lazy init reads searchParams
  // once; the value persists across that redirect (this layout stays mounted).
  const [searchParams] = useSearchParams();
  const [approveToken, setApproveToken] = useState<string | null>(() =>
    searchParams.get('approve'),
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="overline mb-1">Apply</p>
        <h1 className="text-title font-display text-foreground">Your applications</h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Track every application and read replies to your managed address.
        </p>
      </header>

      {approveToken && (
        <Suspense fallback={null}>
          <ApproveLinkConfirm
            token={approveToken}
            onDismiss={() => setApproveToken(null)}
          />
        </Suspense>
      )}

      <SubNav ariaLabel="Applications sections" items={APPLICATION_SECTIONS} />

      <Suspense fallback={<SectionFallback />}>
        {/* `embedded` tells the tracker tab the shell already renders the page
            header + SubNav, so it suppresses its own hero header. */}
        <Outlet context={{ embedded: true }} />
      </Suspense>
    </div>
  );
}
