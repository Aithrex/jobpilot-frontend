import { SubNav } from '../SubNav';
import { APPLY_SECTIONS } from '../nav.config';
import { AnimatedOutlet } from '../AnimatedOutlet';

/** Application tracking, email updates, and follow-ups. */
export default function ApplicationsPage() {
  return (
    <div className="page-full flex flex-col gap-4">
      <header>
        <h1 className="text-title font-display text-foreground">Application tracker</h1>
      </header>

      <SubNav ariaLabel="Applications sections" items={APPLY_SECTIONS} />

      <AnimatedOutlet scope="section" context={{ embedded: true }} />
    </div>
  );
}
