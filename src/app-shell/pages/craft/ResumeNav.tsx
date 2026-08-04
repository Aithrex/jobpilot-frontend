import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Check, ChevronDown, ChevronRight, CircleDashed, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  RESUME_GROUPS,
  RESUME_RAIL_LABELS,
  RESUME_SECTIONS,
  appPath,
  type NavSection,
} from "@/app-shell/nav.config";
import { resumeHealth, type ResumeWorkspaceData } from "./useResumeWorkspace";

/** A section paired with the label the dock should show for it. */
interface DockItem extends NavSection {
  dockLabel: string;
}

interface DockGroup {
  label: string;
  items: DockItem[];
}

/**
 * Resolve {@link RESUME_GROUPS} against {@link RESUME_SECTIONS}.
 *
 * Any section missing from the group map is appended to a trailing "More"
 * group rather than silently disappearing: adding a route to RESUME_SECTIONS
 * and forgetting to place it must never make the feature unreachable.
 */
function useDockGroups(): DockGroup[] {
  return useMemo(() => {
    const byTo = new Map(RESUME_SECTIONS.map((s) => [s.to, s]));
    const placed = new Set<string>();

    const groups: DockGroup[] = RESUME_GROUPS.map((group) => ({
      label: group.label,
      items: group.items.flatMap((to) => {
        const section = byTo.get(to);
        if (!section) return [];
        placed.add(to);
        return [{ ...section, dockLabel: RESUME_RAIL_LABELS[to] ?? section.label }];
      }),
    })).filter((g) => g.items.length > 0);

    const orphans = RESUME_SECTIONS.filter((s) => !placed.has(s.to)).map((s) => ({
      ...s,
      dockLabel: RESUME_RAIL_LABELS[s.to] ?? s.label,
    }));
    if (orphans.length > 0) groups.push({ label: "More", items: orphans });

    return groups;
  }, []);
}

/**
 * One navigable destination. The `.studio-nav-row` recipe carries the whole
 * affordance - full-width hit area, hover fill, and on the active row an
 * indigo tint plus a slim accent left indicator. The trailing chevron is what
 * separates "this navigates" from the dashboard content beside it.
 */
function DockLink({ item, onNavigate }: { item: DockItem; onNavigate?: () => void }) {
  const { to, dockLabel, hint, icon: Icon } = item;
  return (
    <NavLink
      to={appPath("resume", to)}
      end
      onClick={onNavigate}
      title={hint}
      className={cn(
        "studio-nav-row group outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors duration-fast ease-standard",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-left">{dockLabel}</span>
          <ChevronRight
            className={cn(
              "icon-advance h-3.5 w-3.5 shrink-0",
              isActive ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100",
            )}
            aria-hidden="true"
          />
        </>
      )}
    </NavLink>
  );
}

function DockGroups({ groups, onNavigate }: { groups: DockGroup[]; onNavigate?: () => void }) {
  return (
    <>
      {groups.map((group, index) => (
        <div
          key={group.label}
          className={cn(
            "space-y-1",
            // Hairline between groups rather than around each one - keeps the
            // dock scannable without drawing six boxes.
            index > 0 && "border-t border-border/70 pt-4",
          )}
        >
          <p className="overline px-3.5">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <DockLink item={item} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/**
 * Resume health - the quiet panel at the foot of the dock.
 *
 * Reports only checks that are verifiable from data already loaded (is there
 * an active resume, is it parsed, has anything been tailored). Deliberately
 * NOT a percentage: a score implies a rubric the frontend does not have, and
 * inventing one would be fabricated analytics. Rendered as static text with
 * one real link, so it is visually quieter than the navigation above it and
 * only the genuinely actionable part is clickable.
 */
function ResumeHealthPanel({ data }: { data: ResumeWorkspaceData }) {
  const { checks, ratio } = resumeHealth(data);

  return (
    <div className="space-y-2.5 border-t border-border/70 pt-4">
      <div className="flex items-baseline justify-between gap-2 px-3.5">
        <p className="overline">Resume health</p>
        {ratio && (
          <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
            {ratio.done}/{ratio.total}
          </span>
        )}
      </div>

      {/* Segmented bar - one segment per check, so the visual maps 1:1 onto
          the list below instead of implying a continuous score. */}
      {ratio && (
        <div className="flex gap-1 px-3.5" aria-hidden="true">
          {checks.map((check) => (
            <span
              key={check.label}
              className={cn(
                "h-1 flex-1 rounded-full",
                check.done ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      )}

      <ul className="space-y-1.5 px-3.5">
        {checks.map((check) => {
          const Icon = check.done ? Check : CircleDashed;
          return (
            <li key={check.label} className="flex items-start gap-2 text-caption">
              <Icon
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  check.done ? "text-primary" : "text-muted-foreground",
                )}
                aria-hidden="true"
              />
              <span className={check.done ? "text-muted-foreground" : "text-foreground"}>
                {check.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Contextual function dock for the Resume workspace.
 *
 * Replaces the horizontal sub-tab strip. Six terse labels in a second nav row
 * read as navigation inside navigation: it competed with the primary top bar
 * and had no room to say what any tool was for. The dock groups the same six
 * routes by intent (Create / Manage / Insights), has width for real names,
 * and states its navigability through row-level affordances - hit area,
 * hover fill, chevron - so it never reads like the content beside it.
 *
 * Desktop (>=lg): a sticky vertical dock.
 * Below lg: NOT a squeezed rail - a "Resume sections" trigger opening a sheet
 * with the identical grouped list, so a phone gets full-size targets and
 * Radix handles focus trapping and Escape.
 */
export function ResumeNav({ data }: { data: ResumeWorkspaceData }) {
  const groups = useDockGroups();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Label the mobile trigger with wherever you actually are, so the control
  // reports state instead of just offering a menu.
  const current = useMemo(() => {
    const all = groups.flatMap((g) => g.items);
    return all.find((item) => location.pathname.startsWith(appPath("resume", item.to)));
  }, [groups, location.pathname]);

  return (
    <>
      {/* Desktop dock - one frosted panel, so navigation reads as a distinct
          material from the solid content surfaces beside it. */}
      <nav
        aria-label="Resume sections"
        className="studio-panel sticky top-24 hidden w-[15rem] shrink-0 space-y-4 self-start p-3 lg:block"
      >
        <DockGroups groups={groups} />
        <ResumeHealthPanel data={data} />
      </nav>

      {/* Mobile / tablet trigger + sheet */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-h-[44px] w-full items-center gap-2 rounded-control border border-border bg-card px-3 text-left text-sm",
                "interactive interactive-press focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {current ? current.dockLabel : "Resume sections"}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="surface-studio max-h-[85vh] overflow-y-auto rounded-t-container border-border pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <SheetHeader className="text-left">
              <SheetTitle className="font-display text-h2 text-foreground">
                Resume sections
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <DockGroups groups={groups} onNavigate={() => setOpen(false)} />
              <ResumeHealthPanel data={data} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
