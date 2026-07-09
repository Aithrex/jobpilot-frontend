import { useMemo, useState, type ElementType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type {
  AuthoredResume,
  AuthoredResumeDetail,
  AuthoredStructured,
  Provenance,
} from "@/types/voicegraph";

const LIST_KEY = ["voice-graph", "authored-resumes"] as const;

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

function flattenSkills(skills: AuthoredStructured["skills"]): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.map(String);
  const out: string[] = [];
  for (const v of Object.values(skills)) {
    if (Array.isArray(v)) out.push(...v.map(String));
    else if (v) out.push(String(v));
  }
  return out;
}

export default function AuthoredResumeView() {
  const [building, setBuilding] = useState(false);
  const [active, setActive] = useState<AuthoredResumeDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: LIST_KEY,
    retry: false,
    queryFn: async (): Promise<AuthoredResume[] | null> => {
      const res = await apiService.listAuthoredResumes();
      if (res.status === 404) return null; // feature flag off
      if (res.error) throw new Error(res.error);
      return res.data?.resumes ?? [];
    },
  });

  const build = async () => {
    if (building) return;
    setBuilding(true);
    const res = await apiService.buildRawResume();
    setBuilding(false);
    if (res.error || !res.data) {
      const payload = res.errorPayload || {};
      const code = String(
        payload.error ?? payload.code ?? payload.reason ?? res.error ?? "",
      );
      if (res.status === 403 && code.includes("consent_required")) {
        toast.error("Turn on Voice Graph first", {
          description: "We need your consent before building from your words.",
        });
        return;
      }
      if (res.status === 400 && code.includes("no_ready_samples")) {
        toast.error("No finished writing yet", {
          description:
            "Finalize at least one writing sample above, then build.",
        });
        return;
      }
      toast.error("Couldn't build your resume", { description: res.error });
      return;
    }
    setActive(res.data);
    listQuery.refetch();
    toast.success("Built from your words", {
      description: "Every line is verbatim — nothing written by a model.",
    });
  };

  const openResume = async (id: string) => {
    if (loadingId) return;
    setLoadingId(id);
    const res = await apiService.getAuthoredResume(id);
    setLoadingId(null);
    if (res.error || !res.data) {
      toast.error("Couldn't open that resume", { description: res.error });
      return;
    }
    setActive(res.data);
  };

  const priors = listQuery.data ?? [];

  return (
    <section aria-labelledby="authored-resume-heading">
      <SectionHeading
        id="authored-resume-heading"
        eyebrow="Your words"
        title="Build a resume from your own words."
      />

      {/* CTA */}
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-prose">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Assemble a resume from what you&apos;ve written — line for line, in
            your own words. Nothing here is written by a model.
          </p>
        </div>
        <Button onClick={build} disabled={building} className="shrink-0">
          {building ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Build from my words
        </Button>
      </Card>

      {/* The built / opened resume */}
      {active && <ResumeDocument detail={active} />}

      {/* Prior authored resumes */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Resumes from your words
        </h3>
        {listQuery.isLoading ? (
          <div className="space-y-2">
            <div className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-white/10" />
            <div className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-white/10" />
          </div>
        ) : listQuery.isError ? (
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t load your saved resumes.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => listQuery.refetch()}
            >
              Try again
            </Button>
          </Card>
        ) : priors.length === 0 ? (
          <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">
            Nothing built yet. When you build from your words, it&apos;ll show up
            here.
          </Card>
        ) : (
          <ul className="space-y-2">
            {priors.map((r) => (
              <li key={r.resume_id}>
                <button
                  type="button"
                  onClick={() => openResume(r.resume_id)}
                  disabled={loadingId === r.resume_id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    active?.resume_id === r.resume_id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {loadingId === r.resume_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {r.mode}
                      </span>
                      <span className="text-sm text-foreground">
                        {r.bullet_count}{" "}
                        {r.bullet_count === 1 ? "line" : "lines"}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {relativeTime(r.created_at)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── The document ─────────────────────────── */

function ResumeDocument({ detail }: { detail: AuthoredResumeDetail }) {
  const provByBullet = useMemo(() => {
    const m = new Map<string, Provenance>();
    for (const p of detail.provenance ?? []) {
      if (!m.has(p.bullet)) m.set(p.bullet, p);
    }
    return m;
  }, [detail.provenance]);

  const structured = detail.structured ?? {};
  const skills = flattenSkills(structured.skills);
  const experience = structured.experience ?? [];
  const projects = structured.projects ?? [];

  return (
    <Card className="mt-4 overflow-hidden">
      {/* Integrity badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-6 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          raw — nothing was written by a model
        </span>
        {typeof detail.voice_distance === "number" && (
          <span className="text-xs text-muted-foreground">
            voice distance{" "}
            <span className="tabular-nums text-foreground">
              {detail.voice_distance.toFixed(2)}
            </span>
          </span>
        )}
      </div>

      <div className="space-y-8 px-6 py-6 sm:px-8">
        {structured.contact?.name && (
          <h3 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            {structured.contact.name}
          </h3>
        )}

        {structured.summary && (
          <ProvenanceLine
            text={structured.summary}
            prov={provByBullet.get(structured.summary)}
            as="p"
          />
        )}

        {skills.length > 0 && (
          <div>
            <SectionLabel>Skills</SectionLabel>
            <ul className="flex flex-wrap gap-1.5">
              {skills.map((s, i) => (
                <li
                  key={`${s}-${i}`}
                  className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-foreground"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {experience.length > 0 && (
          <div className="space-y-6">
            <SectionLabel>Experience</SectionLabel>
            {experience.map((exp, i) => (
              <div key={i}>
                <p className="font-medium text-foreground">
                  {exp.title || "Role"}
                  {exp.company && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {exp.company}
                    </span>
                  )}
                </p>
                {exp.dates && (
                  <p className="text-xs text-muted-foreground">{exp.dates}</p>
                )}
                <ul className="mt-2 space-y-1.5">
                  {(exp.bullets ?? []).map((b, bi) => (
                    <ProvenanceLine
                      key={bi}
                      text={b}
                      prov={provByBullet.get(b)}
                      as="li"
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {projects.length > 0 && (
          <div className="space-y-6">
            <SectionLabel>Projects</SectionLabel>
            {projects.map((proj, i) => (
              <div key={i}>
                {proj.name && (
                  <p className="font-medium text-foreground">{proj.name}</p>
                )}
                {proj.description && (
                  <p className="text-sm text-muted-foreground">
                    {proj.description}
                  </p>
                )}
                <ul className="mt-2 space-y-1.5">
                  {(proj.bullets ?? []).map((b, bi) => (
                    <ProvenanceLine
                      key={bi}
                      text={b}
                      prov={provByBullet.get(b)}
                      as="li"
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * A single résumé line. When it carries provenance, it becomes a hover/focus
 * chip that reveals the verbatim source sentence from the user's writing.
 */
function ProvenanceLine({
  text,
  prov,
  as,
}: {
  text: string;
  prov?: Provenance;
  as: "li" | "p";
}) {
  const Wrapper: ElementType = as;
  if (!prov) {
    return (
      <Wrapper className="text-sm leading-relaxed text-foreground">
        {as === "li" && (
          <span className="mr-2 text-primary" aria-hidden>
            •
          </span>
        )}
        {text}
      </Wrapper>
    );
  }
  return (
    <Wrapper className="text-sm leading-relaxed">
      <HoverCard openDelay={80} closeDelay={80}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="group inline text-left text-foreground underline decoration-primary/30 decoration-dotted underline-offset-4 transition-colors hover:decoration-primary focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            {as === "li" && (
              <span className="mr-2 text-primary" aria-hidden>
                •
              </span>
            )}
            {text}
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            From your own writing
          </p>
          <p className="mt-2 font-serif text-sm italic leading-relaxed text-foreground">
            &ldquo;{prov.bullet}&rdquo;
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Verbatim from a writing sample — we didn&apos;t rewrite a word.
          </p>
        </HoverCardContent>
      </HoverCard>
    </Wrapper>
  );
}

/* ─────────────────────────── Shared bits ─────────────────────────── */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

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
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-1 font-serif text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        {title}
      </h2>
    </div>
  );
}

export { AuthoredResumeView };
