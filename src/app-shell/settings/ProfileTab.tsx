/**
 * Full profile + career strategy (moved from classic /app ResumeParser).
 */
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import PasswordCard from "./PasswordCard";

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

  const handleSave = async () => {
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

  const saveStrategy = async () => {
    setSavingStrategy(true);
    setError("");
    setStrategySaved(false);
    setValidationErrors([]);

    const errs = validationChecks.filter((c) => !c.ok).map((c) => c.msg);
    if (errs.length > 0) {
      setSavingStrategy(false);
      setValidationErrors(errs);
      setError("Please fix profile validation issues before saving.");
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
        setError(resp.error);
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
      ? "text-emerald-600 dark:text-emerald-300"
      : recruiterReadyScore >= 70
        ? "text-amber-600 dark:text-amber-300"
        : "text-red-600 dark:text-red-300";

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

  const inputCls =
    "w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700/60 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all";
  const selectCls =
    "w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700/60 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all appearance-none cursor-pointer";
  const labelCls =
    "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200/80 bg-white/70 p-4 dark:border-white/[0.07] dark:bg-gray-900/40">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Profile & Career Strategy
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Industry-level profile configuration for better tailoring, outreach, and copilot guidance.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Completion</p>
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{completion}%</p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Readiness</p>
            <p className={`text-sm font-semibold ${scoreTone}`}>{recruiterReadyScore}/100</p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Open gaps</p>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{topGaps.length}</p>
          </div>
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Memory sync</p>
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{memoryLoading ? "..." : "Ready"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Profile Completion
          </p>
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300">{completion}%</p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
          Higher completion improves quality of AI suggestions, outreach sequences, and interview prep.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Recruiter-ready Score</p>
            <p className={`text-xs font-bold mt-0.5 ${scoreTone}`}>
              {recruiterReadyScore}/100 • {scoreLabel}
            </p>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            recruiterReadyScore >= 85
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : recruiterReadyScore >= 70
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "bg-red-500/10 text-red-700 dark:text-red-300"
          }`}>
            {scoreLabel}
          </span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              recruiterReadyScore >= 85
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : recruiterReadyScore >= 70
                  ? "bg-gradient-to-r from-amber-500 to-orange-500"
                  : "bg-gradient-to-r from-red-500 to-rose-500"
            }`}
            style={{ width: `${recruiterReadyScore}%` }}
          />
        </div>
        {topGaps.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Actionable gaps</p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              {topGaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-300">
            Excellent. Your profile settings are strong and ready for high-quality personalization.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-6 space-y-5">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Identity
        </p>
        {/* Email (read-only) */}
        <div>
          <label className={labelCls}>Email</label>
          <div className="px-4 py-2.5 rounded-lg bg-gray-100/40 dark:bg-gray-800/40 border border-gray-300 dark:border-gray-700/40 text-sm text-gray-600 dark:text-gray-400">
            {user?.email}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            Email cannot be changed
          </p>
        </div>

        <div>
          <label htmlFor="profile-name" className={labelCls}>
            Full Name
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className={inputCls}
          />
        </div>

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
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${false ? "rotate-180" : ""}`} />
            </span>
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
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${false ? "rotate-180" : ""}`} />
            </span>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && (
          <p className="text-sm text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Profile updated
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:text-gray-500 dark:text-gray-400 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:shadow-none transition-all duration-200"
        >
          {saving ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />{" "}
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>

      <PasswordCard />

      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Career Strategy (Copilot Memory)
          </p>
          {memoryLoading && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Loading strategy...</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Target Role</label>
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Preferred Locations</label>
            <input
              value={targetLocations}
              onChange={(e) => setTargetLocations(e.target.value)}
              placeholder="e.g. SF Bay Area, Remote (US)"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Work Mode</label>
            <div className="relative">
              <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className={selectCls}>
                <option value="">Select mode</option>
                {WORK_MODE_OPTIONS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${false ? "rotate-180" : ""}`} />
              </span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Seniority</label>
            <div className="relative">
              <select value={seniority} onChange={(e) => setSeniority(e.target.value)} className={selectCls}>
                <option value="">Select seniority</option>
                {SENIORITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${false ? "rotate-180" : ""}`} />
              </span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Notice Period</label>
            <div className="relative">
              <select value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)} className={selectCls}>
                <option value="">Select notice period</option>
                {NOTICE_PERIOD_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${false ? "rotate-180" : ""}`} />
              </span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Compensation Target</label>
            <input
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="e.g. 140k-180k base"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Portfolio Focus</label>
          <textarea
            value={portfolioFocus}
            onChange={(e) => setPortfolioFocus(e.target.value)}
            rows={3}
            placeholder="What should your portfolio emphasize? (e.g. distributed systems, DevOps impact, AI products)"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Constraints / Non-negotiables</label>
          <textarea
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            rows={3}
            placeholder="e.g. No relocation, visa sponsorship required, no sales-heavy roles"
            className={inputCls}
          />
        </div>

        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          These settings are synced to Copilot memory and used to personalize JD analysis, cold outreach, and interview prep.
        </p>

        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                Auto-fix suggestions
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Generate industry-style wording for Portfolio Focus and Constraints based on your profile.
              </p>
            </div>
            <button
              type="button"
              onClick={generateAutoFixSuggestions}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-500/25 bg-white/70 dark:bg-white/5 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 transition"
            >
              Generate suggestions
            </button>
          </div>
          {autoFixPreview && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Portfolio Focus suggestion</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {autoFixPreview.portfolioFocus}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Constraints suggestion</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {autoFixPreview.constraints}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyAutoFixSuggestions}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                >
                  Apply suggestions
                </button>
                <button
                  type="button"
                  onClick={() => setAutoFixPreview(null)}
                  className="text-xs text-gray-500 dark:text-gray-400 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {validationErrors.length > 0 && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Validation issues</p>
            <ul className="text-xs text-red-600 dark:text-red-300 space-y-1 list-disc list-inside">
              {validationErrors.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={saveStrategy}
          disabled={savingStrategy || memoryLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:text-gray-500 dark:text-gray-400 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 disabled:shadow-none transition-all duration-200"
        >
          {savingStrategy ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />{" "}
              Syncing...
            </>
          ) : (
            "Save Strategy"
          )}
        </button>
        {strategySaved && (
          <p className="text-sm text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Career strategy synced to Copilot
          </p>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-6">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Account
        </p>
        <button
          onClick={() => {
            logout();
            window.location.href = "/app/home";
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
