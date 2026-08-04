import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Briefcase, Flame, LayoutDashboard, Loader2, Map, PartyPopper, Rocket, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useHubJourney, useHubPath } from "@/hooks/useHub";
import Timeline from "./Timeline";
import TicketView from "./TicketView";
import XpLevelBar from "./XpLevelBar";
import AchievementReveal from "./AchievementReveal";
import AnalyticsPanel from "./AnalyticsPanel";
import AdminRoleSwitcher from "./AdminRoleSwitcher";
import JourneyMap from "./JourneyMap";
import { cn } from "@/lib/utils";
import type { HubAchievement, HubDay, HubPath, HubPathParams } from "@/types/hub";

function GeneratingState({ days }: { days: number }) {
  return (
    <div className="space-y-6">
      <div className="glass-card animate-[pulse-glow_2.4s_ease-in-out_infinite] rounded-2xl border border-border p-6 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </span>
        <h3 className="text-lg font-bold gradient-text">Assembling your sprint board…</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Your engineering manager is writing {days} days of realistic tickets tailored to your role.
          This takes up to a minute the first time — then it&apos;s instant.
        </p>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 pl-12">
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Placeholder for {@link JourneyMap}, built from the SAME structure it stands
 * in for: the "Your journey" header row, the spine, and one node dot + chapter
 * card per row.
 *
 * The previous version was three bare rounded blocks in a plain stack. It read
 * as a different screen from the one that replaced it - no spine, no dots, no
 * header - so the layout visibly reassembled itself when the data landed.
 * Reusing the real wrapper classes (`flex gap-3`, `h-9 w-9` dot, `flex-1`
 * card) means the placeholder occupies the same geometry by construction
 * rather than by a hand-tuned height that drifts the moment a card changes.
 */
function JourneyMapSkeleton() {
  return (
    <div role="status" aria-label="Loading your journey">
      <div className="mb-3 flex items-baseline justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>

      <div className="relative">
        {/* Same spine geometry as the real map, so it does not appear later. */}
        <div aria-hidden className="pointer-events-none absolute bottom-6 left-[18px] top-3 w-0.5 bg-border" />

        <ul className="relative space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="relative flex gap-3">
              <div
                aria-hidden
                className="z-10 mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-border bg-muted"
              />
              <div data-hub-skeleton-card className="flex-1 rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="mt-2 h-5 w-2/3" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1.5 h-3 w-5/6" />
                <Skeleton className="mt-3 h-3 w-16" />
                <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
              </div>
            </li>
          ))}
        </ul>

        <div className="relative mt-1 flex items-center gap-3 pl-[7px]">
          <span aria-hidden className="h-6 w-6 rounded-full border border-dashed border-border" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    </div>
  );
}

