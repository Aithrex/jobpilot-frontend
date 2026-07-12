import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { apiService } from "@/lib/api";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyUsage, DailyUsage } from "@/hooks/useDailyUsage";
import { DailyUsageBadge } from "@/components/quota/DailyUsageBadge";
import { QuotaLimitDialog } from "@/components/quota/QuotaLimitDialog";
import { useFeedback } from "@/components/feedback/FeedbackWidget";
import { buildCoverLetterFilename, titleCaseName } from "@/lib/filename";
import { ThemeToggle } from "@/components/theme-toggle";
import { Bot, Building2, CreditCard, GraduationCap, Trophy, Users, Mic, Menu, PanelLeftClose, PanelLeftOpen, X, Eye, TrendingUp, Bell, ShieldCheck, Home, Compass, PenTool, Send, Sprout, MessageSquarePlus, ChevronRight, Search } from "lucide-react";
import { ConnectedTo } from "@/components/resume/ConnectedTo";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import ResumeDashboard, {
  TrashIcon,
} from "@/components/resume/ResumeDashboard";
import StreakWidget from "@/components/resume/StreakWidget";
import { SmartFiltersInline } from "@/components/job-search/SmartFiltersInline";
import type {
  TailorPipelineResult,
  TailoredFullResume,
  JDAnalysis,
  ATSScores,
} from "@/types/resume";
import { CopySectionButton } from "@/components/resume/tailored/CopySectionButton";
import { ResumePreview } from "@/components/resume/tailored/ResumePreview";
import { ResumeDiffView } from "@/components/resume/tailored/ResumeDiffView";
import { ScoreBar, ScoreRing, PDFParseabilityCard } from "@/components/resume/tailored/ScoreDisplay";
import OnboardingHero from "@/components/resume/OnboardingHero";
// Tailored Resumes tab now lives in the app shell; the monolith re-imports the
// same component (default export aliased to its old name) so /app keeps working.
import TailoredResumesTab from "@/app-shell/pages/craft/TailoredPage";
import MyResumesTab from "@/app-shell/pages/craft/MyResumesPage";

const ResumeEditor = lazy(() => import("@/components/resume/ResumeEditor"));
const DashboardTab = lazy(() => import("@/components/resume/DashboardTab"));
const BatchTailor = lazy(() => import("@/components/resume/BatchTailor"));
const InterviewPrepTab = lazy(() => import("@/components/resume/InterviewPrepTab"));
const ApplicationsTab = lazy(() => import("@/components/resume/ApplicationsTab"));
const VersionDiffViewer = lazy(() => import("@/components/resume/VersionDiffViewer"));
const JobOpportunitiesTab = lazy(() => import("@/components/resume/JobOpportunitiesTab"));
const CareerPortalsTab = lazy(() => import("@/components/resume/CareerPortalsTab"));
const AutoApplyTab = lazy(() => import("@/components/autoSubmit/AutoApplyTab"));
const CareerCopilotTab = lazy(() => import("@/components/resume/CareerCopilotTab"));
const VisaTimelineTab = lazy(() => import("@/components/visa/VisaTimelineTab"));
const BetaLabTab = lazy(() => import("@/components/beta/BetaLabTab"));
const BillingTab = lazy(() => import("@/components/billing/BillingTab"));
const LearningHubTab = lazy(() => import("@/components/resume/LearningHubTab"));
const EventsTab = lazy(() => import("@/components/resume/EventsTab"));
const NetworkTab = lazy(() => import("@/components/resume/NetworkTab"));
const VoiceGraphTab = lazy(() => import("@/components/resume/VoiceGraphTab"));
const SixSecondsTab = lazy(() => import("@/components/resume/SixSecondsTab"));
const PipelineTab = lazy(() => import("@/components/resume/PipelineTab"));
const NotificationsTab = lazy(() => import("@/components/resume/NotificationsTab"));

// ─── Shared Icons ───────────────────────────────────────────────────────────

function DashboardIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function SparklesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}
function UploadCloudIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}
function DocumentArrowDownIcon({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}
function MagnifyingGlassIcon({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}
function ShieldIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12c0 4.55-3.47 8.27-7.875 8.71a.75.75 0 01-.75 0C7.97 20.27 4.5 16.55 4.5 12V6.74a.75.75 0 01.41-.67l6.84-2.81a.75.75 0 01.5 0l6.84 2.81a.75.75 0 01.41.67V12z"
      />
    </svg>
  );
}

function ClipboardIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
      />
    </svg>
  );
}
function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
function ExclamationIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}
function XCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
function HomeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}
function ArrowPathIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M20.016 4.656v4.992"
      />
    </svg>
  );
}
function UserCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
function FileIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}
function ChevronIcon({
  open,
  className = "w-4 h-4",
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      className={`${className} transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

type NavTab =
  | "dashboard"
  | "tailor"
  | "batch"
  | "jobs"
  | "career-portals"
  | "auto-apply"
  | "my-resumes"
  | "tailored"
  | "applications"
  | "interview"
  | "visa"
  | "beta"
  | "copilot"
  | "learning"
  | "events"
  | "network"
  | "voicegraph"
  | "six-seconds"
  | "pipeline"
  | "notifications"
  | "billing"
  | "profile";

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

// ─── ATS Panel ──────────────────────────────────────────────────────────────
function ATSPanel({
  scores,
  onAddKeyword,
  addedKeywords,
}: {
  scores: ATSScores;
  onAddKeyword?: (kw: string) => void;
  addedKeywords?: Set<string>;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-6">
        <div className="flex items-center gap-6">
          <ScoreRing score={scores.overall} />
          <div className="flex-1">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Overall ATS Score
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Weighted score across all dimensions
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-5">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Score Breakdown
          </p>
          <div className="space-y-3">
            <ScoreBar label="Keyword Match" score={scores.keyword_match} />
            <ScoreBar
              label="Keyword Frequency"
              score={scores.keyword_frequency}
            />
            <ScoreBar
              label="Skills Alignment"
              score={scores.skills_alignment}
            />
            <ScoreBar
              label="Experience Relevance"
              score={scores.experience_relevance}
            />
            <ScoreBar
              label="Quantifiable Impact"
              score={scores.quantifiable_impact}
            />
            <ScoreBar label="Bullet Quality" score={scores.bullet_quality} />
            <ScoreBar label="Format Score" score={scores.format_score} />
            <ScoreBar
              label="Section Completeness"
              score={scores.section_completeness}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-5">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
            ATS Scanner Scores
          </p>
          <div className="space-y-3">
            {scores.scanners &&
              Object.entries(scores.scanners).map(([n, s]) => (
                <ScoreBar
                  key={n}
                  label={n.charAt(0).toUpperCase() + n.slice(1)}
                  score={s}
                />
              ))}
          </div>
        </div>
      </div>
      {(scores as any).pdf_parseable_score !== undefined && (
        <PDFParseabilityCard
          score={(scores as any).pdf_parseable_score}
          checks={(scores as any).pdf_parseable_checks || {}}
          warnings={(scores as any).pdf_parseable_warnings || []}
        />
      )}
      {scores.ai_screener && (
        <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-5">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
            AI Screener Analysis
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBar
              label="Overall"
              score={scores.ai_screener.overall}
              color="bg-violet-500"
            />
            <ScoreBar
              label="Relevance"
              score={scores.ai_screener.relevance}
              color="bg-violet-500"
            />
            <ScoreBar
              label="Seniority Fit"
              score={scores.ai_screener.seniority_fit}
              color="bg-violet-500"
            />
            <ScoreBar
              label="Culture Fit"
              score={scores.ai_screener.culture_fit}
              color="bg-violet-500"
            />
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {scores.strengths?.length > 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">
                Strengths
              </p>
            </div>
            <ul className="space-y-2">
              {scores.strengths.map((s, i) => (
                <li
                  key={i}
                  className="text-xs text-gray-600 dark:text-gray-400 flex gap-2 leading-relaxed"
                >
                  <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {scores.suggestions?.length > 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <ExclamationIcon className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-semibold text-amber-400">
                Suggestions
              </p>
            </div>
            <ul className="space-y-2">
              {scores.suggestions.map((s, i) => (
                <li
                  key={i}
                  className="text-xs text-gray-600 dark:text-gray-400 flex gap-2 leading-relaxed"
                >
                  <span className="text-amber-500 mt-0.5 shrink-0">!</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {scores.missing_keywords?.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <XCircleIcon className="w-4 h-4 text-red-400" />
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Missing Keywords
              </p>
            </div>
            {onAddKeyword && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Click to add to your skills
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {scores.missing_keywords.map((kw) => {
              const added = addedKeywords?.has(kw);
              if (!onAddKeyword) {
                return (
                  <span
                    key={kw}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20"
                  >
                    {kw}
                  </span>
                );
              }
              return (
                <button
                  key={kw}
                  type="button"
                  onClick={() => !added && onAddKeyword(kw)}
                  disabled={added}
                  className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all duration-200 ${
                    added
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default"
                      : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-purple-500/15 hover:text-purple-400 hover:border-purple-500/40 hover:-translate-y-px"
                  }`}
                >
                  {added ? (
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="text-base leading-none -mt-0.5 opacity-60 group-hover:opacity-100">
                      +
                    </span>
                  )}
                  {kw}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── My Resumes tab ─────────────────────────────────────────────────────────
// Extracted to @/app-shell/pages/craft/MyResumesPage and re-imported (see the
// top imports) as MyResumesTab so both /app (this monolith) and /next (app
// shell) share one implementation.

// ─── Tailored Resumes tab ───────────────────────────────────────────────────
// Extracted to @/app-shell/pages/craft/TailoredPage and re-imported below as
// TailoredResumesTab so both /app (this monolith) and /next (app shell) share
// one implementation.

// ─── Profile tab ────────────────────────────────────────────────────────────
function ProfileTab() {
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
              <ChevronIcon
                open={false}
                className="w-4 h-4 text-gray-500 dark:text-gray-400"
              />
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
              <ChevronIcon
                open={false}
                className="w-4 h-4 text-gray-500 dark:text-gray-400"
              />
            </span>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && (
          <p className="text-sm text-emerald-400 flex items-center gap-1.5">
            <CheckCircleIcon className="w-4 h-4" /> Profile updated
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

      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Career Strategy (Copilot Memory)
          </p>
          {memoryLoading && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Loading strategy…</span>
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
                <ChevronIcon open={false} className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
                <ChevronIcon open={false} className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
                <ChevronIcon open={false} className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
            <CheckCircleIcon className="w-4 h-4" /> Career strategy synced to Copilot
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
            window.location.href = "/home";
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ─── Tailor tab (main flow) ─────────────────────────────────────────────────
function TailorTab() {
  const [hasResumes, setHasResumes] = useState<boolean | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [jdText, setJdText] = useState("");
  // Daily quota state — badge near the submit button, modal on 429.
  const { usage: dailyUsage, loading: usageLoading, refresh: refreshUsage, applyUsage } = useDailyUsage();
  const [quotaDialog, setQuotaDialog] = useState<(DailyUsage & { requested?: number }) | null>(null);
  const feedback = useFeedback();
  // Original posting URL when the user came from Daily Pipeline / batch
  // handoff — keeps the "Retry JD fetch" button next to the JD textarea
  // useful even after the initial fetch failed or timed out. Cleared once
  // jdText has a real value via paste or successful fetch.
  const [pendingJobUrl, setPendingJobUrl] = useState<string>("");
  const [retryingJdFetch, setRetryingJdFetch] = useState(false);
  const [analyzingJD, setAnalyzingJD] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [tailorError, setTailorError] = useState("");
  const [result, setResult] = useState<TailorPipelineResult | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [tailorElapsed, setTailorElapsed] = useState(0);
  const tailorAbortRef = useRef<AbortController | null>(null);
  const atsAbortRef = useRef<AbortController | null>(null);
  const tailorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordIdRef = useRef<string | null>(null);
  // When a tailor flow is launched from the Daily Pipeline, this holds the
  // pipeline job_id so we can flip its saved status to 'applied' once the
  // tailoring record saves.
  const pendingJobIdRef = useRef<string | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);
  const [resumeLoadError, setResumeLoadError] = useState("");
  const [editing, setEditing] = useState(false);

  // Cross-tab handoff from Batch Tailor: when the user clicks "Edit ↗" on
  // a batch result, we open a new tab with ?load_batch=<jobId>. The new tab
  // reads the tailored_resume + jd_analysis from localStorage and drops the
  // user straight into the editor. localStorage (not session) because each
  // tab gets its own sessionStorage.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const batchId = params.get('load_batch');
      if (!batchId) return;
      const key = `batch_handoff_${batchId}`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      localStorage.removeItem(key);
      const parsed = JSON.parse(raw) as {
        tailored_resume: TailorPipelineResult['tailored_resume'];
        jd_analysis: TailorPipelineResult['jd_analysis'];
        title?: string;
        source_url?: string;
      };
      if (!parsed?.tailored_resume || !parsed?.jd_analysis) return;
      setResult({
        tailored_resume: parsed.tailored_resume,
        jd_analysis: parsed.jd_analysis,
      } as TailorPipelineResult);
      setEditing(true);
      if (parsed.title) {
        toast.success(`Loaded ${parsed.title} from Batch Tailor — edit and re-download.`);
      }
      // Clear the query param so a refresh in this tab doesn't try to reload.
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('load_batch');
      window.history.replaceState({}, '', cleanUrl.toString());
    } catch {
      /* malformed or removed — ignore */
    }
  }, []);

  // Consume any "tailor this job" handoff from the Daily Pipeline.
  //
  // Called both on initial mount AND whenever a navigate-to-tailor event
  // fires. The same-page event-driven nav flow (vs new-tab batch handoff)
  // sets sessionStorage AFTER ResumeParser has already mounted, so the
  // mount-time read alone misses it. We re-run on every nav event so the
  // single-row Tailor button reliably pastes the JD.
  const consumePendingTailorJob = useCallback(() => {
    try {
      const raw = sessionStorage.getItem('pending_tailor_job');
      if (!raw) return;
      sessionStorage.removeItem('pending_tailor_job');
      const parsed = JSON.parse(raw) as {
        job_id: string;
        jd_text: string;
        jd_fetch_failed?: boolean;
        title?: string;
        company?: string;
        url?: string;
      };
      if (parsed?.job_id) pendingJobIdRef.current = parsed.job_id;
      if (parsed?.jd_text) setJdText(parsed.jd_text);
      if (parsed?.url) setPendingJobUrl(parsed.url);
      if (parsed?.title || parsed?.company) {
        toast.info(`Tailoring for ${parsed.title || ''}${parsed.company ? ' @ ' + parsed.company : ''} — apply status auto-tracks`);
      }
      if (parsed?.jd_fetch_failed) {
        toast.warning(
          parsed?.url
            ? `Couldn't auto-fetch this JD — opening the posting in a new tab and pasting it works, OR click "Retry JD fetch" beside the textarea.`
            : "Couldn't auto-fetch this JD — please copy-paste it from the posting into the box below.",
          { duration: 8000 },
        );
        if (parsed?.url) {
          const url = parsed.url;
          try {
            const cached = sessionStorage.getItem(`jd_cache:${url}`);
            if (cached) {
              const obj = JSON.parse(cached) as { text: string; at: number };
              if (obj.text && Date.now() - obj.at < 60 * 60 * 1000) {
                setJdText(obj.text);
                toast.success('JD recovered from session cache.');
                return;
              }
            }
          } catch { /* ignore */ }
          apiService.fetchJobDescription(url).then((r) => {
            if (r.data?.ok && r.data.jd_text) {
              setJdText(r.data.jd_text);
              try {
                sessionStorage.setItem(
                  `jd_cache:${url}`,
                  JSON.stringify({ text: r.data.jd_text, at: Date.now() }),
                );
              } catch { /* quota */ }
              toast.success('JD auto-fetched on retry — review and tailor.');
            }
          }).catch(() => { /* silent — user has the manual Retry button */ });
        }
      } else if (parsed?.jd_text && parsed?.url) {
        try {
          sessionStorage.setItem(
            `jd_cache:${parsed.url}`,
            JSON.stringify({ text: parsed.jd_text, at: Date.now() }),
          );
        } catch { /* quota */ }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 1. Run once on mount in case the handoff was written before this
  //    component existed (rare, but possible if user lands on /resume-parser
  //    via a deep link).
  useEffect(() => {
    consumePendingTailorJob();
  }, [consumePendingTailorJob]);

  // 2. Re-run every time the navigate-to-tailor event fires. This is the
  //    critical fix — when the user clicks Tailor on the Daily Pipeline,
  //    handleTailor writes pending_tailor_job AND dispatches the event in
  //    the same call. The dispatch wakes this listener up to consume.
  useEffect(() => {
    const onNavTailor = () => {
      // Defer slightly so the dispatcher's setSessionStorage definitely
      // landed before we try to read.
      window.setTimeout(consumePendingTailorJob, 0);
    };
    window.addEventListener('portfolio:navigate-to-tailor', onNavTailor);
    return () => window.removeEventListener('portfolio:navigate-to-tailor', onNavTailor);
  }, [consumePendingTailorJob]);

  // Lock page scroll while the full-screen editor overlay is mounted.
  // Without this, wheel/touch gestures chain through to the TailorTab
  // behind it (overscroll-contain only helps when the overlay itself can
  // scroll), and the disappearing scrollbar causes a layout shift that
  // briefly reveals the page underneath.
  useEffect(() => {
    if (!editing) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [editing]);

  const [regenFeedback, setRegenFeedback] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState("");
  const [previousResume, setPreviousResume] =
    useState<TailoredFullResume | null>(null);
  const [regenView, setRegenView] = useState<
    "regenerated" | "previous" | "diff"
  >("regenerated");
  const regenAbortRef = useRef<AbortController | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const coverLetterAbortRef = useRef<AbortController | null>(null);
  const coverLetterInFlightRef = useRef(false);
  const [addedKeywords, setAddedKeywords] = useState<Set<string>>(new Set());
  const [coverLetterDownloading, setCoverLetterDownloading] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<
    "jd" | "ats" | "regenerate" | "cover"
  >("jd");
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<
    {
      id: string;
      resume: TailoredFullResume;
      label: string;
      timestamp: number;
    }[]
  >([]);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(
    new Set(),
  );
  const progressRef = useRef<HTMLDivElement>(null);

  const handleAddKeyword = useCallback((kw: string) => {
    setResult((prev) => {
      if (!prev) return prev;
      const next = { ...prev.tailored_resume };
      const skills = { ...(next.skills || {}) };
      const cats = Object.keys(skills);
      const targetCat = cats.includes("Technical Skills")
        ? "Technical Skills"
        : cats.includes("Skills")
          ? "Skills"
          : cats[0] || "Skills";
      const existing = Array.isArray(skills[targetCat])
        ? [...(skills[targetCat] as string[])]
        : [];
      if (!existing.some((s) => s.toLowerCase() === kw.toLowerCase()))
        existing.push(kw);
      skills[targetCat] = existing;
      next.skills = skills;
      return { ...prev, tailored_resume: next };
    });
    setAddedKeywords((prev) => {
      const s = new Set(prev);
      s.add(kw);
      return s;
    });
    toast.success(`Added "${kw}" to your skills`);
  }, []);

  // Fetch active resume info for record storage
  const activeResumeRef = useRef<{ filename: string; s3_key: string } | null>(
    null,
  );

  const checkResumes = useCallback(async () => {
    setLoadingCheck(true);
    setResumeLoadError("");
    const resp = await apiService.listBaseResumes();
    if (resp.data) {
      const versions = resp.data.versions || [];
      const active = versions.find((v: any) => v.is_active);
      if (active)
        activeResumeRef.current = {
          filename: active.filename,
          s3_key: active.s3_key,
        };

      if (versions.length > 0) {
        // Base files exist — also check /status to ensure a parsed resume
        // doc exists. If it's missing (parse job failed/never completed),
        // the /status endpoint triggers an S3 re-parse automatically.
        const statusResp = await apiService.getResumeStatus();
        if (statusResp.data?.has_resume) {
          setHasResumes(true);
        } else {
          // Status says no parsed resume — still show the tailor UI
          // (ensure_structured_resume in the tailor endpoint will retry)
          setHasResumes(true);
        }
      } else {
        setHasResumes(false);
      }
    } else {
      const isAuthError =
        (resp.error || "").toLowerCase().includes("session expired") ||
        (resp.error || "").includes("401");
      if (isAuthError) {
        setResumeLoadError("Your session expired. Please log in again.");
      } else {
        const s = await apiService.getResumeStatus();
        if (s.data)
          setHasResumes(
            s.data.has_resume === true || s.data.has_base_file === true,
          );
        else
          setResumeLoadError(
            s.error || resp.error || "Unable to load your resumes right now.",
          );
      }
    }
    setLoadingCheck(false);
  }, []);
  useEffect(() => {
    checkResumes();
  }, [checkResumes]);
  useEffect(
    () => () => {
      tailorAbortRef.current?.abort();
      atsAbortRef.current?.abort();
      regenAbortRef.current?.abort();
      coverLetterAbortRef.current?.abort();
      if (tailorTimerRef.current) clearInterval(tailorTimerRef.current);
    },
    [],
  );

  // Lock body scroll while the full-screen editor overlay is open so scrolling
  // inside the split editor panes doesn't chain to the page behind it.
  useEffect(() => {
    if (!editing) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editing]);

  // Save tailoring record to backend (fire-and-forget)
  const saveRecord = useCallback(
    async (
      jdAnalysisData: JDAnalysis,
      tailoredResume: TailoredFullResume,
      jdRawText: string,
      atsScores?: ATSScores,
    ) => {
      try {
        const resp = await apiService.saveTailoringRecord({
          jd_text: jdRawText,
          jd_analysis: jdAnalysisData,
          tailored_resume: tailoredResume,
          ats_scores: atsScores || undefined,
          base_resume_filename: activeResumeRef.current?.filename || "",
          base_resume_s3_key: activeResumeRef.current?.s3_key || "",
        });
        if (resp.data?.record_id) {
          const isNewRecord = !recordIdRef.current;
          recordIdRef.current = resp.data.record_id;
          if (isNewRecord) {
            window.dispatchEvent(new CustomEvent('resume:application-saved'));
            // If this tailor flow was launched from the Daily Pipeline, mark
            // the originating saved job as 'applied' once tailoring lands.
            const jobId = pendingJobIdRef.current;
            if (jobId) {
              pendingJobIdRef.current = null;
              try {
                await apiService.updateSavedJob(jobId, { status: 'applied' });
                toast.success('Marked as Applied in your application tracker');
              } catch {
                /* silent */
              }
            }
          }
        }
      } catch {
        /* silent — analytics only */
      }
    },
    [],
  );

  // Update existing record with ATS scores
  const updateRecordATS = useCallback(async (atsScores: ATSScores) => {
    if (!recordIdRef.current) return;
    try {
      await apiService.saveTailoringRecord({
        record_id: recordIdRef.current,
        ats_scores: atsScores,
      });
    } catch {
      /* silent */
    }
  }, []);

  // Auto-start ATS scoring when tailoring completes
  const atsAutoTriggered = useRef(false);
  useEffect(() => {
    if (
      result &&
      !result.ats_scores &&
      !atsLoading &&
      !atsAutoTriggered.current
    ) {
      atsAutoTriggered.current = true;
      const t = setTimeout(() => {
        const ctrl = new AbortController();
        atsAbortRef.current = ctrl;
        setAtsLoading(true);
        apiService
          .fetchATSScores(
            result.tailored_resume,
            result.jd_analysis,
            ctrl.signal,
          )
          .then((r) => {
            if (ctrl.signal.aborted) return;
            setAtsLoading(false);
            if (r.data?.ats_scores) {
              setResult((p) =>
                p ? { ...p, ats_scores: r.data!.ats_scores } : p,
              );
              updateRecordATS(r.data.ats_scores);
              // Auto-switch to ATS tab so user sees the score
              setInspectorTab("ats");
            }
          })
          .catch(() => setAtsLoading(false));
      }, 500);
      return () => clearTimeout(t);
    }
  }, [result, atsLoading, updateRecordATS]);

  // Combined analyze + tailor in one action (like Jobscan / Teal).
  // Backend is ONE combined `extract_and_tailor` job, but we drive the
  // progress indicator through both visual phases (Analyze JD → Tailor)
  // via a timed transition so the user sees the work moving forward
  // instead of one indicator stuck while the single API call runs.
  const handleTailoring = useCallback(async () => {
    if (!jdText.trim()) return;
    tailorAbortRef.current?.abort();
    const ctrl = new AbortController();
    tailorAbortRef.current = ctrl;

    // Visual phase 1: Analyze JD (UI only — backend has already started both)
    setAnalyzingJD(true);
    setTailoring(false);
    setTailorError("");
    setResult(null);
    setTailorElapsed(0);
    tailorTimerRef.current = setInterval(
      () => setTailorElapsed((p) => p + 1),
      1000,
    );

    // Scroll the progress card into view so user sees what's happening
    setTimeout(
      () =>
        progressRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        }),
      80,
    );

    // Schedule the visual transition into "Tailor" phase. Backend's
    // extract_jd portion typically takes ~12s, so transitioning at 12s
    // matches reality closely. If the API returns earlier (rare), the
    // cleanup() in the finally path clears this transition timer.
    let phaseTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setAnalyzingJD(false);
      setTailoring(true);
      phaseTimer = null;
    }, 12000);

    // Combined extract-jd + tailor in ONE backend job.
    const combined = await apiService.tailorResumeWithJDText(
      jdText.trim(),
      ctrl.signal,
    );
    if (ctrl.signal.aborted) {
      if (phaseTimer) clearTimeout(phaseTimer);
      cleanup();
      return;
    }

    if (phaseTimer) clearTimeout(phaseTimer);
    cleanup();
    if (combined.error) {
      if (combined.status === 429 && (combined.errorPayload as any)?.error === "daily_quota_exceeded") {
        const u = (combined.errorPayload as any).usage as DailyUsage;
        applyUsage(u);
        setQuotaDialog(u);
        setTailorError("");
        return;
      }
      setTailorError(combined.error);
      return;
    }
    if (!combined.data?.jd_analysis || !combined.data?.tailored_resume) {
      setTailorError("Failed to tailor resume.");
      return;
    }
    // Success — refresh quota so the badge reflects the just-consumed credit.
    refreshUsage();

    const analysis = combined.data.jd_analysis;
    const tailoredResume = combined.data.tailored_resume;
    setResult({
      jd_analysis: analysis,
      tailored_resume: tailoredResume,
    });
    setVersions([
      {
        id: `v1-${Date.now()}`,
        resume: tailoredResume,
        label: "Initial tailoring",
        timestamp: Date.now(),
      },
    ]);
    // Await so downstream downloads / regenerations see recordIdRef set.
    await saveRecord(analysis, tailoredResume, jdText);

    function cleanup() {
      if (tailorTimerRef.current) clearInterval(tailorTimerRef.current);
      tailorTimerRef.current = null;
      setAnalyzingJD(false);
      setTailoring(false);
      setTailorElapsed(0);
    }
  }, [jdText, saveRecord]);

  const handleCancel = useCallback(() => {
    tailorAbortRef.current?.abort();
    if (tailorTimerRef.current) clearInterval(tailorTimerRef.current);
    tailorTimerRef.current = null;
    setTailoring(false);
    setTailorElapsed(0);
  }, []);

  const handleDownload = useCallback(
    async (fmt: "pdf" | "docx") => {
      if (!result) return;
      setDownloading(fmt);
      const r = await apiService.downloadTailoredResume(
        result.tailored_resume,
        result.jd_analysis,
        fmt,
        {
          recordId: recordIdRef.current || undefined,
          // Backend auto-saves a new version only if the content differs from
          // the record's latest one, so this is a safe default.
          source: "edited",
          autoSaveOnEdit: true,
        },
      );
      setDownloading(null);
      if (r.error) {
        toast.error("Download failed", { description: r.error });
        return;
      }
      if (r.data) {
        const u = URL.createObjectURL(r.data);
        const a = document.createElement("a");
        a.href = u;
        a.download = r.filename || `resume.${fmt}`;
        a.click();
        URL.revokeObjectURL(u);
        toast.success(`Resume downloaded as ${fmt.toUpperCase()}`);
      }
    },
    [result],
  );

  const handleRegenerate = useCallback(async () => {
    if (!result || !regenFeedback.trim()) return;
    regenAbortRef.current?.abort();
    const ctrl = new AbortController();
    regenAbortRef.current = ctrl;
    setRegenerating(true);
    setRegenError("");

    const resp = await apiService.regenerateResume(
      result.tailored_resume,
      result.jd_analysis,
      regenFeedback.trim(),
      ctrl.signal,
    );

    if (ctrl.signal.aborted) {
      setRegenerating(false);
      return;
    }
    setRegenerating(false);

    if (resp.error) {
      setRegenError(resp.error);
      toast.error("Regeneration failed", { description: resp.error });
      return;
    }
    if (resp.data?.tailored_resume) {
      // Save current version before replacing
      if (result?.tailored_resume) {
        setPreviousResume(result.tailored_resume);
      }
      setResult((prev) =>
        prev
          ? {
              ...prev,
              tailored_resume: resp.data!.tailored_resume,
              ats_scores: undefined,
            }
          : prev,
      );
      const feedbackSnippet = regenFeedback.trim().slice(0, 60);
      setVersions((v) => [
        {
          id: `v${v.length + 1}-${Date.now()}`,
          resume: resp.data!.tailored_resume,
          label: feedbackSnippet || `Regeneration ${v.length + 1}`,
          timestamp: Date.now(),
        },
        ...v,
      ]);
      // Persist the regenerated version to the tailoring record so it's
      // never lost — nothing about this download flow overwrites the
      // previous version; each regeneration becomes its own versioned entry.
      if (recordIdRef.current) {
        apiService
          .saveResumeVersion(recordIdRef.current, {
            tailored_resume: resp.data!.tailored_resume,
            source: "regenerated",
            user_feedback: regenFeedback.trim() || undefined,
            set_current: true,
          })
          .catch(() => { /* silent — best-effort */ });
      }
      setRegenFeedback("");
      setRegenView("regenerated");
      setInspectorTab("ats");
      toast.success(
        "Resume regenerated — previous version kept for comparison",
      );
      // Re-trigger ATS scoring for the new version
      atsAutoTriggered.current = false;
    }
  }, [result, regenFeedback]);

  const handleCoverLetter = useCallback(async () => {
    // Guard via ref so the in-flight check is stable across re-renders and
    // the callback identity doesn't change mid-generation. A re-invocation
    // while generating must NOT abort the existing request — it's a no-op.
    if (!result || coverLetterInFlightRef.current) return;
    coverLetterInFlightRef.current = true;
    const ctrl = new AbortController();
    coverLetterAbortRef.current = ctrl;
    setCoverLetterLoading(true);
    try {
      const resp = await apiService.generateCoverLetter(
        result.tailored_resume,
        result.jd_analysis,
        ctrl.signal,
      );
      if (ctrl.signal.aborted) return;
      if (resp.error) {
        toast.error("Cover letter generation failed", {
          description: resp.error,
        });
        return;
      }
      if (resp.data?.cover_letter) {
        setCoverLetter(resp.data.cover_letter);
        toast.success("Cover letter generated");
      }
    } finally {
      coverLetterInFlightRef.current = false;
      setCoverLetterLoading(false);
    }
  }, [result]);

  const handleStartNew = useCallback(() => {
    setJdText("");
    setResult(null);
    setTailorError("");
    setAtsLoading(false);
    setEditing(false);
    setRegenFeedback("");
    setRegenerating(false);
    setRegenError("");
    setPreviousResume(null);
    setRegenView("regenerated");
    setCoverLetter(null);
    setCoverLetterLoading(false);
    coverLetterInFlightRef.current = false;
    coverLetterAbortRef.current?.abort();
    setAddedKeywords(new Set());
    setInspectorTab("jd");
    setDownloadMenuOpen(false);
    setHistoryOpen(false);
    setVersions([]);
    setDismissedNudges(new Set());
    recordIdRef.current = null;
    atsAutoTriggered.current = false;
  }, []);

  const handleRestoreVersion = useCallback(
    (version: { resume: TailoredFullResume; label: string }) => {
      setResult((prev) =>
        prev
          ? { ...prev, tailored_resume: version.resume, ats_scores: undefined }
          : prev,
      );
      setPreviousResume(null);
      setRegenView("regenerated");
      setHistoryOpen(false);
      atsAutoTriggered.current = false;
      toast.success(`Restored "${version.label}"`);
    },
    [],
  );

  const handleDownloadCoverLetter = useCallback(async () => {
    if (!coverLetter || !result) return;
    setCoverLetterDownloading(true);
    const r = await apiService.downloadCoverLetterPDF(
      coverLetter,
      result.tailored_resume.contact?.name || "",
      result.jd_analysis.job_title || "",
      result.jd_analysis.company &&
        result.jd_analysis.company !== "Not specified"
        ? result.jd_analysis.company
        : "",
    );
    setCoverLetterDownloading(false);
    if (r.error) {
      toast.error("Download failed", { description: r.error });
      return;
    }
    if (r.data) {
      const u = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = u;
      a.download =
        r.filename ||
        buildCoverLetterFilename(
          result.tailored_resume.contact?.name || "",
          result.jd_analysis.job_title || "",
          "pdf",
        );
      a.click();
      URL.revokeObjectURL(u);
      toast.success("Cover letter downloaded");
    }
  }, [coverLetter, result]);

  if (loadingCheck)
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 rounded-xl bg-gray-100/40 dark:bg-gray-800/40" />
        <div className="h-48 rounded-xl bg-gray-100/20 dark:bg-gray-800/20" />
      </div>
    );
  if (resumeLoadError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
        <p className="text-sm text-red-300">{resumeLoadError}</p>
        <button
          type="button"
          onClick={checkResumes}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-200"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }
  if (hasResumes === false)
    return <OnboardingHero onUploaded={() => setHasResumes(true)} />;

  // Derive progress stepper state — 1: upload done, 2: JD entered, 3: tailored result
  const currentStep: 1 | 2 | 3 = result ? 3 : jdText.trim().length > 20 ? 2 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <StreakWidget />

      <SmartFiltersInline />

      {/* Horizontal progress stepper */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm px-4 sm:px-8 py-4 shadow-sm">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {[
            { n: 1 as const, label: "Upload Resume" },
            { n: 2 as const, label: "Add Job Description" },
            { n: 3 as const, label: "Review & Download" },
          ].map((s, i, arr) => {
            const status =
              currentStep > s.n
                ? "done"
                : currentStep === s.n
                  ? "active"
                  : "upcoming";
            return (
              <Fragment key={s.n}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                      status === "done"
                        ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/30"
                        : status === "active"
                          ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white ring-4 ring-purple-500/20 shadow-lg shadow-purple-500/30"
                          : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {status === "done" ? (
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      s.n
                    )}
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-medium hidden sm:inline transition-colors ${
                      status === "active"
                        ? "text-gray-900 dark:text-white"
                        : status === "done"
                          ? "text-purple-600 dark:text-purple-300"
                          : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 max-w-[80px] rounded-full transition-colors duration-500 ${currentStep > s.n ? "bg-gradient-to-r from-purple-500 to-indigo-500" : "bg-gray-200 dark:bg-gray-800"}`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Error banner */}
      {tailorError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-red-500/30 bg-red-500/5 backdrop-blur-sm px-5 py-4 flex items-start gap-3"
        >
          <XCircleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{tailorError}</p>
        </motion.div>
      )}

      {/* Smart nudge bar — contextual suggestions based on current state.
          Rules fire in priority order; first match wins, user can dismiss each. */}
      {result &&
        (() => {
          type Nudge = {
            id: string;
            icon: string;
            text: React.ReactNode;
            actionLabel?: string;
            onAction?: () => void;
          };
          const nudges: Nudge[] = [];

          // Score improvement after regen
          if (versions.length >= 2 && result.ats_scores) {
            nudges.push({
              id: `improved-${versions[0].id}`,
              icon: "✨",
              text: (
                <>
                  Resume regenerated —{" "}
                  <strong className="text-gray-900 dark:text-white">
                    ATS score is now {result.ats_scores.overall}/100
                  </strong>
                  . Download your updated version when ready.
                </>
              ),
              actionLabel: "Download PDF",
              onAction: () => handleDownload("pdf"),
            });
          }

          // Low skills alignment or weak scores
          if (
            result.ats_scores &&
            result.ats_scores.skills_alignment < 70 &&
            result.ats_scores.missing_keywords &&
            result.ats_scores.missing_keywords.length > 0
          ) {
            const top = result.ats_scores.missing_keywords.slice(0, 2);
            nudges.push({
              id: `skills-${result.ats_scores.overall}`,
              icon: "💡",
              text: (
                <>
                  Your Skills Alignment is{" "}
                  <strong className="text-amber-500 dark:text-amber-400">
                    {result.ats_scores.skills_alignment}
                  </strong>{" "}
                  — try adding{" "}
                  <strong className="text-gray-900 dark:text-white">
                    "{top.join('"')}"
                  </strong>
                  {top.length > 1 ? " and " : ""}
                  <strong className="text-gray-900 dark:text-white">
                    "{top[top.length - 1]}"
                  </strong>{" "}
                  to bump it.
                </>
              ),
              actionLabel: "Review in ATS",
              onAction: () => setInspectorTab("ats"),
            });
          }

          // Cover letter not yet generated
          if (!coverLetter && !coverLetterLoading) {
            nudges.push({
              id: "cover-letter",
              icon: "📝",
              text: (
                <>
                  You haven't generated a cover letter yet. It takes about{" "}
                  <strong className="text-gray-900 dark:text-white">
                    15 seconds
                  </strong>
                  .
                </>
              ),
              actionLabel: "Generate",
              onAction: () => {
                setInspectorTab("cover");
                setTimeout(handleCoverLetter, 300);
              },
            });
          }

          // Pick first undismissed nudge
          const active = nudges.find((n) => !dismissedNudges.has(n.id));
          if (!active) return null;

          return (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="relative rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-purple-500/10 border border-purple-500/20 px-4 py-3 flex items-center justify-between gap-3 overflow-hidden"
            >
              {/* Subtle gradient shine */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent"
                aria-hidden="true"
              />
              <div className="relative flex items-center gap-2.5 text-sm min-w-0">
                <span
                  className="text-lg leading-none shrink-0"
                  aria-hidden="true"
                >
                  {active.icon}
                </span>
                <p className="text-gray-700 dark:text-gray-300 leading-snug min-w-0">
                  {active.text}
                </p>
              </div>
              <div className="relative flex items-center gap-2 shrink-0">
                {active.actionLabel && active.onAction && (
                  <button
                    onClick={active.onAction}
                    className="text-xs font-semibold text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-500/10 transition-all whitespace-nowrap"
                  >
                    {active.actionLabel} →
                  </button>
                )}
                <button
                  onClick={() =>
                    setDismissedNudges((d) => new Set(d).add(active.id))
                  }
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all p-1 rounded"
                  aria-label="Dismiss"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </motion.div>
          );
        })()}

      {/* ─── SPLIT-VIEW ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-5 items-start">
        {/* ═══ LEFT COLUMN — Resume preview / empty state.
             No local scroll — the main body handles all scrolling, so there's
             a single scroll context and the sticky navbar can't be clipped. ═══ */}
        <section
          className="min-w-0 lg:sticky lg:top-24 lg:self-start"
          aria-label="Resume preview"
        >
          <div className="relative rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-gray-50/40 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/30 overflow-hidden flex flex-col lg:max-h-[calc(100vh-140px)]">
            {/* Resume strength meter — vertical gradient bar on the left edge,
                driven by ATS overall score. Always present while a result is loaded. */}
            {result?.ats_scores &&
              (() => {
                const s = result.ats_scores.overall;
                const color =
                  s >= 80
                    ? "from-emerald-500 to-emerald-400"
                    : s >= 60
                      ? "from-amber-500 to-amber-400"
                      : "from-red-500 to-red-400";
                return (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 overflow-hidden z-10"
                    aria-hidden="true"
                  >
                    <div
                      className={`absolute left-0 right-0 bottom-0 bg-gradient-to-t ${color} transition-all duration-1000 ease-out`}
                      style={{ height: `${s}%` }}
                      title={`Resume strength ${s}%`}
                    />
                  </div>
                );
              })()}
            {/* Frame header — status label + Tailored/Original segmented control + Revert.
                "New Tailor" lives in the bottom toolbar to avoid duplication. */}
            <div className="shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-white/[0.07] flex items-center justify-between gap-3 bg-white/50 dark:bg-gray-900/60 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {result
                    ? "Tailored Resume"
                    : analyzingJD || tailoring
                      ? "Tailoring…"
                      : "Resume Preview"}
                </p>
                {previousResume && (
                  <div
                    role="tablist"
                    aria-label="Resume version"
                    className="inline-flex rounded-lg bg-gray-200/70 dark:bg-gray-800/70 p-0.5 border border-gray-300 dark:border-white/10"
                  >
                    {[
                      {
                        key: "regenerated" as const,
                        label: "Tailored",
                        active:
                          "bg-purple-500/20 text-purple-600 dark:text-purple-300 ring-1 ring-purple-500/30 shadow-sm",
                      },
                      {
                        key: "previous" as const,
                        label: "Original",
                        active:
                          "bg-white dark:bg-white/10 text-gray-900 dark:text-white ring-1 ring-gray-300 dark:ring-white/20 shadow-sm",
                      },
                      {
                        key: "diff" as const,
                        label: "Diff",
                        active:
                          "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-1 ring-amber-500/30 shadow-sm",
                      },
                    ].map((t) => (
                      <button
                        key={t.key}
                        role="tab"
                        aria-selected={regenView === t.key}
                        onClick={() => setRegenView(t.key)}
                        className={`relative px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                          regenView === t.key
                            ? t.active
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {result && versions.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setHistoryOpen((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:border-purple-500/40 hover:text-purple-600 dark:hover:text-purple-300 transition-all"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      History
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/25">
                        {versions.length}
                      </span>
                    </button>
                    {historyOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setHistoryOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full right-0 mt-2 w-72 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 shadow-2xl shadow-black/20 p-1.5 z-20 overflow-hidden"
                        >
                          <div className="px-3 py-2 border-b border-gray-200 dark:border-white/[0.07] mb-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Version History
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                              Click any version to restore it
                            </p>
                          </div>
                          <div className="max-h-80 overflow-y-auto">
                            {versions.map((v, idx) => {
                              const isCurrent = idx === 0;
                              const ageMin = Math.max(
                                1,
                                Math.floor((Date.now() - v.timestamp) / 60000),
                              );
                              return (
                                <button
                                  key={v.id}
                                  onClick={() => handleRestoreVersion(v)}
                                  disabled={isCurrent}
                                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                                    isCurrent
                                      ? "bg-purple-500/10 cursor-default"
                                      : "hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <span
                                      className={`text-xs font-semibold ${isCurrent ? "text-purple-600 dark:text-purple-300" : "text-gray-900 dark:text-white"}`}
                                    >
                                      v{versions.length - idx}
                                      {isCurrent && " · current"}
                                    </span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                                      {idx === versions.length - 1
                                        ? "uploaded"
                                        : `${ageMin}m ago`}
                                    </span>
                                  </div>
                                  <p
                                    className={`text-[11px] leading-snug truncate ${isCurrent ? "text-purple-600/80 dark:text-purple-300/80" : "text-gray-600 dark:text-gray-400"}`}
                                  >
                                    {v.label}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </div>
                )}
                {result && previousResume && (
                  <button
                    onClick={() => {
                      if (previousResume) {
                        setResult((prev) =>
                          prev
                            ? {
                                ...prev,
                                tailored_resume: previousResume,
                                ats_scores: undefined,
                              }
                            : prev,
                        );
                        setPreviousResume(null);
                        setRegenView("regenerated");
                        toast.success("Reverted to previous version");
                        atsAutoTriggered.current = false;
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:border-purple-500/40 hover:text-purple-600 dark:hover:text-purple-300 transition-all"
                  >
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                    Revert
                  </button>
                )}
              </div>
            </div>

            {/* Body — scrolls independently so the left preview stays pinned
                 and matches the inspector column height on large screens. */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {result ? (
                <div className="p-3 sm:p-5 bg-gray-100/60 dark:bg-gray-950/80 space-y-3">
                  {/* "What Changed" stats — only shown when a previous version exists
                    (i.e., the user regenerated at least once). Builds instant confidence
                    that the regeneration actually did something. */}
                  {previousResume &&
                    (() => {
                      const prev = previousResume;
                      const curr = result.tailored_resume;
                      const prevBullets = new Set<string>();
                      const currBullets = new Set<string>();
                      for (const e of prev.experience || [])
                        for (const b of e.bullets || [])
                          prevBullets.add(b.trim());
                      for (const p of prev.projects || [])
                        for (const b of p.bullets || [])
                          prevBullets.add(b.trim());
                      for (const e of curr.experience || [])
                        for (const b of e.bullets || [])
                          currBullets.add(b.trim());
                      for (const p of curr.projects || [])
                        for (const b of p.bullets || [])
                          currBullets.add(b.trim());
                      const added = [...currBullets].filter(
                        (b) => !prevBullets.has(b),
                      ).length;
                      const removed = [...prevBullets].filter(
                        (b) => !currBullets.has(b),
                      ).length;
                      const edited = Math.min(added, removed); // best-effort heuristic
                      const prevSkills = new Set<string>();
                      const currSkills = new Set<string>();
                      for (const v of Object.values(prev.skills || {}))
                        if (Array.isArray(v))
                          v.forEach((s) => prevSkills.add(s.toLowerCase()));
                      for (const v of Object.values(curr.skills || {}))
                        if (Array.isArray(v))
                          v.forEach((s) => currSkills.add(s.toLowerCase()));
                      const keywordsAdded = [...currSkills].filter(
                        (s) => !prevSkills.has(s),
                      ).length;
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 border border-purple-500/20 p-4"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-md bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                              <SparklesIcon className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                              What Changed
                            </p>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              vs previous version
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              {
                                n: added,
                                label: "bullets added",
                                cls: "text-emerald-600 dark:text-emerald-400",
                                sign: "+",
                              },
                              {
                                n: removed,
                                label: "bullets removed",
                                cls: "text-red-500 dark:text-red-400",
                                sign: "−",
                              },
                              {
                                n: edited,
                                label: "bullets edited",
                                cls: "text-amber-500 dark:text-amber-400",
                                sign: "~",
                              },
                              {
                                n: keywordsAdded,
                                label: "keywords added",
                                cls: "text-purple-600 dark:text-purple-300",
                                sign: "+",
                              },
                            ].map((stat, i) => (
                              <div
                                key={i}
                                className="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.07] p-2.5"
                              >
                                <p
                                  className={`text-lg font-bold tabular-nums leading-none ${stat.cls}`}
                                >
                                  {stat.sign}
                                  {stat.n}
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                  {stat.label}
                                </p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })()}

                  <motion.div
                    key={`loaded-${regenView}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-white text-gray-900 rounded-xl shadow-inner shadow-black/10"
                  >
                    {previousResume && regenView === "diff" ? (
                      <ResumeDiffView
                        prev={previousResume}
                        curr={result.tailored_resume}
                      />
                    ) : previousResume && regenView === "previous" ? (
                      <ResumePreview resume={previousResume} />
                    ) : (
                      <ResumePreview resume={result.tailored_resume} />
                    )}
                  </motion.div>
                </div>
              ) : analyzingJD || tailoring ? (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  ref={progressRef}
                  className="px-6 sm:px-8 py-8 sm:py-10 min-h-[480px] flex flex-col"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10">
                        <div className="absolute inset-0 rounded-full border-2 border-gray-300 dark:border-gray-700" />
                        <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
                          Tailoring your resume
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {tailorElapsed >= 90
                            ? "Taking longer than expected"
                            : "Usually takes 30–60 seconds"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tailorElapsed > 0 && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums font-medium">
                          {tailorElapsed}s
                        </span>
                      )}
                      {tailorElapsed >= 90 && (
                        <button
                          onClick={handleCancel}
                          className="px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-white/10 rounded-md hover:border-red-400/60 hover:text-red-400 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  <ol className="space-y-3 flex-1">
                    {[
                      {
                        key: "analyze",
                        label: "Extract job requirements",
                        hint: "Pulling skills, responsibilities, and ATS keywords",
                      },
                      {
                        key: "tailor",
                        label: "Tailor resume content",
                        hint: "Rewriting bullets and summary to match the role",
                      },
                      {
                        key: "augment",
                        label: "Optimize keywords & impact",
                        hint: "Injecting metrics, filling gaps, hardening for ATS",
                      },
                      {
                        key: "render",
                        label: "Finalize and format",
                        hint: "Preparing PDF and DOCX output",
                      },
                    ].map((step, i) => {
                      // Visual step mapping for the combined extract+tailor
                      // job (~70-80s typical). The single backend invocation
                      // is split into 4 visual phases:
                      //  0 (analyze):   T=0  -> 12s  (handled by analyzingJD)
                      //  1 (tailor):    T=12 -> 25s  (~13s window)
                      //  2 (augment):   T=25 -> 55s  (~30s — matches augmenter pipeline)
                      //  3 (finalize):  T=55s+      (final stretch)
                      const current = analyzingJD
                        ? 0
                        : !tailoring
                          ? -1
                          : tailorElapsed < 25
                            ? 1
                            : tailorElapsed < 55
                              ? 2
                              : 3;
                      const status =
                        i < current
                          ? "done"
                          : i === current
                            ? "active"
                            : "pending";
                      return (
                        <li key={step.key} className="flex items-start gap-3">
                          <div
                            className={`shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                              status === "done"
                                ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40"
                                : status === "active"
                                  ? "bg-purple-500/15 text-purple-400 ring-2 ring-purple-500/40 animate-pulse"
                                  : "bg-gray-200 dark:bg-gray-800/60 text-gray-400 dark:text-gray-600 ring-1 ring-gray-300 dark:ring-white/10"
                            }`}
                          >
                            {status === "done" ? (
                              <svg
                                className="w-3.5 h-3.5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : status === "active" ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            ) : (
                              <span className="w-1 h-1 rounded-full bg-current" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p
                              className={`text-[14px] font-medium transition-colors ${
                                status === "done"
                                  ? "text-emerald-500 dark:text-emerald-400"
                                  : status === "active"
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-500"
                              }`}
                            >
                              {step.label}
                            </p>
                            {status === "active" && (
                              <>
                                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                                  {step.hint}
                                </p>
                                <div className="mt-2 h-1 rounded-full bg-gray-200 dark:bg-white/5 overflow-hidden">
                                  <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse" />
                                </div>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center py-20 px-6 text-center min-h-[480px]"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center mb-4 ring-1 ring-purple-500/30">
                    <FileIcon className="w-7 h-7 text-purple-500 dark:text-purple-400" />
                  </div>
                  <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                    Ready to tailor
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs leading-relaxed">
                    Paste a job description in the{" "}
                    <span className="text-purple-600 dark:text-purple-400 font-medium">
                      Job Description
                    </span>{" "}
                    panel on the right and click{" "}
                    <span className="text-purple-600 dark:text-purple-400 font-medium">
                      Tailor My Resume
                    </span>{" "}
                    to begin.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-500">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                    Resume uploaded — ready to go
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* ═══ RIGHT COLUMN — Tabbed inspector.
             Flows with the main page scroll (no nested overflow). ═══ */}
        <section className="min-w-0 flex flex-col" aria-label="Inspector">
          {/* Tab bar */}
          <div
            role="tablist"
            className="flex gap-1 bg-gray-100/80 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl p-1.5 border border-gray-200 dark:border-white/[0.07] mb-4 overflow-x-auto hide-scrollbar"
          >
            {[
              {
                key: "jd" as const,
                label: "Job Description",
                icon: <ClipboardIcon className="w-4 h-4" />,
                disabled: false,
              },
              {
                key: "ats" as const,
                label: "ATS Score",
                icon: <MagnifyingGlassIcon className="w-4 h-4" />,
                disabled: !result,
              },
              {
                key: "regenerate" as const,
                label: "Regenerate",
                icon: <ArrowPathIcon className="w-4 h-4" />,
                disabled: !result,
              },
              {
                key: "cover" as const,
                label: "Cover Letter",
                icon: <SparklesIcon className="w-4 h-4" />,
                disabled: !result,
              },
            ].map((t) => {
              const active = inspectorTab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${t.key}`}
                  disabled={t.disabled}
                  onClick={() => setInspectorTab(t.key)}
                  className={`relative flex-1 inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl text-[12px] sm:text-[13px] font-medium whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 ${
                    active
                      ? "text-purple-600 dark:text-purple-300"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="inspector-tab-pill"
                      className="absolute inset-0 rounded-xl bg-purple-500/15 ring-1 ring-purple-500/30"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative shrink-0">{t.icon}</span>
                  <span className="relative hidden sm:inline">{t.label}</span>
                  {t.key === "ats" && result?.ats_scores && (
                    <span
                      className={`relative ml-0.5 text-[10px] font-bold tabular-nums ${result.ats_scores.overall >= 80 ? "text-emerald-500 dark:text-emerald-400" : result.ats_scores.overall >= 60 ? "text-amber-500 dark:text-amber-400" : "text-red-500 dark:text-red-400"}`}
                    >
                      {result.ats_scores.overall}
                    </span>
                  )}
                  {t.key === "ats" && atsLoading && (
                    <span className="relative w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                  {t.key === "cover" && coverLetter && !coverLetterLoading && (
                    <span className="relative flex w-1.5 h-1.5">
                      <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping" />
                      <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </span>
                  )}
                  {t.key === "cover" && coverLetterLoading && (
                    <span className="relative w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab panels */}
          <AnimatePresence mode="wait">
            <motion.div
              key={inspectorTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              role="tabpanel"
              id={`panel-${inspectorTab}`}
              className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20"
            >
              {/* ── TAB 1: Job Description ── */}
              {inspectorTab === "jd" && (
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        Job Description
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Paste the complete job posting — we'll extract
                        requirements automatically
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {pendingJobUrl && !jdText && (
                        <button
                          onClick={async () => {
                            if (retryingJdFetch) return;
                            setRetryingJdFetch(true);
                            const fetching = toast.loading('Fetching JD…', { duration: 50000 });
                            try {
                              const r = await apiService.fetchJobDescription(pendingJobUrl);
                              toast.dismiss(fetching);
                              if (r.data?.ok && r.data.jd_text) {
                                setJdText(r.data.jd_text);
                                try {
                                  sessionStorage.setItem(
                                    `jd_cache:${pendingJobUrl}`,
                                    JSON.stringify({ text: r.data.jd_text, at: Date.now() }),
                                  );
                                } catch { /* quota */ }
                                toast.success('JD fetched — review and tailor.');
                              } else {
                                toast.warning(
                                  r.data?.error || "Still couldn't fetch — open the posting and paste manually.",
                                  { duration: 8000 },
                                );
                              }
                            } catch {
                              toast.dismiss(fetching);
                              toast.error('Network issue — try again or paste manually.');
                            } finally {
                              setRetryingJdFetch(false);
                            }
                          }}
                          disabled={analyzingJD || tailoring || retryingJdFetch}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all disabled:opacity-50"
                          title={`Re-attempt auto-fetch from ${(() => { try { return new URL(pendingJobUrl).hostname; } catch { return pendingJobUrl; } })()}`}
                        >
                          {retryingJdFetch ? (
                            <span className="inline-block h-3 w-3 rounded-full border-2 border-purple-500/60 border-t-transparent animate-spin" />
                          ) : (
                            <span>↻</span>
                          )}
                          {retryingJdFetch ? 'Fetching…' : 'Retry JD fetch'}
                        </button>
                      )}
                      {pendingJobUrl && (
                        <a
                          href={pendingJobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-500/10 transition-all"
                          title="Open the original posting in a new tab"
                        >
                          Open posting ↗
                        </a>
                      )}
                      <button
                        onClick={async () => {
                          try {
                            const t = await navigator.clipboard.readText();
                            if (t) setJdText(t.slice(0, 10000));
                          } catch {
                            toast.error("Clipboard access denied");
                          }
                        }}
                        disabled={analyzingJD || tailoring}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-300 hover:bg-purple-500/10 transition-all disabled:opacity-50"
                      >
                        <ClipboardIcon className="w-3.5 h-3.5" />
                        Paste
                      </button>
                      {jdText && (
                        <button
                          onClick={() => setJdText("")}
                          disabled={analyzingJD || tailoring}
                          className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-red-400 transition-colors px-2 py-1.5 disabled:opacity-50"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      placeholder="Paste the job description here — we'll extract key requirements and tailor your resume automatically..."
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      rows={10}
                      maxLength={10000}
                      disabled={analyzingJD || tailoring}
                      className="w-full min-h-[280px] px-4 py-3 rounded-xl bg-white dark:bg-gray-900/60 border border-gray-300 dark:border-white/10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 transition-all disabled:opacity-50"
                    />
                    <span className="absolute bottom-3 right-3 text-[10px] text-gray-400 dark:text-gray-500 tabular-nums pointer-events-none">
                      {jdText.length.toLocaleString()} / 10,000
                    </span>
                  </div>

                  {/* Extracted requirements preview (after analysis) —
                      chips are color-coded: green = found in resume, amber = missing. */}
                  {result?.jd_analysis &&
                    (() => {
                      // Build a normalized set of words present in the tailored resume
                      // (skills + summary + all experience bullets + project bullets) so we can
                      // match JD skills against what the candidate actually has.
                      const resumeHaystack = (() => {
                        const r = result.tailored_resume;
                        const parts: string[] = [];
                        const sk = r.skills || {};
                        for (const v of Object.values(sk)) {
                          if (Array.isArray(v)) parts.push(...v);
                        }
                        parts.push(r.summary || "");
                        for (const exp of r.experience || []) {
                          parts.push(exp.title || "", ...(exp.bullets || []));
                        }
                        for (const p of r.projects || []) {
                          parts.push(p.name || "", ...(p.bullets || []));
                        }
                        return parts.join(" ").toLowerCase();
                      })();
                      const isMatched = (skill: string) => {
                        const s = skill.toLowerCase().trim();
                        if (!s) return false;
                        return resumeHaystack.includes(s);
                      };

                      return (
                        <div className="relative pt-3 mt-1">
                          {/* Connector line from the textarea above */}
                          <div className="absolute -top-0 left-8 w-px h-3 bg-purple-500/30" />
                          <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.07] p-4 space-y-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <SparklesIcon className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-600 dark:text-gray-300">
                                Extracted Requirements
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                — auto-detected from job posting
                              </span>
                            </div>

                            <div>
                              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-500 mb-1">
                                Role
                              </p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {result.jd_analysis.job_title}
                                {result.jd_analysis.company &&
                                  result.jd_analysis.company !==
                                    "Not specified" && (
                                    <>
                                      {" "}
                                      at{" "}
                                      <span className="text-gray-700 dark:text-gray-300">
                                        {result.jd_analysis.company}
                                      </span>
                                    </>
                                  )}
                              </p>
                            </div>

                            {result.jd_analysis.required_skills?.length > 0 &&
                              (() => {
                                const skills =
                                  result.jd_analysis.required_skills.slice(
                                    0,
                                    14,
                                  );
                                const matchedCount =
                                  skills.filter(isMatched).length;
                                return (
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-500">
                                        Required skills
                                      </p>
                                      <span className="text-[10px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                                        {matchedCount}/{skills.length} matched
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {skills.map((s) => {
                                        const matched = isMatched(s);
                                        return (
                                          <span
                                            key={s}
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                              matched
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25"
                                                : "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25"
                                            }`}
                                          >
                                            {matched ? (
                                              <svg
                                                className="w-3 h-3"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                              >
                                                <path
                                                  fillRule="evenodd"
                                                  d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                                                  clipRule="evenodd"
                                                />
                                              </svg>
                                            ) : (
                                              <span className="text-[11px] leading-none">
                                                +
                                              </span>
                                            )}
                                            {s}
                                          </span>
                                        );
                                      })}
                                      {result.jd_analysis.required_skills
                                        .length > 14 && (
                                        <span className="text-[10px] text-gray-500 dark:text-gray-500 self-center">
                                          +
                                          {result.jd_analysis.required_skills
                                            .length - 14}{" "}
                                          more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                            {result.jd_analysis.preferred_skills?.length >
                              0 && (
                              <div>
                                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-500 mb-2">
                                  Preferred skills
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {result.jd_analysis.preferred_skills
                                    .slice(0, 10)
                                    .map((s) => {
                                      const matched = isMatched(s);
                                      return (
                                        <span
                                          key={s}
                                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                                            matched
                                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25"
                                              : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10"
                                          }`}
                                        >
                                          {matched && (
                                            <svg
                                              className="w-2.5 h-2.5"
                                              viewBox="0 0 20 20"
                                              fill="currentColor"
                                            >
                                              <path
                                                fillRule="evenodd"
                                                d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                              />
                                            </svg>
                                          )}
                                          {s}
                                        </span>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {/* Legend */}
                            <div className="flex gap-4 text-[10px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-white/[0.05]">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                Found in your resume
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                Missing — consider adding
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  {/* Quota-exhausted banner — shown ABOVE the button so the
                      user knows why before they paste anything. */}
                  {dailyUsage?.remaining === 0 && (
                    <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-200/60 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 text-xs font-bold">!</span>
                        <div className="flex-1 text-sm">
                          <p className="font-semibold text-amber-900 dark:text-amber-200">
                            Daily limit reached — {dailyUsage.limit} of {dailyUsage.limit} used
                          </p>
                          <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80 leading-relaxed">
                            I cap tailoring at {dailyUsage.limit} per UTC day so the AI stays free
                            for everyone. Counter resets at midnight UTC. Need more for an active
                            job-hunt push?
                          </p>
                          <button
                            type="button"
                            onClick={() => setQuotaDialog(dailyUsage)}
                            className="mt-2 text-xs font-semibold text-amber-900 dark:text-amber-200 underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-100"
                          >
                            Request more →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      // Don't silently no-op when out of quota — surface
                      // the dialog so the user knows why and can act.
                      if (dailyUsage?.remaining === 0) {
                        setQuotaDialog(dailyUsage);
                        return;
                      }
                      handleTailoring();
                    }}
                    disabled={!jdText.trim() || analyzingJD || tailoring}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.98] transition-all duration-200"
                  >
                    {analyzingJD || tailoring ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Tailoring…
                      </>
                    ) : dailyUsage?.remaining === 0 ? (
                      <>
                        <SparklesIcon className="w-4 h-4" />
                        Daily limit reached — see options
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="w-4 h-4" />
                        {result ? "Re-tailor with new JD" : "Tailor My Resume"}
                      </>
                    )}
                  </button>
                  <div className="mt-2 flex justify-center">
                    <DailyUsageBadge usage={dailyUsage} loading={usageLoading} />
                  </div>
                </div>
              )}

              {/* ── TAB 2: ATS Score ── */}
              {inspectorTab === "ats" && result && (
                <div className="p-5 sm:p-6 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto overscroll-contain">
                  {result.ats_scores ? (
                    <ATSPanel
                      scores={result.ats_scores}
                      onAddKeyword={handleAddKeyword}
                      addedKeywords={addedKeywords}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="relative w-14 h-14 mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-gray-300 dark:border-gray-700" />
                        <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Analyzing ATS compatibility…
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                        Checking against Workday, Greenhouse, Lever, and more
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: Regenerate ── */}
              {inspectorTab === "regenerate" && result && (
                <div className="p-5 sm:p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
                      <ArrowPathIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        Regenerate Resume
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Refine with feedback — your current version is kept for
                        comparison
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const SUGGESTIONS: {
                      tier: "high" | "style" | "extra";
                      label: string;
                    }[] = [
                      { tier: "high", label: "Quantify impact with numbers" },
                      { tier: "high", label: "Add more metrics to bullets" },
                      {
                        tier: "high",
                        label: "Highlight cloud / AWS experience",
                      },
                      { tier: "style", label: "Make the summary more concise" },
                      { tier: "style", label: "Use stronger action verbs" },
                      { tier: "style", label: "Make it more technical" },
                      {
                        tier: "extra",
                        label: "Emphasize leadership experience",
                      },
                      {
                        tier: "extra",
                        label: "Add team / collaboration keywords",
                      },
                    ];
                    const selected = SUGGESTIONS.filter((s) =>
                      regenFeedback
                        .toLowerCase()
                        .includes(s.label.toLowerCase().slice(0, 20)),
                    );

                    const chipCls = (
                      tier: "high" | "style" | "extra",
                      already: boolean,
                    ) => {
                      if (already) {
                        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 ring-1 ring-emerald-500/20 cursor-default";
                      }
                      if (tier === "high")
                        return "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30 font-semibold hover:bg-purple-500/20 hover:border-purple-500/50 hover:-translate-y-px";
                      if (tier === "style")
                        return "bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-purple-500/40 hover:text-purple-600 dark:hover:text-purple-300 hover:-translate-y-px";
                      return "bg-gray-50 dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/[0.07] hover:border-purple-500/30 hover:text-gray-700 dark:hover:text-gray-200";
                    };

                    const Chip = ({
                      hint,
                    }: {
                      hint: { tier: "high" | "style" | "extra"; label: string };
                    }) => {
                      const already = regenFeedback
                        .toLowerCase()
                        .includes(hint.label.toLowerCase().slice(0, 20));
                      return (
                        <button
                          type="button"
                          disabled={already || regenerating}
                          onClick={() =>
                            setRegenFeedback((f) => {
                              if (!f.trim()) return hint.label + ".";
                              if (
                                f
                                  .toLowerCase()
                                  .includes(
                                    hint.label.toLowerCase().slice(0, 20),
                                  )
                              )
                                return f;
                              return (
                                f.trim().replace(/\.?$/, ".") +
                                " " +
                                hint.label +
                                "."
                              );
                            })
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition-all ${chipCls(hint.tier, already)}`}
                        >
                          {already ? (
                            <svg
                              className="w-3 h-3"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : hint.tier === "high" ? (
                            <svg
                              className="w-3 h-3"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                            </svg>
                          ) : (
                            <span className="text-[11px] leading-none">+</span>
                          )}
                          {hint.label}
                        </button>
                      );
                    };

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Quick suggestions
                          </p>
                          {selected.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              {selected.length} selected
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-500 dark:text-purple-400 mb-1.5 flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                            </svg>
                            High impact
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {SUGGESTIONS.filter((s) => s.tier === "high").map(
                              (s) => (
                                <Chip key={s.label} hint={s} />
                              ),
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                            Style
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {SUGGESTIONS.filter((s) => s.tier === "style").map(
                              (s) => (
                                <Chip key={s.label} hint={s} />
                              ),
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 mb-1.5">
                            Extras
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {SUGGESTIONS.filter((s) => s.tier === "extra").map(
                              (s) => (
                                <Chip key={s.label} hint={s} />
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">
                      Custom instructions
                    </label>
                    <textarea
                      placeholder="Or write your own — e.g., 'Remove the summary and add a highlights section with top 3 achievements'"
                      value={regenFeedback}
                      onChange={(e) => setRegenFeedback(e.target.value)}
                      rows={5}
                      maxLength={2000}
                      disabled={regenerating}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900/60 border border-gray-300 dark:border-white/10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 transition-all disabled:opacity-50"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                        {regenFeedback.length} / 2,000
                      </span>
                      {regenError && (
                        <span className="text-xs text-red-400">
                          {regenError}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleRegenerate}
                    disabled={!regenFeedback.trim() || regenerating}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.98] transition-all duration-200"
                  >
                    {regenerating ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Regenerating…
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-4 h-4" />
                        Regenerate Resume
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ── TAB 4: Cover Letter ── */}
              {inspectorTab === "cover" && result && (
                <div className="p-5 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
                        <SparklesIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                          Cover Letter
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Personalized to the role and your resume
                        </p>
                      </div>
                    </div>
                    {!coverLetter && (
                      <button
                        onClick={handleCoverLetter}
                        disabled={coverLetterLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all"
                      >
                        {coverLetterLoading ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="w-4 h-4" />
                            Generate
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {coverLetter ? (
                    <>
                      <div className="rounded-xl bg-white dark:bg-gray-950/80 border border-gray-200 dark:border-white/[0.07] p-5 sm:p-6 max-h-[480px] overflow-y-auto shadow-inner shadow-black/5">
                        <div className="text-[14px] text-gray-800 dark:text-gray-100 leading-[1.75] whitespace-pre-line font-serif">
                          {coverLetter}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={handleDownloadCoverLetter}
                          disabled={coverLetterDownloading}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all"
                        >
                          <DocumentArrowDownIcon className="w-4 h-4" />
                          {coverLetterDownloading
                            ? "Preparing…"
                            : "Download PDF"}
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(coverLetter);
                            toast.success("Copied to clipboard");
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-white/10 border border-gray-300 dark:border-white/10 hover:bg-white dark:hover:bg-white/15 transition-all"
                        >
                          <ClipboardIcon className="w-4 h-4" />
                          Copy text
                        </button>
                        <button
                          onClick={() => setCoverLetter(null)}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                          Regenerate
                        </button>
                      </div>
                    </>
                  ) : coverLetterLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="relative w-14 h-14 mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-gray-300 dark:border-gray-700" />
                        <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Writing your cover letter…
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                        Matching your experience to the role. Usually takes
                        15–30 seconds.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 py-4">
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                        <SparklesIcon className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                          We'll generate a personalized 3-4 paragraph cover
                          letter tailored to{" "}
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {result.jd_analysis.job_title}
                          </span>
                          {result.jd_analysis.company &&
                          result.jd_analysis.company !== "Not specified" ? (
                            <>
                              {" "}
                              at{" "}
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {result.jd_analysis.company}
                              </span>
                            </>
                          ) : null}{" "}
                          using your tailored resume.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      {/* ═══ STICKY BOTTOM TOOLBAR ═══
          Contextual identity (icon + filename + "Tailored for X at Y") on the left,
          ATS match badge in the center, ghost actions + primary Download Resume
          dropdown on the right. The dropdown disambiguates PDF vs DOCX under
          a single clear CTA ("Download Resume") instead of two competing buttons. */}
      {result && !editing && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-950/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/[0.07] shadow-2xl shadow-black/10"
        >
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
            {/* LEFT — humanized resume identity */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center shrink-0">
                <FileIcon className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  Your Tailored Resume
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  Tailored for{" "}
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    {result.jd_analysis.job_title}
                  </span>
                  {result.jd_analysis.company &&
                    result.jd_analysis.company !== "Not specified" && (
                      <>
                        {" "}
                        at{" "}
                        <span className="text-gray-700 dark:text-gray-300">
                          {result.jd_analysis.company}
                        </span>
                      </>
                    )}
                  <span className="text-gray-400 dark:text-gray-600 mx-1.5">
                    ·
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">
                    just now
                  </span>
                </p>
              </div>
              {/* Mobile-only compact context */}
              <div className="min-w-0 sm:hidden">
                <p className="text-[11px] font-semibold text-gray-900 dark:text-white truncate">
                  Your Tailored Resume
                </p>
                <p className="text-[11px] text-purple-600 dark:text-purple-400 truncate">
                  {result.jd_analysis.job_title}
                </p>
              </div>
            </div>

            {/* CENTER — ATS match badge (lg+) */}
            {result.ats_scores && (
              <div
                className={`hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl border shrink-0 ${
                  result.ats_scores.overall >= 80
                    ? "bg-emerald-500/10 border-emerald-500/25"
                    : result.ats_scores.overall >= 60
                      ? "bg-amber-500/10 border-amber-500/25"
                      : "bg-red-500/10 border-red-500/25"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full animate-pulse ${result.ats_scores.overall >= 80 ? "bg-emerald-400" : result.ats_scores.overall >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                />
                <span
                  className={`text-xs font-semibold tabular-nums ${result.ats_scores.overall >= 80 ? "text-emerald-600 dark:text-emerald-400" : result.ats_scores.overall >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {result.ats_scores.overall}% ATS Match
                </span>
              </div>
            )}
            {atsLoading && !result.ats_scores && (
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Scoring…
                </span>
              </div>
            )}

            {/* RIGHT — escape hatch, ghost actions, primary dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleStartNew}
                title="Start a new tailor with a different job"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-500/10 transition-all"
              >
                <SparklesIcon className="w-4 h-4" />
                <span className="hidden md:inline">New Tailor</span>
              </button>

              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Edit the tailored resume"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-500/10 transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
                <span className="hidden md:inline">Edit</span>
              </button>

              <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-0.5" />

              {/* Primary CTA — Download Resume with format dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDownloadMenuOpen((v) => !v)}
                  disabled={downloading !== null}
                  aria-haspopup="menu"
                  aria-expanded={downloadMenuOpen}
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.98] transition-all"
                >
                  {downloading !== null ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span className="hidden sm:inline">Preparing…</span>
                    </>
                  ) : (
                    <>
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Download Resume</span>
                      <span className="sm:hidden">Download</span>
                      <svg
                        className={`w-3.5 h-3.5 opacity-70 transition-transform ${downloadMenuOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </>
                  )}
                </button>
                {downloadMenuOpen && (
                  <>
                    {/* Click-outside catcher */}
                    <button
                      type="button"
                      aria-label="Close download menu"
                      className="fixed inset-0 z-10"
                      onClick={() => setDownloadMenuOpen(false)}
                    />
                    {/* Dropdown menu — pops up above the bar */}
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      role="menu"
                      className="absolute bottom-full right-0 mb-2 w-64 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 shadow-2xl shadow-black/20 p-1.5 z-20 overflow-hidden"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setDownloadMenuOpen(false);
                          handleDownload("pdf");
                        }}
                        disabled={downloading !== null}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-purple-500/10 flex items-center gap-3 transition-colors disabled:opacity-50 group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                          <DocumentArrowDownIcon className="w-4 h-4 text-red-500 dark:text-red-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Download as PDF
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Best for job applications
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setDownloadMenuOpen(false);
                          handleDownload("docx");
                        }}
                        disabled={downloading !== null}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-purple-500/10 flex items-center gap-3 transition-colors disabled:opacity-50 group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                          <DocumentArrowDownIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Download as DOCX
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Best for further editing
                          </p>
                        </div>
                      </button>
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Editor mode — full-screen overlay */}
      {result && editing && (
        <div className="fixed inset-0 z-[60] bg-gray-100 dark:bg-gray-950 overflow-y-auto overscroll-contain">
          <div className="max-w-7xl mx-auto px-0 sm:px-0 lg:px-0">
            <Suspense
              fallback={
                <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900/40 p-8">
                  <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                  <div className="mt-3 h-40 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                </div>
              }
            >
              <ResumeEditor
                resume={result.tailored_resume}
                jdAnalysis={result.jd_analysis}
                recordId={recordIdRef.current || undefined}
                onBack={() => setEditing(false)}
                onEditedVersionSaved={(versionId) => {
                  if (recordIdRef.current) {
                    apiService
                      .setCurrentResumeVersion(recordIdRef.current, versionId)
                      .catch(() => {});
                  }
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      <QuotaLimitDialog
        open={!!quotaDialog}
        onOpenChange={(o) => !o && setQuotaDialog(null)}
        usage={quotaDialog}
        onRequestMore={() =>
          feedback.open({
            type: "quota_bump",
            prefill:
              "Hi — I've hit my daily tailor limit and have an active job-hunt push. " +
              "Could you bump my limit? Here's the context:\n\n",
          })
        }
      />
    </motion.div>
  );
}

// ─── Page export ────────────────────────────────────────────────────────────
type ResumeNavItem = {
  key: NavTab;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  hint?: string;
};

/**
 * Top-level "rooms" — the 5 destinations shown on the left rail and the mobile
 * bottom bar. Every leaf `NavTab` that lives on the rail maps into exactly one
 * room; the room's own `tabs[0]` is its default sub-tab. Configure surfaces
 * (billing/notifications/profile/beta) intentionally live in the header user
 * menu, not in any room, so they never appear on the rail.
 */
type NavRoom = {
  key: string;
  label: string;
  icon: React.ReactNode;
  tabs: NavTab[];
};

const NAV_ITEMS: ResumeNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <DashboardIcon className="w-4 h-4" />,
    hint: "Your job-hunt overview",
  },
  {
    key: "tailor",
    label: "Tailor",
    icon: <SparklesIcon className="w-4 h-4" />,
    hint: "Single JD optimization",
  },
  {
    key: "batch",
    label: "Batch Tailor",
    icon: <ClipboardIcon className="w-4 h-4" />,
    hint: "Multi-JD pipeline",
  },
  {
    key: "my-resumes",
    label: "My Resumes",
    icon: <FileIcon className="w-4 h-4" />,
    hint: "Manage base resumes",
  },
  {
    key: "tailored",
    label: "Tailored Resumes",
    icon: <DocumentArrowDownIcon className="w-4 h-4" />,
    hint: "Versioned outputs",
  },
  {
    key: "applications",
    label: "Applications",
    icon: <ClipboardIcon className="w-4 h-4" />,
    hint: "Track hiring pipeline",
  },
  {
    key: "interview",
    label: "Interview Prep",
    icon: <SparklesIcon className="w-4 h-4" />,
    hint: "Practice + AI coach",
  },
  {
    key: "visa",
    label: "Visa Timeline",
    icon: <ShieldIcon className="w-4 h-4" />,
    badge: "Beta",
    hint: "F-1 / OPT / H-1B clocks",
  },
  {
    key: "beta",
    label: "Beta Lab",
    icon: <SparklesIcon className="w-4 h-4" />,
    badge: "Beta",
    hint: "Experimental features",
  },
  {
    key: "copilot",
    label: "Career Copilot",
    icon: <Bot className="w-4 h-4" />,
    hint: "Agentic RAG copilot",
  },
  {
    key: "jobs",
    label: "Job Opportunities",
    icon: <MagnifyingGlassIcon className="w-4 h-4" />,
    badge: "Beta",
    hint: "Discover and save roles",
  },
  {
    key: "career-portals",
    label: "Career Portals",
    icon: <Building2 className="w-4 h-4" />,
    badge: "New",
    hint: "Live Workday + ATS career pages",
  },
  {
    key: "auto-apply",
    label: "Auto-Apply",
    icon: <ShieldCheck className="w-4 h-4" />,
    badge: "New",
    hint: "Approve, then Aspirely submits",
  },
  {
    key: "learning",
    label: "Learning Hub",
    icon: <GraduationCap className="w-4 h-4" />,
    hint: "Study plans + skill→job loop",
  },
  {
    key: "events",
    label: "Events",
    icon: <Trophy className="w-4 h-4" />,
    hint: "Vetted hackathons & webinars",
  },
  {
    key: "network",
    label: "Network & Posts",
    icon: <Users className="w-4 h-4" />,
    hint: "Draft posts about your wins",
  },
  {
    key: "voicegraph",
    label: "Your Voice",
    icon: <Mic className="w-4 h-4" />,
    hint: "Teach us how you write",
  },
  {
    key: "six-seconds",
    label: "Six Seconds",
    icon: <Eye className="w-4 h-4" />,
    badge: "New",
    hint: "The recruiter's first-pass read",
  },
  {
    key: "pipeline",
    label: "Pipeline",
    icon: <TrendingUp className="w-4 h-4" />,
    hint: "Funnel, ghosts & cohort",
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: <Bell className="w-4 h-4" />,
    hint: "Channels, events & quiet hours",
  },
  {
    key: "billing",
    label: "Billing",
    icon: <CreditCard className="w-4 h-4" />,
    hint: "Plan + usage",
  },
  {
    key: "profile",
    label: "Profile",
    icon: <UserCircleIcon className="w-4 h-4" />,
    hint: "Identity + strategy",
  },
];

const ROOMS: NavRoom[] = [
  { key: "home", label: "Home", icon: <Home className="w-4 h-4" />, tabs: ["dashboard"] },
  {
    key: "discover",
    label: "Discover",
    icon: <Compass className="w-4 h-4" />,
    tabs: ["jobs", "career-portals", "visa"],
  },
  {
    key: "craft",
    label: "Craft",
    icon: <PenTool className="w-4 h-4" />,
    tabs: ["tailor", "batch", "my-resumes", "tailored", "six-seconds", "voicegraph"],
  },
  {
    key: "apply",
    label: "Apply",
    icon: <Send className="w-4 h-4" />,
    tabs: ["applications", "auto-apply", "pipeline"],
  },
  {
    key: "grow",
    label: "Grow",
    icon: <Sprout className="w-4 h-4" />,
    tabs: ["learning", "network", "events", "interview", "copilot"],
  },
];

// Configure surfaces, surfaced in the header user menu (not the rail). Each key
// still routes through selectNav to its unchanged leaf render.
const SETTINGS_MENU: NavTab[] = ["billing", "notifications", "profile", "beta"];

// The active room = the one whose `tabs` contains the current leaf tab. Configure
// surfaces (billing/notifications/profile/beta) belong to no room, so this returns
// undefined for them and the rail shows nothing highlighted — by design.
function roomForTab(tab: NavTab): NavRoom | undefined {
  return ROOMS.find((room) => room.tabs.includes(tab));
}

// Resolve a room's leaf items (label/icon/badge/hint) from NAV_ITEMS in order.
function roomItemsFor(room: NavRoom): ResumeNavItem[] {
  return room.tabs
    .map((key) => NAV_ITEMS.find((item) => item.key === key))
    .filter((item): item is ResumeNavItem => Boolean(item));
}

/**
 * Left rail: an expandable, grouped navigation. Each of the 5 rooms is a group
 * header; its sub-items (from NAV_ITEMS) list indented beneath it. The room that
 * owns the active tab is expanded by default; headers behave as an accordion
 * (click to open/close, one at a time). Selecting an item calls
 * onSelect(item.key). Every feature is therefore visible and reachable in ≤1-2
 * clicks from one place — no separate in-content sub-tab strip.
 *
 * Collapsed (icon-only) mode keeps the rail narrow: each room icon jumps to its
 * default tab, and hovering the rail expands it back to the full grouped list
 * (revealing every item — the flyout equivalent).
 */
function ResumeSectionNav({
  activeNav,
  collapsed = false,
  onSelect,
}: {
  activeNav: NavTab;
  collapsed?: boolean;
  onSelect: (tab: NavTab) => void;
}) {
  const reduceMotion = useReducedMotion();
  const activeRoomKey = roomForTab(activeNav)?.key;
  // Accordion state: a single open group, defaulting to (and following) the room
  // that owns the active tab. Users can still open a different group to browse.
  const [expandedRoom, setExpandedRoom] = useState<string | null>(activeRoomKey ?? null);
  useEffect(() => {
    if (activeRoomKey) setExpandedRoom(activeRoomKey);
  }, [activeRoomKey]);

  if (collapsed) {
    return (
      <nav className="flex flex-col items-center gap-1 px-2" aria-label="Workspace navigation">
        {ROOMS.map((room) => {
          const active = room.key === activeRoomKey;
          return (
            <button
              key={room.key}
              type="button"
              onClick={() => onSelect(room.tabs[0])}
              aria-current={active ? "page" : undefined}
              aria-label={room.label}
              title={room.label}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-150 ease-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {room.icon}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Workspace navigation">
      {ROOMS.map((room) => {
        const isActiveRoom = room.key === activeRoomKey;
        const expanded = expandedRoom === room.key;
        const items = roomItemsFor(room);
        return (
          <div key={room.key}>
            <button
              type="button"
              onClick={() => setExpandedRoom((cur) => (cur === room.key ? null : room.key))}
              aria-expanded={expanded}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-150 ease-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar ${
                isActiveRoom ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center transition-colors ${
                  isActiveRoom ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {room.icon}
              </span>
              <span className="min-w-0 flex-1 truncate text-left leading-tight">{room.label}</span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-expo ${
                  expanded ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={reduceMotion ? {} : { height: "auto", opacity: 1 }}
                  exit={reduceMotion ? {} : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <ul className="ml-[1.55rem] flex flex-col gap-0.5 border-l border-sidebar-border pb-1 pl-2 pt-0.5">
                    {items.map((item) => {
                      const active = activeNav === item.key;
                      return (
                        <li key={item.key} className="list-none">
                          <button
                            type="button"
                            onClick={() => onSelect(item.key)}
                            aria-current={active ? "page" : undefined}
                            className={`group relative flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-sm transition-colors duration-150 ease-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              active
                                ? "bg-primary/10 font-semibold text-foreground"
                                : "font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                            }`}
                          >
                            {active && (
                              <span
                                className="absolute inset-y-1.5 -left-[calc(0.5rem+1px)] w-[2px] rounded-full bg-primary"
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className={`shrink-0 transition-colors ${
                                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                              }`}
                            >
                              {item.icon}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-left leading-tight">{item.label}</span>
                            {item.badge && (
                              <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Command palette (⌘K / Ctrl+K): jump to ANY feature by name instantly, grouped
 * by room. This is the power-user discoverability layer that complements the
 * always-visible grouped sidebar. Rendered as a dialog (cmdk over Radix Dialog).
 */
function CommandPalette({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tab: NavTab) => void;
}) {
  const go = (tab: NavTab) => {
    onSelect(tab);
    onOpenChange(false);
  };
  const settingsItems = SETTINGS_MENU.map((key) =>
    NAV_ITEMS.find((item) => item.key === key),
  ).filter((item): item is ResumeNavItem => Boolean(item));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search features — jump to any tool…" />
      <CommandList>
        <CommandEmpty>No matching features.</CommandEmpty>
        {ROOMS.map((room) => {
          const items = roomItemsFor(room);
          if (items.length === 0) return null;
          return (
            <CommandGroup key={room.key} heading={room.label}>
              {items.map((item) => (
                <CommandItem
                  key={item.key}
                  value={`${room.label} ${item.label} ${item.hint ?? ""}`}
                  onSelect={() => go(item.key)}
                  className="gap-2.5"
                >
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                      {item.badge}
                    </span>
                  )}
                  {item.hint && (
                    <span className="ml-auto hidden max-w-[45%] truncate text-xs text-muted-foreground sm:inline">
                      {item.hint}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
        {settingsItems.length > 0 && (
          <CommandGroup heading="Settings">
            {settingsItems.map((item) => (
              <CommandItem
                key={item.key}
                value={`Settings ${item.label} ${item.hint ?? ""}`}
                onSelect={() => go(item.key)}
                className="gap-2.5"
              >
                <span className="text-muted-foreground">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function UserInitial({ value, className = "" }: { value?: string | null; className?: string }) {
  return (
    <span
      className={`brand-gradient inline-flex items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm shadow-primary/25 ${className}`}
    >
      {(value || "U").charAt(0).toUpperCase()}
    </span>
  );
}

function SidebarAccount({
  collapsed,
  user,
  onOpenProfile,
}: {
  collapsed: boolean;
  user: { name?: string | null; email?: string | null } | null;
  onOpenProfile: () => void;
}) {
  const displayName = user?.name || user?.email?.split("@")[0] || "Profile";

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onOpenProfile}
        title="Profile"
        aria-label="Open profile"
        className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <UserInitial value={displayName} className="h-8 w-8" />
      </button>
    );
  }

  return (
    <div className="border-t border-sidebar-border p-3">
      <button
        type="button"
        onClick={onOpenProfile}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/40 p-2.5 text-left transition-colors hover:border-primary/30 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <UserInitial value={displayName} className="h-9 w-9 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {displayName}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {user?.email || "Profile settings"}
          </span>
        </span>
      </button>
    </div>
  );
}

/**
 * Calm header context: the user's plan + remaining daily tailors, presented
 * quietly. Quota tone is neutral by default and only shifts to the (amber)
 * warning token when running low — never destructive red, so the surface
 * stays encouraging rather than punitive. Renders nothing until it has data.
 */
function HeaderMeta({
  user,
  onOpenBilling,
}: {
  user: { plan?: string; entitlements?: { plan_label?: string } } | null;
  onOpenBilling: () => void;
}) {
  const { usage } = useDailyUsage();

  const rawPlan = user?.entitlements?.plan_label || user?.plan || null;
  const planLabel = rawPlan
    ? rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1)
    : null;
  const low = usage ? usage.remaining <= 1 : false;

  if (!planLabel && !usage) return null;

  return (
    <div className="hidden items-center gap-2 md:flex">
      {usage && (
        <span
          role="status"
          className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium lg:inline-flex ${
            low
              ? "border-warning/30 bg-warning/10 text-warning"
              : "border-border bg-muted/50 text-muted-foreground"
          }`}
          title={`Daily tailors — resets ${new Date(usage.resets_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          <span aria-label={`${usage.remaining} of ${usage.limit} daily tailors left`}>
            {usage.remaining}/{usage.limit} today
          </span>
        </span>
      )}
      {planLabel && (
        <button
          type="button"
          onClick={onOpenBilling}
          title="Manage plan & billing"
          className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-caption font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {planLabel}
        </button>
      )}
    </div>
  );
}

// Whitelist used to validate ?tab= query params before trusting them as state.
// Keeping this in sync with NavTab manually is fine since both lists are short
// and live in this file.
const VALID_NAV_TABS: readonly NavTab[] = [
  "dashboard",
  "tailor",
  "batch",
  "jobs",
  "career-portals",
  "auto-apply",
  "my-resumes",
  "tailored",
  "applications",
  "interview",
  "visa",
  "beta",
  "copilot",
  "learning",
  "events",
  "network",
  "voicegraph",
  "six-seconds",
  "pipeline",
  "notifications",
  "billing",
  "profile",
] as const;

function readTabFromUrl(): NavTab | null {
  if (typeof window === "undefined") return null;
  const raw = new URL(window.location.href).searchParams.get("tab");
  if (!raw) return null;
  return (VALID_NAV_TABS as readonly string[]).includes(raw) ? (raw as NavTab) : null;
}

export default function ResumeParser() {
  const { user } = useAuth();
  const feedback = useFeedback();
  // Seed from ?tab= so refresh / OAuth-callback redirects (e.g.
  // /resume-parser?tab=applications&gmail=linked) actually land on the
  // expected tab instead of falling back to "tailor" with a stale URL.
  const [activeNav, setActiveNav] = useState<NavTab>(() => readTabFromUrl() ?? "dashboard");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarHoverExpanded, setSidebarHoverExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("resumeParserSidebarCollapsed") === "true";
  });

  const activeNavItem = useMemo(
    () => NAV_ITEMS.find((item) => item.key === activeNav) ?? NAV_ITEMS[0],
    [activeNav],
  );
  const activeRoomLabel = useMemo(() => roomForTab(activeNav)?.label ?? null, [activeNav]);

  const selectNav = useCallback((tab: NavTab) => {
    setActiveNav(tab);
    setMobileNavOpen(false);
    setUserMenuOpen(false);
  }, []);

  // Track which tabs the user has visited so we can keep heavy tabs (Tailor,
  // Jobs) mounted in the background. Without this, switching tabs unmounts
  // <TailorTab /> mid-run — the tailor request still completes in the network
  // stack, but its setResult lands on a dead component, and on remount the
  // user sees a blank tailor view. Keeping mounted preserves state and lets
  // in-flight async finish into the live component.
  const [visitedTabs, setVisitedTabs] = useState<Set<NavTab>>(() => new Set([activeNav]));
  useEffect(() => {
    setVisitedTabs((prev) => (prev.has(activeNav) ? prev : new Set([...prev, activeNav])));
  }, [activeNav]);
  const isVisible = (tab: NavTab) => activeNav === tab;
  const wasVisited = (tab: NavTab) => visitedTabs.has(tab);

  // Allow child components to request navigation hops without prop drilling.
  useEffect(() => {
    const toJobs = () => selectNav('jobs');
    const toTailor = () => selectNav('tailor');
    const toBatchTailor = () => selectNav('batch');
    // Generic cross-link hop: any component can dispatch
    // `jobpilot:navigate` with detail = a valid tab key (used by ConnectedTo).
    const toTab = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      if (typeof tab === 'string' && (VALID_NAV_TABS as readonly string[]).includes(tab)) {
        selectNav(tab as NavTab);
      }
    };
    window.addEventListener('portfolio:navigate-to-jobs', toJobs);
    window.addEventListener('portfolio:navigate-to-tailor', toTailor);
    window.addEventListener('portfolio:navigate-to-batch-tailor', toBatchTailor);
    window.addEventListener('jobpilot:navigate', toTab as EventListener);
    return () => {
      window.removeEventListener('portfolio:navigate-to-jobs', toJobs);
      window.removeEventListener('portfolio:navigate-to-tailor', toTailor);
      window.removeEventListener('portfolio:navigate-to-batch-tailor', toBatchTailor);
      window.removeEventListener('jobpilot:navigate', toTab as EventListener);
    };
  }, [selectNav]);

  // ⌘K / Ctrl+K toggles the command palette from anywhere in the workspace.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    void apiService.recordCareerCopilotTab(activeNav).catch(() => {});
  }, [activeNav]);

  // Mirror activeNav in the URL so refresh / share / back-button restores the
  // same tab. We use replaceState (not pushState) — tab switches shouldn't
  // pollute browser history, and we want URL ↔ state to track 1:1.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") === activeNav) return;
    url.searchParams.set("tab", activeNav);
    window.history.replaceState({}, "", url.toString());
  }, [activeNav]);

  // Honor browser back/forward — when the URL's ?tab= changes via popstate,
  // pull state back into activeNav so the visible tab matches the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const tab = readTabFromUrl();
      if (tab && tab !== activeNav) setActiveNav(tab);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [activeNav]);

  useEffect(() => {
    window.localStorage.setItem(
      "resumeParserSidebarCollapsed",
      String(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

  const sidebarEffectiveCollapsed = sidebarCollapsed && !sidebarHoverExpanded;

  return (
    <AuthGate
      title="Aspirely"
      description="Your workspace for the job hunt — tailor resumes to any JD, track applications, read the market, and prep with intent."
    >
      <div className="min-h-screen bg-background text-foreground antialiased pb-24 lg:pb-0">
        {/* Top app bar keeps identity and account actions; sections live in the sidebar. */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/85 supports-[backdrop-filter]:bg-background/70 backdrop-blur-xl shadow-soft">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden="true" />
          <div className="w-full px-4 sm:px-6 lg:px-5">
            <div className="h-14 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open section navigation"
                className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Menu className="h-4 w-4" />
              </button>

              {/* Logo */}
              <a href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Aspirely home">
                <div className="brand-gradient w-8 h-8 rounded-lg flex items-center justify-center shadow-soft shadow-primary/25">
                  <SparklesIcon className="w-4 h-4 text-white" />
                </div>
                <h1 className="font-display text-lg font-extrabold tracking-tight hidden sm:block">
                  Aspirely
                </h1>
              </a>

              <div className="min-w-0 flex-1 ml-3 border-l border-border pl-3 py-0.5">
                <div className="flex items-center gap-1.5 text-foreground">
                  {activeRoomLabel && (
                    <span className="hidden items-center gap-1.5 sm:flex">
                      <span className="text-xs font-medium text-muted-foreground">
                        {activeRoomLabel}
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
                    </span>
                  )}
                  <span className="text-primary">
                    {activeNavItem.icon}
                  </span>
                  <h2 className="text-sm font-bold truncate">{activeNavItem.label}</h2>
                  {activeNavItem.badge && (
                    <span className="ml-1 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                      {activeNavItem.badge}
                    </span>
                  )}
                </div>
                {activeNavItem.hint && (
                  <p className="mt-0.5 text-[11px] font-medium text-muted-foreground truncate">
                    {activeNavItem.hint}
                  </p>
                )}
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  aria-label="Search features"
                  title="Search features (⌘K)"
                  className="inline-flex h-9 items-center gap-2 rounded-control border border-border bg-muted/40 px-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden text-sm lg:inline">Search</span>
                  <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground lg:inline">
                    ⌘K
                  </kbd>
                </button>
                <HeaderMeta user={user} onOpenBilling={() => selectNav("billing")} />
                <div className="hidden h-6 w-px bg-border md:block" aria-hidden="true" />
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => (window.location.href = "/")}
                  aria-label="Home"
                  title="Aspirely home"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <HomeIcon className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                    className="brand-gradient inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-xs font-bold ring-2 ring-primary/30 transition-shadow hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                  </button>
                  {userMenuOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close user menu"
                        className="fixed inset-0 z-10"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-60 rounded-xl bg-popover text-popover-foreground border border-border shadow-pop overflow-hidden z-20"
                      >
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {user?.name || user?.email?.split("@")[0]}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user?.email}
                          </p>
                        </div>
                        {/* Settings group: Configure surfaces live here now, off
                            the rail. Each still routes to its own leaf render. */}
                        <div className="py-1">
                          <p className="overline px-4 pb-1 pt-2">Settings</p>
                          {SETTINGS_MENU.map((key) => {
                            const item = NAV_ITEMS.find((i) => i.key === key);
                            if (!item) return null;
                            const active = activeNav === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                role="menuitem"
                                aria-current={active ? "page" : undefined}
                                onClick={() => selectNav(key)}
                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:bg-accent ${
                                  active
                                    ? "bg-primary/10 text-foreground"
                                    : "text-foreground hover:bg-accent"
                                }`}
                              >
                                <span className={`shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}>
                                  {item.icon}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                {item.badge && (
                                  <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                                    {item.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="border-t border-border py-1">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setUserMenuOpen(false);
                              feedback.open();
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:bg-accent"
                          >
                            <span className="shrink-0 text-muted-foreground">
                              <MessageSquarePlus className="w-4 h-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">Feedback</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] lg:hidden"
            >
              <button
                type="button"
                aria-label="Close section navigation"
                className="absolute inset-0 h-full w-full bg-black/50 backdrop-blur-sm"
                onClick={() => setMobileNavOpen(false)}
              />
              <motion.aside
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "spring", stiffness: 360, damping: 34 }}
                className="absolute left-0 top-0 flex h-full w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-sidebar-border bg-sidebar shadow-float"
              >
                <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-soft shadow-primary/25">
                      <SparklesIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display truncate text-sm font-extrabold text-foreground">
                        Aspirely
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {activeNavItem.label}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    aria-label="Close section navigation"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                  <ResumeSectionNav activeNav={activeNav} onSelect={selectNav} />
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="lg:flex lg:items-start">
          <div className="flex items-start lg:contents">
            <aside
              onMouseEnter={() => {
                if (sidebarCollapsed) setSidebarHoverExpanded(true);
              }}
              onMouseLeave={() => {
                if (sidebarCollapsed) setSidebarHoverExpanded(false);
              }}
              className={`relative hidden lg:flex sticky top-14 h-[calc(100vh-3.5rem)] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl transition-[width] duration-300 ease-expo ${
                sidebarEffectiveCollapsed ? "w-20" : "w-[19rem]"
              }`}
            >
              <div
                className={`flex h-16 shrink-0 items-center border-b border-sidebar-border ${
                  sidebarEffectiveCollapsed ? "justify-center px-2" : "justify-between gap-3 px-4"
                }`}
              >
                {!sidebarEffectiveCollapsed && (
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-soft shadow-primary/20">
                      <SparklesIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display truncate text-sm font-extrabold text-foreground">
                        Aspirely
                      </p>
                      <p className="truncate text-xs font-medium text-muted-foreground">
                        Workspace
                      </p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((value) => !value)}
                  aria-label={sidebarEffectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  aria-expanded={!sidebarEffectiveCollapsed}
                  title={sidebarEffectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {sidebarEffectiveCollapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </button>
              </div>
              {!sidebarEffectiveCollapsed && (
                <button
                  type="button"
                  aria-label="Minimize sidebar"
                  title="Hover or click to minimize"
                  onMouseEnter={() => {
                    setSidebarCollapsed(true);
                    setSidebarHoverExpanded(false);
                  }}
                  onClick={() => {
                    setSidebarCollapsed(true);
                    setSidebarHoverExpanded(false);
                  }}
                  className="absolute right-0 top-16 bottom-0 w-1.5 bg-transparent hover:bg-primary/15 transition-colors"
                />
              )}
              <div className="flex-1 overflow-y-auto py-3">
                <ResumeSectionNav
                  activeNav={activeNav}
                  collapsed={sidebarEffectiveCollapsed}
                  onSelect={selectNav}
                />
              </div>
              <SidebarAccount
                collapsed={sidebarEffectiveCollapsed}
                user={user}
                onOpenProfile={() => selectNav("profile")}
              />
            </aside>

            <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-[1500px]">
              {/* Navigation lives entirely in the grouped sidebar + ⌘K palette —
                  no in-content sub-tab strip. The header shows the room ›
                  feature breadcrumb for context. */}
              {/* Cross-link tissue: contextual related-feature shortcuts for
                  the active tab (no-op on tabs with their own rich linking). */}
              <ConnectedTo from={activeNav} />
              {activeNav === "dashboard" && (
                <Suspense
                  fallback={
                    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900/40 p-8 text-center">
                      <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" />
                    </div>
                  }
                >
                  <DashboardTab userName={user?.name || user?.email} onNavigate={selectNav} />
                </Suspense>
              )}
              {/* Tailor + Jobs stay mounted once visited so an in-flight tailor
                  or pipeline run doesn't drop its results when the user switches
                  away mid-run. Other tabs unmount as before. */}
              {wasVisited("tailor") && (
                <div style={{ display: isVisible("tailor") ? undefined : "none" }}>
                  <TailorTab />
                </div>
              )}
              {/* BatchTailor stays mounted once visited so an in-flight batch
                  (poll loop + lazy-fetched cover letters + downloaded resumes)
                  survives the user switching to Jobs/Applications and back. */}
              {wasVisited("batch") && (
                <div style={{ display: isVisible("batch") ? undefined : "none" }}>
                  <Suspense
                    fallback={
                      <div className="animate-pulse h-48 rounded-2xl bg-gray-100 dark:bg-gray-800/40" />
                    }
                  >
                    <BatchTailor />
                  </Suspense>
                </div>
              )}
              {wasVisited("jobs") && (
                <div style={{ display: isVisible("jobs") ? undefined : "none" }}>
                  <Suspense
                    fallback={
                      <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900/40 p-8 text-center">
                        <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" />
                      </div>
                    }
                  >
                    <JobOpportunitiesTab />
                  </Suspense>
                </div>
              )}

              {wasVisited("career-portals") && (
                <div style={{ display: isVisible("career-portals") ? undefined : "none" }}>
                  <Suspense
                    fallback={
                      <div className="rounded-xl border border-border bg-card p-8 text-center">
                        <div className="mx-auto h-6 w-1/3 animate-pulse rounded bg-muted" />
                      </div>
                    }
                  >
                    <CareerPortalsTab />
                  </Suspense>
                </div>
              )}
              {activeNav === "auto-apply" && (
                <Suspense
                  fallback={
                    <div className="rounded-xl border border-border bg-card p-8 text-center">
                      <div className="mx-auto h-6 w-1/3 animate-pulse rounded bg-muted" />
                    </div>
                  }
                >
                  <AutoApplyTab />
                </Suspense>
              )}
              {activeNav === "my-resumes" && <MyResumesTab />}
              {activeNav === "tailored" && <TailoredResumesTab />}
              {activeNav === "applications" && (
                <Suspense
                  fallback={
                    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900/40 p-8 text-center">
                      <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" />
                    </div>
                  }
                >
                  <ApplicationsTab />
                </Suspense>
              )}
              {activeNav === "interview" && (
                <Suspense
                  fallback={
                    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900/40 p-8 text-center">
                      <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" />
                    </div>
                  }
                >
                  <InterviewPrepTab />
                </Suspense>
              )}
              {activeNav === "visa" && (
                <Suspense
                  fallback={
                    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900/40 p-8 text-center">
                      <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" />
                    </div>
                  }
                >
                  <VisaTimelineTab />
                </Suspense>
              )}
              {activeNav === "beta" && (
                <Suspense
                  fallback={
                    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900/40 p-8 text-center">
                      <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" />
                    </div>
                  }
                >
                  <BetaLabTab />
                </Suspense>
              )}
              {activeNav === "copilot" && (
                <Suspense
                  fallback={
                    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900/40 p-8 text-center">
                      <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" />
                    </div>
                  }
                >
                  <CareerCopilotTab />
                </Suspense>
              )}
              {activeNav === "learning" && (
                <Suspense
                  fallback={
                    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900/40 p-8 text-center">
                      <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" />
                    </div>
                  }
                >
                  <LearningHubTab />
                </Suspense>
              )}
              {activeNav === "events" && (
                <Suspense fallback={<div className="p-8 text-center"><div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" /></div>}>
                  <EventsTab />
                </Suspense>
              )}
              {activeNav === "network" && (
                <Suspense fallback={<div className="p-8 text-center"><div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" /></div>}>
                  <NetworkTab />
                </Suspense>
              )}
              {activeNav === "voicegraph" && (
                <Suspense fallback={<div className="p-8 text-center"><div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" /></div>}>
                  <VoiceGraphTab />
                </Suspense>
              )}
              {activeNav === "six-seconds" && (
                <Suspense fallback={<div className="p-8 text-center"><div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" /></div>}>
                  <SixSecondsTab onNavigate={(t) => selectNav(t as NavTab)} />
                </Suspense>
              )}
              {activeNav === "pipeline" && (
                <Suspense fallback={<div className="p-8 text-center"><div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" /></div>}>
                  <PipelineTab onNavigate={(t) => selectNav(t as NavTab)} />
                </Suspense>
              )}
              {activeNav === "notifications" && (
                <Suspense fallback={<div className="p-8 text-center"><div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" /></div>}>
                  <NotificationsTab />
                </Suspense>
              )}
              {activeNav === "billing" && (
                <Suspense
                  fallback={
                    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900/40 p-8 text-center">
                      <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10 mx-auto" />
                    </div>
                  }
                >
                  <BillingTab />
                </Suspense>
              )}
              {activeNav === "profile" && <ProfileTab />}
              </div>
            </main>
          </div>
        </div>

        {/* Instagram-style bottom nav for mobile/tablet; desktop uses the sidebar. */}
        <MobileBottomNav
          items={NAV_ITEMS}
          rooms={ROOMS}
          activeKey={activeNav}
          onSelect={(key) => selectNav(key as NavTab)}
        />

        {/* Power-user jump-to-anything palette (⌘K / Ctrl+K), grouped by room. */}
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onSelect={selectNav} />

        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          @media (prefers-reduced-motion: reduce) {
            .motion-safe\\:animate-in { animation: none !important; }
          }
        `}</style>
      </div>
    </AuthGate>
  );
}
