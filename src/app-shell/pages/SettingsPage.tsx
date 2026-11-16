import { SubNav } from "../SubNav";
import { SETTINGS_SECTIONS } from "../nav.config";
import { AnimatedOutlet } from "../AnimatedOutlet";

/**
 * "Settings" destination in the app shell (`/app/settings`). A consolidated
 * settings hub: a horizontal sub-nav over deep-linkable nested sections that
 * unify identity, the previously scattered integrations, the auto-apply
 * autonomy control, billing, and notifications. Sections are lazy-loaded via
 * the nested routes in App.tsx.
 */
export default function SettingsPage() {
  return (
    <div className="page-measure flex flex-col gap-4">
      <header>
        <h1 className="text-title font-display text-foreground">Settings</h1>
      </header>

      <SubNav ariaLabel="Settings sections" items={SETTINGS_SECTIONS} />

      <AnimatedOutlet scope="section" />
    </div>
  );
}
