/**
 * Full profile + career strategy (moved from classic /app ResumeParser).
 */
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  settingsCardCls,
  settingsCardHintCls,
  settingsCardTitleCls,
  settingsHelpCls,
  settingsInputCls as inputCls,
  settingsLabelCls as labelCls,
  settingsSelectCls as selectCls,
  settingsTextareaCls as textareaCls,
} from "./settingsStyles";
import PasswordCard from "./PasswordCard";
import TimezoneCard from "./TimezoneCard";
import { PrivacySettingsSection } from "@/components/privacy/PrivacySettingsSection";

const ROLE_OPTIONS = [
  "Software Engineer",
  "Data Scientist",
  "Product Manager",
  "Designer",
  "DevOps Engineer",
  "Student",
  "Other",
];
const SECTOR_OPTIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Government",
  "Consulting",
  "Other",
];
const WORK_MODE_OPTIONS = ["Remote", "Hybrid", "On-site", "Flexible"];
const SENIORITY_OPTIONS = ["Intern", "Junior", "Mid-level", "Senior", "Lead", "Manager", "Director"];
const NOTICE_PERIOD_OPTIONS = ["Immediately", "2 weeks", "1 month", "2 months", "3 months+"];

export default function ProfileTab() {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [role, setRole] = useState(user?.role || "");
  const [sector, setSector] = useState(user?.sector || "");
  const [targetRole, setTargetRole] = useState("");
  const [targetLocations, setTargetLocations] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [seniority, setSeniority] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [portfolioFocus, setPortfolioFocus] = useState("");
  const [constraints, setConstraints] = useState("");
  const [memoryLoading, setMemoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [strategySaved, setStrategySaved] = useState(false);
  const [error, setError] = useState("");
  const [strategyError, setStrategyError] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [autoFixPreview, setAutoFixPreview] = useState<{
    portfolioFocus: string;
    constraints: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadMemory = async () => {
      setMemoryLoading(true);
      const resp = await apiService.getMemoryNotes();
      if (!mounted) return;
      setMemoryLoading(false);
      if (resp.error || !resp.data?.notes) return;
      const notes = resp.data.notes;
      setTargetRole(notes["target_role"] || "");
      setTargetLocations(notes["target_locations"] || "");
      setWorkMode(notes["work_mode"] || "");
      setSeniority(notes["seniority"] || "");
      setNoticePeriod(notes["notice_period"] || "");
      setSalaryRange(notes["salary_range"] || "");
      setPortfolioFocus(notes["portfolio_focus"] || "");
      setConstraints(notes["constraints"] || "");
    };
    void loadMemory();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    const result = await updateProfile({
      name: name.trim() || undefined,
      role: role || undefined,
      sector: sector || undefined,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const saveStrategy = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSavingStrategy(true);
    setStrategyError("");
    setStrategySaved(false);
    setValidationErrors([]);

    const errs = validationChecks.filter((c) => !c.ok).map((c) => c.msg);
    if (errs.length > 0) {
      setSavingStrategy(false);
      setValidationErrors(errs);
      setStrategyError("Please fix profile validation issues before saving.");
      return;
    }

    const pairs: Array<[string, string]> = [
      ["target_role", targetRole.trim()],
      ["target_locations", targetLocations.trim()],
      ["work_mode", workMode.trim()],
      ["seniority", seniority.trim()],
      ["notice_period", noticePeriod.trim()],
      ["salary_range", salaryRange.trim()],
      ["portfolio_focus", portfolioFocus.trim()],
      ["constraints", constraints.trim()],
    ];

    for (const [key, value] of pairs) {
      const resp = value
        ? await apiService.saveMemoryNote(key, value)
        : await apiService.deleteMemoryNote(key);
      if (resp.error) {
        setSavingStrategy(false);
        setStrategyError(resp.error);
        return;
      }
    }

    setSavingStrategy(false);
    setStrategySaved(true);
    setTimeout(() => setStrategySaved(false), 3000);
  };

  const completion = (() => {
    const fields = [
      name.trim(),
      role.trim(),
      sector.trim(),
      targetRole.trim(),
      targetLocations.trim(),
      workMode.trim(),
      seniority.trim(),
      portfolioFocus.trim(),
    ];
    const done = fields.filter(Boolean).length;
    return Math.round((done / fields.length) * 100);
  })();

  const salaryValid = (() => {
    const v = salaryRange.trim();
    if (!v) return true;
    return /^(\$?\d+[kK]?\s*-\s*\$?\d+[kK]?\s*(base|total|tc)?|\$?\d+[kK]?\+?\s*(base|total|tc)?)$/.test(v);
  })();

  const locationTokens = targetLocations
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const locationsValid = targetLocations.trim().length === 0 || locationTokens.length <= 5;

  const constraintsTokens = constraints
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const constraintsValid = constraints.trim().length === 0 || constraintsTokens.length <= 8;

  const validationChecks = [
    { ok: !!targetRole.trim(), msg: "Add a clear target role." },
    { ok: !!targetLocations.trim(), msg: "Add preferred locations." },
    { ok: !!workMode.trim(), msg: "Set work mode preference." },
    { ok: !!seniority.trim(), msg: "Set seniority target." },
    { ok: salaryValid, msg: "Compensation target format looks invalid (try: 140k-180k base)." },
    { ok: locationsValid, msg: "Use at most 5 target locations, comma separated." },
    { ok: constraintsValid, msg: "Use at most 8 constraints, comma separated." },
    { ok: portfolioFocus.trim().length >= 20, msg: "Portfolio focus should be at least 20 characters." },
  ];

  const recruiterReadyScore = (() => {
    let score = 0;
    if (name.trim()) score += 8;
    if (role.trim()) score += 8;
    if (sector.trim()) score += 8;
    if (targetRole.trim()) score += 16;
    if (targetLocations.trim()) score += 12;
    if (workMode.trim()) score += 8;
    if (seniority.trim()) score += 8;
    if (noticePeriod.trim()) score += 6;
    if (salaryRange.trim()) score += 8;
    if (portfolioFocus.trim().length >= 20) score += 10;
    if (constraints.trim()) score += 8;
    if (salaryValid && locationsValid && constraintsValid) score += 8;
    return Math.min(100, score);
  })();

  const scoreTone =
    recruiterReadyScore >= 85
      ? "text-signal"
      : recruiterReadyScore >= 70
        ? "text-warning"
        : "text-destructive";

  // Fill and chip tint follow the same three bands as the text tone.
  const scoreBar =
    recruiterReadyScore >= 85
      ? "bg-signal"
      : recruiterReadyScore >= 70
        ? "bg-warning"
        : "bg-destructive";
  const scoreChip =
    recruiterReadyScore >= 85
      ? "bg-signal-tint text-signal"
      : recruiterReadyScore >= 70
        ? "bg-warning/10 text-warning"
        : "bg-destructive/10 text-destructive";

  const scoreLabel =
    recruiterReadyScore >= 85
      ? "Recruiter-ready"
      : recruiterReadyScore >= 70
        ? "Good, but improve"
        : "Needs improvement";

  const topGaps = validationChecks.filter((c) => !c.ok).map((c) => c.msg).slice(0, 5);

  const generateAutoFixSuggestions = () => {
    const roleHint = targetRole.trim() || role.trim() || "Software Engineer";
    const sectorHint = sector.trim() || "Technology";
    const modeHint = workMode.trim() || "Flexible";
    const seniorityHint = seniority.trim() || "Mid-level";
    const locationHint = targetLocations.trim() || "Remote-friendly markets";
    const noticeHint = noticePeriod.trim() || "standard notice period";
    const compHint = salaryRange.trim() || "market-competitive compensation";

    const improvedPortfolioFocus =
      `Targeting ${seniorityHint} ${roleHint} opportunities in ${sectorHint}. ` +
      `Portfolio should emphasize measurable impact: ownership of production systems, ` +
      `clear problem-to-solution narratives, and outcomes (latency, reliability, revenue, or efficiency). ` +
      `Prioritize 2-3 flagship projects aligned to hiring signals for ${roleHint}, with architecture decisions, trade-offs, ` +
      `and deployment maturity clearly documented.`;

    const improvedConstraints =
      `Work mode preference: ${modeHint}. Preferred locations: ${locationHint}. ` +
      `Availability: ${noticeHint}. Compensation target: ${compHint}. ` +
      `Non-negotiables: role scope aligned to ${roleHint}, growth-oriented engineering culture, and transparent interview process.`;

    setAutoFixPreview({
      portfolioFocus: improvedPortfolioFocus,
      constraints: improvedConstraints,
    });
  };

  const applyAutoFixSuggestions = () => {
    if (!autoFixPreview) return;
    setPortfolioFocus(autoFixPreview.portfolioFocus);
    setConstraints(autoFixPreview.constraints);
    setAutoFixPreview(null);
  };

  const selectChevron = (
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden="true"
    />
  );

  return (
    <div className="space-y-6">
      {/* Overview: completion, readiness, gaps and memory sync at a glance. */}
      <section aria-labelledby="profile-overview-title" className={settingsCardCls}>
        <h2 id="profile-overview-title" className={settingsCardTitleCls}>
          Profile &amp; career strategy
        </h2>
        <p className={settingsCardHintCls}>
          Industry-level profile configuration for better tailoring, outreach, and copilot guidance.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-muted px-3 py-2">
            <dt className="text-caption-sm uppercase tracking-wide text-muted-foreground">Completion</dt>
            <dd className="text-label-lg tabular-nums text-foreground">{completion}%</dd>
          </div>
          <div className="rounded-lg bg-muted px-3 py-2">
            <dt className="text-caption-sm uppercase tracking-wide text-muted-foreground">Readiness</dt>
            <dd className={cn("text-label-lg tabular-nums", scoreTone)}>{recruiterReadyScore}/100</dd>
          </div>
          <div className="rounded-lg bg-muted px-3 py-2">
            <dt className="text-caption-sm uppercase tracking-wide text-muted-foreground">Open gaps</dt>
            <dd
              className={cn(
                "text-label-lg tabular-nums",
                topGaps.length > 0 ? "text-warning" : "text-muted-foreground",
              )}
            >
              {topGaps.length}
            </dd>
          </div>
          <div className="rounded-lg bg-muted px-3 py-2">
            <dt className="text-caption-sm uppercase tracking-wide text-muted-foreground">Memory sync</dt>
            <dd className={cn("text-label-lg", memoryLoading ? "text-muted-foreground" : "text-foreground")}>
              {memoryLoading ? "Loading..." : "Ready"}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p id="profile-completion-label" className="text-label-lg text-foreground">
            Profile completion
          </p>
          <p className="text-label-md tabular-nums text-signal">{completion}%</p>
        </div>
        <div
          role="progressbar"
          aria-labelledby="profile-completion-label"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completion}
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-signal transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className={settingsHelpCls}>
          Higher completion improves quality of AI suggestions, outreach sequences, and interview prep.
        </p>
      </section>

      <section aria-labelledby="profile-score-title" className={settingsCardCls}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="profile-score-title" className={settingsCardTitleCls}>
              Recruiter-ready score
            </h2>
            <p className={cn("mt-0.5 text-label-md tabular-nums", scoreTone)}>
              {recruiterReadyScore}/100 · {scoreLabel}
            </p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-label-md", scoreChip)}>
            {scoreLabel}
          </span>
        </div>
        <div
          role="progressbar"
          aria-labelledby="profile-score-title"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={recruiterReadyScore}
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
              scoreBar,
            )}
            style={{ width: `${recruiterReadyScore}%` }}
          />
        </div>
        {topGaps.length > 0 ? (
          <div className="mt-4">
            <p className="mb-1.5 text-label-md text-foreground">Actionable gaps</p>
            <ul className="list-inside list-disc space-y-1 text-caption text-ink-muted">
              {topGaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-caption text-success">
            Excellent. Your profile settings are strong and ready for high-quality personalization.
          </p>
        )}
      </section>

      <form
        onSubmit={handleSave}
        aria-labelledby="profile-identity-title"
        className={cn(settingsCardCls, "space-y-5")}
      >
        <h2 id="profile-identity-title" className={settingsCardTitleCls}>
          Identity
        </h2>
        {/* Email (read-only) */}
        <div>
          <label htmlFor="profile-email" className={labelCls}>
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            readOnly
            value={user?.email ?? ""}
            aria-describedby="profile-email-help"
            className={cn(inputCls, "bg-muted text-ink-muted")}
          />
          <p id="profile-email-help" className={settingsHelpCls}>
            Email cannot be changed
          </p>
        </div>

        <div>
          <label htmlFor="profile-name" className={labelCls}>
            Full name
          </label>
          <input
            id="profile-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-role" className={labelCls}>
              Role
            </label>
            <div className="relative">
              <select
                id="profile-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={selectCls}
              >
                <option value="">Select a role</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {selectChevron}
            </div>
          </div>

          <div>
            <label htmlFor="profile-sector" className={labelCls}>
              Industry
            </label>
            <div className="relative">
              <select
                id="profile-sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className={selectCls}
              >
                <option value="">Select an industry</option>
                {SECTOR_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {selectChevron}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="flex items-center gap-1.5 text-sm text-success" role="status">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> Profile updated
          </p>
        )}

        <Button type="submit" disabled={saving} aria-busy={saving}>
          {saving ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </form>

      <PasswordCard />

      <TimezoneCard />

      <form
        onSubmit={saveStrategy}
        aria-labelledby="profile-strategy-title"
        aria-busy={memoryLoading}
        className={cn(settingsCardCls, "space-y-5")}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="profile-strategy-title" className={settingsCardTitleCls}>
            Career strategy (Copilot memory)
          </h2>
          {memoryLoading && (
            <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Loading strategy...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="strategy-target-role" className={labelCls}>
              Target role
            </label>
            <input
              id="strategy-target-role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="strategy-locations" className={labelCls}>
              Preferred locations
            </label>
            <input
              id="strategy-locations"
              value={targetLocations}
              onChange={(e) => setTargetLocations(e.target.value)}
              placeholder="e.g. SF Bay Area, Remote (US)"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="strategy-work-mode" className={labelCls}>
              Work mode
            </label>
            <div className="relative">
              <select
                id="strategy-work-mode"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className={selectCls}
              >
                <option value="">Select mode</option>
                {WORK_MODE_OPTIONS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
              {selectChevron}
            </div>
          </div>
          <div>
            <label htmlFor="strategy-seniority" className={labelCls}>
              Seniority
            </label>
            <div className="relative">
              <select
                id="strategy-seniority"
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className={selectCls}
              >
                <option value="">Select seniority</option>
                {SENIORITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {selectChevron}
            </div>
          </div>
          <div>
            <label htmlFor="strategy-notice" className={labelCls}>
              Notice period
            </label>
            <div className="relative">
              <select
                id="strategy-notice"
                value={noticePeriod}
                onChange={(e) => setNoticePeriod(e.target.value)}
                className={selectCls}
              >
                <option value="">Select notice period</option>
                {NOTICE_PERIOD_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {selectChevron}
            </div>
          </div>
          <div>
            <label htmlFor="strategy-comp" className={labelCls}>
              Compensation target
            </label>
            <input
              id="strategy-comp"
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="e.g. 140k-180k base"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label htmlFor="strategy-portfolio" className={labelCls}>
            Portfolio focus
          </label>
          <textarea
            id="strategy-portfolio"
            value={portfolioFocus}
            onChange={(e) => setPortfolioFocus(e.target.value)}
            rows={3}
            placeholder="What should your portfolio emphasize? (e.g. distributed systems, DevOps impact, AI products)"
            className={textareaCls}
          />
        </div>
        <div>
          <label htmlFor="strategy-constraints" className={labelCls}>
            Constraints / non-negotiables
          </label>
          <textarea
            id="strategy-constraints"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            rows={3}
            placeholder="e.g. No relocation, visa sponsorship required, no sales-heavy roles"
            className={textareaCls}
          />
        </div>

        <p className={cn(settingsHelpCls, "mt-0 max-w-prose")}>
          These settings are synced to Copilot memory and used to personalize JD analysis, cold outreach, and interview prep.
        </p>

        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-label-md text-foreground">Auto-fix suggestions</p>
              <p className="mt-0.5 max-w-prose text-caption text-muted-foreground">
                Generate industry-style wording for Portfolio Focus and Constraints based on your profile.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={generateAutoFixSuggestions}>
              <Sparkles aria-hidden="true" />
              Generate suggestions
            </Button>
          </div>
          {autoFixPreview && (
            <div className="mt-4 space-y-3" role="region" aria-label="Suggested wording">
              <div>
                <p className="text-label-md text-foreground">Portfolio Focus suggestion</p>
                <p className="mt-1 max-w-prose whitespace-pre-wrap text-caption leading-relaxed text-ink-muted">
                  {autoFixPreview.portfolioFocus}
                </p>
              </div>
              <div>
                <p className="text-label-md text-foreground">Constraints suggestion</p>
                <p className="mt-1 max-w-prose whitespace-pre-wrap text-caption leading-relaxed text-ink-muted">
                  {autoFixPreview.constraints}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={applyAutoFixSuggestions}>
                  Apply suggestions
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAutoFixPreview(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>

        {validationErrors.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="mb-1 text-label-md text-destructive">Validation issues</p>
            <ul className="list-inside list-disc space-y-1 text-caption text-destructive">
              {validationErrors.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>
        )}

        {strategyError && (
          <p className="text-sm text-destructive" role="alert">
            {strategyError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={savingStrategy || memoryLoading} aria-busy={savingStrategy}>
            {savingStrategy ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Syncing...
              </>
            ) : (
              "Save strategy"
            )}
          </Button>
          {strategySaved && (
            <p className="flex items-center gap-1.5 text-sm text-success" role="status">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> Career strategy synced to Copilot
            </p>
          )}
        </div>
      </form>

      <PrivacySettingsSection />

      <section aria-labelledby="profile-account-title" className={settingsCardCls}>
        <h2 id="profile-account-title" className={cn(settingsCardTitleCls, "mb-3")}>
          Account
        </h2>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            logout();
            window.location.href = "/app/home";
          }}
        >
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </section>
    </div>
  );
}
