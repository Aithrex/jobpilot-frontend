import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Flame, LayoutDashboard, Loader2, Map, PartyPopper, Rocket, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useHubPath } from "@/hooks/useHub";
import Timeline from "./Timeline";
import TicketDetail from "./TicketDetail";
import XpLevelBar from "./XpLevelBar";
import AchievementReveal from "./AchievementReveal";
import AnalyticsPanel from "./AnalyticsPanel";
import AdminRoleSwitcher from "./AdminRoleSwitcher";
import type { HubAchievement, HubDay, HubPathParams } from "@/types/hub";

function GeneratingState() {
  return (
    <div className="space-y-6">
      <div className="glass-card animate-[pulse-glow_2.4s_ease-in-out_infinite] rounded-2xl border border-border p-6 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </span>
        <h3 className="text-lg font-bold gradient-text">Assembling your sprint board…</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Your engineering manager is writing 14 days of realistic tickets tailored to your role. This
          takes up to a minute the first time — then it&apos;s instant.
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
  const params = isAdmin && override ? override : undefined;

  const { data: path, isLoading, isError, refetch } = useHubPath(params);

  const [openDay, setOpenDay] = useState<HubDay | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reward, setReward] = useState<{ achievement: HubAchievement | null; xpGained: number; leveledUp: boolean } | null>(null);

  const openDayDetail = (day: HubDay) => {
    setOpenDay(day);
    setDetailOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
                <Briefcase className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground">Learning Hub</h1>
                <p className="text-xs text-muted-foreground">Your 14-day engineering sprint</p>
              </div>
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

        {isAdmin && <AdminRoleSwitcher override={override} onChange={setOverride} />}

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

      {/* Body */}
      {isLoading ? (
        <GeneratingState />
      ) : isError ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">We couldn&apos;t load your sprint just now.</p>
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

      <TicketDetail
        day={openDay}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        params={params}
        onCompleted={(result) => {
          setReward({
            achievement: result.achievement_unlocked ?? null,
            xpGained: result.xp_gained ?? 0,
            leveledUp: !!result.leveled_up,
          });
          // Clear the transient XP-gain badge after it plays.
          window.setTimeout(() => setReward((r) => (r ? { ...r, xpGained: 0, leveledUp: false } : r)), 1400);
        }}
      />

      <AchievementReveal
        achievement={reward?.achievement ?? null}
        onDismiss={() => setReward((r) => (r ? { ...r, achievement: null } : r))}
      />
    </div>
  );
}
