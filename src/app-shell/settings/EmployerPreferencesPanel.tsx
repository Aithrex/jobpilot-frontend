import { EmployerPreferencesForm } from '@/components/job-search/EmployerPreferencesControl';

/**
 * Settings > Employer types. The same server-owned choice the jobs refine bar
 * edits; this page only gives it room for the per-toggle explanations.
 */
export default function EmployerPreferencesPanel() {
  return (
    <div className="max-w-xl space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Employer types</h2>
        <p className="text-sm text-muted-foreground">
          Choose which kinds of employers your feeds, recommendations and alerts include. Aspirely
          applies this on the server, shows how many postings each choice hid, and never relaxes it
          to fill a page.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <EmployerPreferencesForm />
      </div>
      <p className="text-xs text-muted-foreground">
        "Employer type unverified" means we could not establish whether a company hires for itself
        or for clients. It is never counted as a direct employer.
      </p>
    </div>
  );
}
