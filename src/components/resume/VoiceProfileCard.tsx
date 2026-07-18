import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { PenLine } from "lucide-react";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { VoiceProfile } from "@/types/voicegraph";

const VOICE_KEY = ["voice-graph", "voice"] as const;

/** How many "words you never use" to surface — enough to be recognizable, not a wall. */
const MAX_ANTI_PATTERNS = 6;
/** How many distinctive verbs to show as chips. */
const MAX_VERBS = 12;

export default function VoiceProfileCard() {
  const reduce = useReducedMotion();

  const query = useQuery({
    queryKey: VOICE_KEY,
    retry: false,
    queryFn: async (): Promise<VoiceProfile | null> => {
      const res = await apiService.voiceGraphVoice();
      // 404 = feature flag off → treat as "unavailable", not an error.
      if (res.status === 404) return null;
      if (res.error) throw new Error(res.error);
      return res.data ?? null;
    },
  });

  return (
    <section aria-labelledby="voice-profile-heading">
      <SectionHeading
        id="voice-profile-heading"
        eyebrow="Your voice"
        title="Here is how you write."
      />

      {query.isLoading ? (
        <ProfileSkeleton />
      ) : query.isError ? (
        <ErrorNote onRetry={() => query.refetch()} />
      ) : query.data == null ? (
        <EmptyNote onRefresh={() => query.refetch()} />
      ) : query.data.insufficient ? (
        <InsufficientCard profile={query.data} />
      ) : (
        <ReadyCard profile={query.data} reduce={!!reduce} />
      )}
    </section>
  );
}

/* ─────────────────────────── Ready state (the hero) ─────────────────────────── */

function ReadyCard({
  profile,
  reduce,
}: {
  profile: Extract<VoiceProfile, { insufficient?: false }>;
  reduce: boolean;
}) {
  const verbs = useMemo(
    () =>
      [...(profile.verb_inventory ?? [])]
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_VERBS),
    [profile.verb_inventory],
  );

  const antiPatterns = (profile.anti_patterns ?? []).slice(0, MAX_ANTI_PATTERNS);
  const description = profile.description ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-8 sm:px-10 sm:py-12">
        {/* The hero — plain-English sentences, editorial, screenshot-worthy. */}
        {description.length > 0 ? (
          <div className="mx-auto max-w-2xl space-y-4">
            {description.map((line, i) => (
              <motion.p
                key={i}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.08 }}
                className="font-serif text-xl leading-relaxed text-foreground sm:text-2xl sm:leading-relaxed"
              >
                {line}
              </motion.p>
            ))}
          </div>
        ) : (
          <p className="mx-auto max-w-2xl font-serif text-xl leading-relaxed text-muted-foreground">
            We&apos;re still finding the words for how you write. Keep going and
            this fills in.
          </p>
        )}
      </div>

      {(verbs.length > 0 || antiPatterns.length > 0) && (
        <div className="space-y-6 border-t border-border/60 px-6 py-6 sm:px-10">
          {verbs.length > 0 && (
            <div>
              <p className="overline mb-3">Verbs you reach for</p>
              <ul className="flex flex-wrap gap-2">
                {verbs.map((v) => (
                  <li
                    key={v.verb}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-sm font-medium text-foreground"
                  >
                    {v.verb}
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {v.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {antiPatterns.length > 0 && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Words you never use:{" "}
              <span className="text-foreground">{antiPatterns.join(", ")}</span>.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

/* ─────────────────────────── Insufficient state ─────────────────────────── */

function InsufficientCard({
  profile,
}: {
  profile: Extract<VoiceProfile, { insufficient: true }>;
}) {
  const needed = Math.max(1, profile.needed || 0);
  const have = Math.max(0, profile.word_count || 0);
  const pct = Math.min(100, Math.round((have / needed) * 100));
  const remaining = Math.max(0, needed - have);

  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <PenLine className="h-5 w-5" />
      </div>
      <p className="max-w-prose text-base leading-relaxed text-foreground">
        {profile.message ||
          "A little more writing and we can show you how you sound."}
      </p>
      <div className="mt-5 max-w-md">
        <Progress value={pct} className="h-1.5 bg-muted [&>div]:bg-primary" />
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="tabular-nums text-foreground">{have}</span> of{" "}
          <span className="tabular-nums">{needed}</span> words
          {remaining > 0 && (
            <>
              , about{" "}
              <span className="tabular-nums text-foreground">{remaining}</span>{" "}
              to go.
            </>
          )}
        </p>
      </div>
    </Card>
  );
}

/* ─────────────────────────── Shared bits ─────────────────────────── */

function SectionHeading({
  id,
  eyebrow,
  title,
}: {
  id: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <p className="overline text-primary">{eyebrow}</p>
      <h2
        id={id}
        className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl"
      >
        {title}
      </h2>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <Card className="p-6 sm:p-10" role="status" aria-label="Loading your voice profile">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-7 w-full animate-pulse rounded bg-muted" />
        <div className="h-7 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-7 w-9/12 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
    </Card>
  );
}

function ErrorNote({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t read your voice profile just now.
      </p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}

function EmptyNote({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Card className="border-dashed p-6 text-center">
      <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <PenLine className="h-4 w-4" />
      </div>
      <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
        Your voice profile isn&apos;t ready yet. Finalize a writing sample and
        it appears here.
      </p>
      <Button size="sm" variant="outline" className="mt-4" onClick={onRefresh}>
        Check again
      </Button>
    </Card>
  );
}

/* Named export mirrors the default so either import style works. */
export { VoiceProfileCard };
