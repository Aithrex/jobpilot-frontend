import { SubNav } from "../SubNav";
import { GROW_SECTIONS } from "../nav.config";
import { AnimatedOutlet } from "../AnimatedOutlet";

/**
 * "Grow" destination in the app shell (`/app/grow`). A layout route: a
 * horizontal sub-nav over deep-linkable nested sections, each mounting an
 * existing standalone tab component from the monolith. Sections are lazy-loaded
 * via the nested routes in App.tsx.
 */
export default function GrowPage() {
  return (
    <div className="page-measure flex flex-col gap-4">
      <header>
        <h1 className="text-title font-display text-foreground">Grow</h1>
      </header>

      <SubNav ariaLabel="Grow sections" items={GROW_SECTIONS} />

      <AnimatedOutlet scope="section" context={{ embedded: true }} />
    </div>
  );
}