function FutureUpdateBanner({ path }: { path: HubPath }) {
  // Only shown while the curriculum is partially released.
  if (path.published_through_day >= path.season_length) return null;

  const publishedDays = path.days.filter((d) => d.published);
  const allDone = publishedDays.length > 0 && publishedDays.every((d) => d.state === "completed");
  const nextDay = path.published_through_day + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 flex items-start gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/[0.04] p-4"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
        {allDone ? <PartyPopper className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
      </span>
      <div className="min-w-0">
        {allDone ? (
          <>
            <p className="text-sm font-semibold text-foreground">Day {path.published_through_day} complete — nicely done!</p>
            <p className="text-sm text-muted-foreground">
              Day {nextDay} will be available in a future update. You&apos;re all caught up on what&apos;s live today.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">Version 1 · Day {path.published_through_day} is live</p>
            <p className="text-sm text-muted-foreground">
              Days {nextDay}–{path.season_length} are under development and will unlock in future updates. Complete Day{" "}
              {path.published_through_day} to experience the full sprint flow.
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function LearningHubTab() {
  const { user } = useAuth();
  const isAdmin = !!(user as { isAdmin?: boolean } | null)?.isAdmin;

  const [override, setOverride] = useState<HubPathParams | null>(null);
  const adminParams = isAdmin && override ? override : undefined;

  const { data: journey } = useHubJourney(adminParams);

  // Views: the campaign roadmap, one chapter's timeline, or a single ticket page.
  const [view, setView] = useState<"roadmap" | "chapter" | "ticket">("roadmap");
  const [selectedSeason, setSelectedSeason] = useState<string | undefined>(undefined);
  const enterChapter = (seasonId: string) => {
    setSelectedSeason(seasonId);
    setView("chapter");
  };

  const params: HubPathParams | undefined = useMemo(() => {
    const base: HubPathParams = { ...(adminParams || {}) };
    if (selectedSeason) base.season_id = selectedSeason;
    return Object.keys(base).length ? base : undefined;
  }, [adminParams, selectedSeason]);

  // Only fetch a chapter's path once the user drills into it — the roadmap never
  // kicks generation.
  // Keep the path loaded while viewing either the timeline or a ticket.
  const inChapter = view !== "roadmap" && !!selectedSeason;
  const { data: path, isLoading, isError, refetch } = useHubPath(params, inChapter);

  const [openDay, setOpenDay] = useState<HubDay | null>(null);
  const [reward, setReward] = useState<{ achievement: HubAchievement | null; xpGained: number; leveledUp: boolean } | null>(null);

  const openDayDetail = (day: HubDay) => {
    setOpenDay(day);
    setView("ticket");
  };
  // Re-resolve the open day against the freshest path so its state/ticket update
  // after a submit (e.g. current → completed).
  const activeDay = openDay ? path?.days?.find((d) => d.key === openDay.key) ?? openDay : null;

  const selectedSummary = journey?.seasons?.find((s) => s.season_id === selectedSeason);
  const nextChapter = useMemo(() => {
    if (!journey?.seasons || !selectedSummary) return undefined;
    return journey.seasons
      .filter((s) => s.order > selectedSummary.order && s.state !== "locked" && s.state !== "coming_soon")
      .sort((a, b) => a.order - b.order)[0];
  }, [journey, selectedSummary]);
  const chapterComplete = selectedSummary?.state === "completed";

  return (
    // `w-full` is load-bearing, not decoration. GrowPage renders this inside a
    // `flex flex-col`, and an auto cross-axis margin (`mx-auto`) overrides the
    // default `align-items: stretch` - so without an explicit width the box is
    // sized by its CONTENT. That made the column ~269px while the skeleton was
    // up and 768px once the chapter cards arrived, jumping the heading 254px
    // sideways the moment loading finished.
    <div className={cn("space-y-6 pb-16", view === "roadmap" ? "mx-auto w-full max-w-3xl" : "w-full")}>
      {view === "roadmap" ? (
        /* ─── Campaign roadmap ─── */
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
                <Briefcase className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground">Learning Hub</h1>
                <p className="text-xs text-muted-foreground">Your story-driven engineering journey</p>
              </div>
            </div>
          </div>

          {isAdmin && <AdminRoleSwitcher override={override} onChange={setOverride} />}

          {journey ? (
            <JourneyMap journey={journey} onSelect={enterChapter} />
          ) : (
            <JourneyMapSkeleton />
          )}
        </>
      ) : view === "ticket" && activeDay && activeDay.ticket ? (
        /* ─── Full-screen ticket page ─── */
        <TicketView
          day={activeDay}
          params={params}
          onBack={() => setView("chapter")}
          onCompleted={(result) => {
            setReward({
              achievement: result.achievement_unlocked ?? null,
              xpGained: result.xp_gained ?? 0,
              leveledUp: !!result.leveled_up,
            });
            window.setTimeout(() => setReward((r) => (r ? { ...r, xpGained: 0, leveledUp: false } : r)), 1400);
          }}
        />
      ) : (
        /* ─── Single chapter board ─── */
        <>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => setView("roadmap")}>
                  <ArrowLeft className="h-4 w-4" /> Journey
                </Button>
                <div>
                  <h1 className="text-lg font-extrabold tracking-tight text-foreground">
                    {path?.season_title ?? selectedSummary?.title ?? "Chapter"}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {path?.season_length ?? selectedSummary?.length_days ?? 0} days
                  </p>
                </div>
              </div>
              {path ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 border-primary/25 text-primary">
                    <Sparkles className="h-3 w-3" /> {path.career_path}
                  </Badge>
                  <Badge variant="outline">{path.difficulty_label}</Badge>
                  {path.current_streak > 0 && (
                    <Badge variant="outline" className="gap-1 border-[hsl(var(--warning))]/30 text-[hsl(var(--warning))]">
                      <Flame className="h-3 w-3" /> {path.current_streak}d
                    </Badge>
                  )}
                </div>
              ) : null}
            </div>

            {path ? (
              <div className="rounded-xl border border-border bg-card p-4">
                <XpLevelBar
                  xp={path.xp}
                  level={path.level}
                  nextLevelXp={path.next_level_xp}
                  xpGained={reward?.xpGained}
                  leveledUp={reward?.leveledUp}
                />
              </div>
            ) : null}
          </div>

          {/* Chapter complete → continue to the next one. */}
          {chapterComplete && nextChapter && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/[0.06] p-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]">
                <PartyPopper className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {selectedSummary?.title} complete — outstanding work!
                </p>
                <p className="text-sm text-muted-foreground">Your next chapter, {nextChapter.title}, is unlocked.</p>
              </div>
              <Button className="btn-premium gap-1.5" onClick={() => enterChapter(nextChapter.season_id)}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Body */}
          {isLoading ? (
            <GeneratingState days={selectedSummary?.length_days ?? 14} />
          ) : isError ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">We couldn&apos;t load this chapter just now.</p>
              <button onClick={() => refetch()} className="mt-2 text-sm font-medium text-primary hover:underline">
                Try again
              </button>
            </div>
          ) : !path || path.days.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No sprint yet. It&apos;ll generate automatically from your profile.
            </div>
          ) : (
            <Tabs defaultValue="journey" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="journey" className="gap-1.5">
                  <Map className="h-4 w-4" /> Journey
                </TabsTrigger>
                <TabsTrigger value="progress" className="gap-1.5">
                  <LayoutDashboard className="h-4 w-4" /> Progress
                </TabsTrigger>
              </TabsList>

              <TabsContent value="journey">
                <FutureUpdateBanner path={path} />
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Timeline days={path.days} onOpenDay={openDayDetail} onExpire={() => refetch()} />
                </motion.div>
              </TabsContent>

              <TabsContent value="progress">
                <AnalyticsPanel params={params} />
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      <AchievementReveal
        achievement={reward?.achievement ?? null}
        onDismiss={() => setReward((r) => (r ? { ...r, achievement: null } : r))}
      />
    </div>
  );
}
