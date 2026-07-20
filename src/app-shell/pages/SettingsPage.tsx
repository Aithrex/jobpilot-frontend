import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Bell, CreditCard, Gauge, Loader2, Plane, PlugZap, UserCircle } from "lucide-react";
import { SubNav, type SubNavItem } from "../SubNav";

const SETTINGS_SECTIONS: SubNavItem[] = [
  { to: "profile", label: "Profile", icon: UserCircle },
  { to: "visa", label: "Visa Timeline", icon: Plane },
  { to: "integrations", label: "Integrations", icon: PlugZap },
  { to: "autonomy", label: "Autonomy", icon: Gauge },
  { to: "billing", label: "Billing", icon: CreditCard },
  { to: "notifications", label: "Notifications", icon: Bell },
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
 * "Settings" destination in the app shell (`/next/settings`). A consolidated
 * settings hub: a horizontal sub-nav over deep-linkable nested sections that
 * unify identity, the previously scattered integrations, the auto-apply
 * autonomy control, billing, and notifications. Sections are lazy-loaded via
 * the nested routes in App.tsx.
 */
export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="overline mb-1">Settings</p>
        <h1 className="text-title font-display text-foreground">
          Account &amp; preferences
        </h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Your identity, connected tools, autonomy, billing, and notifications,
          all in one place.
        </p>
      </header>

      <SubNav ariaLabel="Settings sections" items={SETTINGS_SECTIONS} />

      <Suspense fallback={<SectionFallback />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
