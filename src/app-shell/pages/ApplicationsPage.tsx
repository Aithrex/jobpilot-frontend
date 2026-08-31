import { Suspense, lazy, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SubNav } from '../SubNav';
import { APPLY_SECTIONS } from '../nav.config';
import { AnimatedOutlet } from '../AnimatedOutlet';

// Emailed approve/review links 302 into `/app/apply?approve=<token>`.
// Lazy so the confirmation surface only loads for users who arrive via a link.
const ApproveLinkConfirm = lazy(
  () => import('@/components/autoSubmit/ApproveLinkConfirm'),
);

/**
 * "Apply" destination (`/app/apply`): tracker, Auto-Apply, inbox, pipeline.
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
    <div className="page-full flex flex-col gap-6">
      <header>
        <p className="overline mb-1">Apply</p>
        <h1 className="text-title font-display text-foreground">Your applications</h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Track applications, run Auto-Apply, and read replies to your managed address.
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

      <SubNav ariaLabel="Applications sections" items={APPLY_SECTIONS} />

      <AnimatedOutlet scope="section" context={{ embedded: true }} />
    </div>
  );
}
