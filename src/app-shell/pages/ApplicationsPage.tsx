import { SubNav } from '../SubNav';
import { APPLY_SECTIONS } from '../nav.config';
import { AnimatedOutlet } from '../AnimatedOutlet';

/** Application tracking, email updates, and follow-ups. */
export default function ApplicationsPage() {
  return (
    <div className="page-full flex flex-col gap-6">
      <header>
        <p className="overline mb-1">Tracker</p>
        <h1 className="text-title font-display text-foreground">Application tracker</h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Keep roles, replies, interviews, and next steps together. Connect Gmail to match application updates.
        </p>
      </header>

      <SubNav ariaLabel="Applications sections" items={APPLY_SECTIONS} />

      <AnimatedOutlet scope="section" context={{ embedded: true }} />
    </div>
  );
}
