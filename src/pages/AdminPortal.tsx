import { useState, useEffect, useCallback, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, type AdminUserOverride } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { QuotasPanel } from './admin/QuotasPanel';
import { FeedbackPanel } from './admin/FeedbackPanel';

type Tab =
  | 'overview'
  | 'users'
  | 'quotas'
  | 'feedback';

// ─── Types ────────────────────────────────────────────────────────────────
interface AdminStats {
  total_users: number;
  users_7d: number;
  users_30d: number;
  total_parsed_resumes: number;
  total_base_resumes: number;
  legacy_generated_resumes: number;
  total_tailoring_sessions: number;
  tailoring_7d: number;
  tailoring_30d: number;
  total_versions: number;
  cached_pdf_files: number;
  cached_docx_files: number;
  total_applications: number;
  applications_by_status: Record<string, number>;
  total_interview_prep_packs: number;
}
interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  sector: string | null;
  created_at: string | null;
  last_login: string | null;
  last_login_ip: string | null;
  login_attempts: number;
  base_resumes: number;
  generated_resumes: number;
  tailoring_sessions: number;
  has_parsed_resume: boolean;
}
interface UserDetail {
  user: AdminUser & { fingerprint_hash: string | null; session_id: string | null };
  parsed_resume: any;
  base_resumes: any[];
  generated_resumes: any[];
  tailoring_records: any[];
}
interface Activity {
  type: string; email: string; name?: string; detail?: string;
  company?: string; ats_score?: number; timestamp: string;
}
interface AdminApplication {
  record_id: string; user_email: string;
  job_title?: string; company?: string; ats_overall?: number;
  status?: string; applied_at?: string | null;
  next_action_date?: string | null; next_action_note?: string;
  recruiter_name?: string; recruiter_email?: string; recruiter_company?: string;
  job_url?: string; created_at?: string; updated_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

// Defensive ISO parser. Backend now emits UTC-tagged ISO ("...Z"), but legacy
// rows in the DB were written before the fix and arrive without a timezone.
// JS `new Date(...)` treats those as local time which throws off "just now"
// math (the wall-clock-vs-UTC delta becomes the relative diff). We assume any
// naive ISO is UTC - that's what the server records, and matches the new
// emit path. Returns null for unparseable input.
function parseISO(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  let s = iso;
  // Treat "YYYY-MM-DDTHH:MM:SS[.ffffff]" with no zone designator as UTC.
  if (/T\d/.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) s = s + 'Z';
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDate(iso: string | null | undefined): string {
  const d = parseISO(iso);
  if (!d) return ' - ';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
// Long, viewer-friendly absolute. Example: "May 12, 2026 · 3:42:18 PM"
function fmtAbsolute(iso: string | null | undefined): string {
  const d = parseISO(iso);
  if (!d) return ' - ';
  const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  return `${date} · ${time}`;
}
function fmtRel(iso: string | null | undefined): string {
  const d = parseISO(iso);
  if (!d) return ' - ';
  const diffMs = Date.now() - d.getTime();
  // Future-dated entries are surfaced explicitly so admins can spot clock
  // drift or seed data instead of being misled by "just now".
  if (diffMs < -45_000) {
    const futureSec = Math.floor(-diffMs / 1000);
    if (futureSec < 60) return `in ${futureSec}s`;
    if (futureSec < 3600) return `in ${Math.floor(futureSec / 60)}m`;
    if (futureSec < 86400) return `in ${Math.floor(futureSec / 3600)}h`;
    return `in ${Math.floor(futureSec / 86400)}d`;
  }
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  if (diffD < 30) return `${Math.floor(diffD / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtNum(n: number | undefined | null): string {
  if (n === null || n === undefined) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
function initials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return '?';
  const base = nameOrEmail.split('@')[0].replace(/[._-]/g, ' ');
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return nameOrEmail[0].toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
const AVATAR_GRADIENTS = [
  'from-indigo-500 to-violet-600', 'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600', 'from-purple-500 to-fuchsia-600',
  'from-cyan-500 to-blue-600', 'from-lime-500 to-emerald-600',
];
function gradientFor(seed: string | null | undefined): string {
  if (!seed) return AVATAR_GRADIENTS[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

const STATUS_COLORS: Record<string, { chip: string; dot: string; label: string }> = {
  draft:        { chip: 'bg-gray-500/15 text-gray-400 border-gray-500/25',         dot: 'bg-gray-400',     label: 'Draft' },
  applied:      { chip: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',   dot: 'bg-indigo-400',   label: 'Applied' },
  interviewing: { chip: 'bg-blue-500/15 text-blue-400 border-blue-500/25',         dot: 'bg-blue-400',     label: 'Interviewing' },
  offer:        { chip: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400', label: 'Offer' },
  rejected:     { chip: 'bg-red-500/15 text-red-400 border-red-500/25',            dot: 'bg-red-400',     label: 'Rejected' },
  ghosted:      { chip: 'bg-amber-500/15 text-amber-400 border-amber-500/25',      dot: 'bg-amber-400',   label: 'Ghosted' },
  withdrawn:    { chip: 'bg-gray-400/15 text-gray-500 border-gray-400/25',         dot: 'bg-gray-500',    label: 'Withdrawn' },
};
const STATUSES: Array<keyof typeof STATUS_COLORS> = ['draft', 'applied', 'interviewing', 'offer', 'rejected', 'ghosted', 'withdrawn'];

// ─── Icons ────────────────────────────────────────────────────────────────
const Icon = {
  Home:     (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  Users:    (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>,
  Doc:      (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>,
  Bolt:     (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  Briefcase:(p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.07a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-4.07M12 17.3v-7.85m0 0L8.25 12.96M12 9.45l3.75 3.51M3.75 9.22a9.76 9.76 0 0 1 8.25-4.47c3.47 0 6.495 1.8 8.25 4.47m-16.5 0a9.72 9.72 0 0 0-.75 3.72c0 .83.105 1.63.3 2.4m16.95-6.12a9.72 9.72 0 0 1 .75 3.72c0 .83-.105 1.63-.3 2.4" /></svg>,
  Brain:    (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" /></svg>,
  Search:   (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>,
  Refresh:  (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992V4.356m0 4.992-3.181-3.183a8.25 8.25 0 0 0-11.667 0l-3.181 3.183m0 5.304h4.992m-4.993 0v4.992" /></svg>,
  Logout:   (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>,
  Back:     (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>,
  X:        (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>,
  Eye:      (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>,
  Download: (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>,
  Chevron:  (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>,
  Trend:    (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>,
  Sparkle:  (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>,
  Upload:   (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 7.5m0 0L7.5 12M12 7.5v9" /></svg>,
  Kanban:   (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25A2.25 2.25 0 0 1 8.25 10.5H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 8.25 20.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>,
  List:     (p: { c?: string }) => <svg className={p.c} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 17.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>,
};

// ─── Primitives ──────────────────────────────────────────────────────────

function Avatar({ seed, size = 'md' }: { seed: string | null | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'h-8 w-8 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs';
  return (
    <div className={`${dims} shrink-0 rounded-xl bg-gradient-to-br ${gradientFor(seed)} text-white font-bold flex items-center justify-center shadow-sm shadow-black/30 ring-1 ring-white/10`}>
      {initials(seed)}
    </div>
  );
}

function StatusPill({ status, size = 'md' }: { status?: string; size?: 'sm' | 'md' }) {
  const meta = status ? STATUS_COLORS[status] : null;
  if (!meta) return <span className="text-xs text-gray-600"> - </span>;
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  return (
    <span className={`inline-flex items-center gap-1 ${pad} rounded-full border font-semibold ${meta.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function Sparkline({ data, color = 'indigo', width = 80, height = 28 }: {
  data: number[]; color?: 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan';
  width?: number; height?: number;
}) {
  if (!data || data.length < 2) {
    return <div className="h-7 w-20 rounded bg-white/[0.03]" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]},${p[1]}`).join(' ');
  const areaPath = `${path} L ${width},${height} L 0,${height} Z`;
  const colorMap = {
    indigo: { stroke: '#818cf8', fill: 'url(#spark-indigo)' },
    emerald: { stroke: '#34d399', fill: 'url(#spark-emerald)' },
    violet: { stroke: '#a78bfa', fill: 'url(#spark-violet)' },
    amber: { stroke: '#fbbf24', fill: 'url(#spark-amber)' },
    rose: { stroke: '#fb7185', fill: 'url(#spark-rose)' },
    cyan: { stroke: '#22d3ee', fill: 'url(#spark-cyan)' },
  }[color];
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="spark-indigo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spark-emerald" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spark-violet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spark-amber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spark-rose" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spark-cyan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={colorMap.fill} />
      <path d={path} stroke={colorMap.stroke} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={2.5} fill={colorMap.stroke} />
    </svg>
  );
}

function KPICard({
  label, value, sub, icon, color = 'indigo', trend, sparklineData,
}: {
  label: string; value: number | string; sub?: string;
  icon: React.ReactNode;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet';
  trend?: { direction: 'up' | 'down' | 'flat'; pct?: number };
  sparklineData?: number[];
}) {
  const iconBg: Record<string, string> = {
    indigo:  'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    amber:   'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    rose:    'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    cyan:    'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20',
    violet:  'bg-violet-500/10 text-violet-400 ring-violet-500/20',
  };
  const trendCls =
    trend?.direction === 'up' ? 'text-emerald-400' :
    trend?.direction === 'down' ? 'text-red-400' : 'text-gray-500';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 transition-all hover:border-white/[0.12]"
    >
      <div className="absolute inset-x-0 -top-20 h-40 bg-gradient-to-b from-white/[0.03] to-transparent blur-2xl pointer-events-none" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center justify-center rounded-xl p-2 ring-1 ${iconBg[color]}`}>
              {icon}
            </span>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
          </div>
          <p className="text-3xl font-bold text-white tabular-nums leading-tight">{value}</p>
          <div className="flex items-center gap-2">
            {trend && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${trendCls}`}>
                {trend.direction === 'up' && '↑'}
                {trend.direction === 'down' && '↓'}
                {trend.direction === 'flat' && '→'}
                {trend.pct !== undefined && `${Math.abs(trend.pct).toFixed(0)}%`}
              </span>
            )}
            {sub && <p className="text-xs text-gray-500 truncate">{sub}</p>}
          </div>
        </div>
        {sparklineData && sparklineData.length >= 2 && (
          <div className="shrink-0 -mr-1">
            <Sparkline data={sparklineData} color={color} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PipelineBar({ counts }: { counts: Record<string, number> }) {
  const total = STATUSES.reduce((s, k) => s + (counts[k] || 0), 0);
  if (total === 0) return null;
  return (
    <div className="space-y-2.5">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.04] ring-1 ring-white/[0.06]">
        {STATUSES.map(status => {
          const n = counts[status] || 0;
          if (n === 0) return null;
          const pct = (n / total) * 100;
          return (
            <div
              key={status}
              className={STATUS_COLORS[status].dot}
              style={{ width: `${pct}%` }}
              title={`${STATUS_COLORS[status].label}: ${n} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map(status => {
          const n = counts[status] || 0;
          if (n === 0) return null;
          const meta = STATUS_COLORS[status];
          const pct = (n / total) * 100;
          return (
            <div key={status} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] ${meta.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              <span className="font-medium">{meta.label}</span>
              <span className="font-bold tabular-nums">{n}</span>
              <span className="opacity-60">· {pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityRow({ a }: { a: Activity }) {
  const meta: Record<string, { label: string; icon: string; tint: string }> = {
    registration: { label: 'joined',            icon: '✦',  tint: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 ring-emerald-500/20' },
    login:        { label: 'signed in',         icon: '→',  tint: 'from-blue-500/20 to-blue-500/5 text-blue-400 ring-blue-500/20' },
    upload:       { label: 'uploaded a resume', icon: '↑',  tint: 'from-amber-500/20 to-amber-500/5 text-amber-400 ring-amber-500/20' },
    tailoring:    { label: 'tailored resume',   icon: '⚡', tint: 'from-violet-500/20 to-violet-500/5 text-violet-400 ring-violet-500/20' },
  };
  const m = meta[a.type] || meta.login;
  return (
    <div className="group flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
      <div className={`shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br ${m.tint} ring-1 flex items-center justify-center text-base font-bold`}>
        {m.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 leading-snug">
          <span className="font-semibold text-white">{a.name || a.email.split('@')[0]}</span>
          <span className="text-gray-500"> {m.label}</span>
          {a.detail && <span className="text-gray-300"> · {a.detail}</span>}
          {a.company && a.company !== 'Not specified' && <span className="text-gray-500"> @ {a.company}</span>}
        </p>
        <p className="text-[11px] text-gray-600 font-mono mt-0.5 truncate">{a.email}</p>
      </div>
      <div className="text-right shrink-0">
        {a.ats_score != null && (
          <span className={`block text-xs font-bold tabular-nums ${
            a.ats_score >= 80 ? 'text-emerald-400' : a.ats_score >= 60 ? 'text-amber-400' : 'text-red-400'
          }`}>
            ATS {a.ats_score}
          </span>
        )}
        <TimeStamp iso={a.timestamp} className="block text-[11px] text-gray-600 mt-0.5" />
      </div>
    </div>
  );
}

// ─── Recently Active Users ────────────────────────────────────────────────
// Plain-English snapshot of who used the app most recently. Each row reads
// like a sentence ("Asha - opened the app 3 minutes ago - uploaded a resume")
// so a non-technical viewer can scan it without decoding tags or jargon.

function presenceFor(iso?: string | null): { dot: string; ring: string; label: string } {
  if (!iso) return { dot: 'bg-gray-600', ring: 'ring-gray-700/50', label: 'Never seen' };
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  if (mins < 5)        return { dot: 'bg-emerald-400 animate-pulse', ring: 'ring-emerald-400/40', label: 'Online now' };
  if (mins < 60)       return { dot: 'bg-emerald-400',                ring: 'ring-emerald-400/30', label: 'Active' };
  if (mins < 60 * 24)  return { dot: 'bg-amber-400',                  ring: 'ring-amber-400/30',   label: 'Today' };
  if (mins < 60 * 24 * 7) return { dot: 'bg-sky-400',                 ring: 'ring-sky-400/30',     label: 'This week' };
  return { dot: 'bg-gray-500', ring: 'ring-gray-700/50', label: 'A while ago' };
}

const ACTIVITY_LABEL: Record<string, string> = {
  registration: 'created their account',
  login:        'opened the app',
  upload:       'uploaded a resume',
  tailoring:    'tailored their resume',
};

function RecentlyActiveUsers({
  users, activities, onSelect,
}: {
  users: AdminUser[];
  activities: Activity[];
  onSelect?: (email: string) => void;
}) {
  // Build the "most recently active" view from two signals: explicit activity
  // events (high-fidelity, per-action) and last_login (covers users with no
  // recent activity events but who still opened the app). The merged list is
  // de-duplicated by email keeping the most recent timestamp per user.
  const rows = useMemo(() => {
    const byEmail = new Map<string, {
      email: string; name?: string | null; lastSeen: string; lastAction?: string;
    }>();

    for (const a of activities) {
      const existing = byEmail.get(a.email);
      if (!existing || new Date(a.timestamp) > new Date(existing.lastSeen)) {
        byEmail.set(a.email, {
          email: a.email,
          name: a.name,
          lastSeen: a.timestamp,
          lastAction: ACTIVITY_LABEL[a.type] || 'used the app',
        });
      }
    }
    for (const u of users) {
      if (!u.last_login) continue;
      const existing = byEmail.get(u.email);
      if (!existing || new Date(u.last_login) > new Date(existing.lastSeen)) {
        byEmail.set(u.email, {
          email: u.email,
          name: u.name,
          lastSeen: u.last_login,
          lastAction: existing?.lastAction || 'opened the app',
        });
      } else if (existing && !existing.name && u.name) {
        existing.name = u.name;
      }
    }

    return Array.from(byEmail.values())
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
      .slice(0, 8);
  }, [users, activities]);

  if (rows.length === 0) {
    return (
      <EmptyHero
        icon={<Icon.Users c="w-5 h-5" />}
        title="No one has used the app yet"
        subtitle="Once visitors register and start using features, you'll see them here in real time."
      />
    );
  }

  return (
    <ul className="divide-y divide-white/[0.04]">
      {rows.map((r, i) => {
        const presence = presenceFor(r.lastSeen);
        const display = r.name || r.email.split('@')[0];
        const Comp = onSelect ? 'button' : 'div';
        return (
          <li key={r.email + i}>
            <Comp
              {...(onSelect ? { onClick: () => onSelect(r.email), type: 'button' as const } : {})}
              className={`w-full text-left flex items-center gap-3 px-4 sm:px-5 py-3 transition-colors ${
                onSelect ? 'hover:bg-white/[0.03] focus-visible:bg-white/[0.04] focus-visible:outline-none cursor-pointer' : ''
              }`}
            >
              <div className="relative shrink-0">
                <Avatar seed={r.name || r.email} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[#0a0a0f] ${presence.dot}`}
                  title={presence.label}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white truncate max-w-[12rem] sm:max-w-none">
                    {display}
                  </p>
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold rounded-full px-1.5 py-0.5 ring-1 ${presence.ring} text-gray-300`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${presence.dot}`} />
                    {presence.label}
                  </span>
                </div>
                <p className="text-[12px] text-gray-400 mt-0.5 truncate">
                  <span className="text-gray-500">Last seen </span>
                  <TimeStamp iso={r.lastSeen} className="text-gray-200" />
                  {r.lastAction && (
                    <>
                      <span className="text-gray-600"> · </span>
                      <span>{r.lastAction}</span>
                    </>
                  )}
                </p>
                <p className="text-[10px] text-gray-600 font-mono mt-0.5 truncate">{r.email}</p>
              </div>
              {onSelect && (
                <Icon.Chevron c="w-4 h-4 text-gray-600 shrink-0" />
              )}
            </Comp>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyHero({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.08] bg-gradient-to-b from-white/[0.02] to-transparent py-16 px-6 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-1.5 max-w-sm mx-auto">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// Renders a relative timestamp with the exact wall-clock time on hover. The
// inner <time> uses the standard datetime attribute so screen readers and
// copy/paste pick up the ISO value too.
function TimeStamp({
  iso, prefix, className = 'text-xs text-gray-500 whitespace-nowrap',
}: { iso: string | null | undefined; prefix?: string; className?: string }) {
  const exact = fmtAbsolute(iso);
  const rel = fmtRel(iso);
  return (
    <time
      dateTime={iso || undefined}
      title={exact === ' - ' ? undefined : exact}
      className={`${className} cursor-help underline decoration-dotted decoration-gray-700 underline-offset-2`}
    >
      {prefix ? `${prefix} ` : ''}{rel}
    </time>
  );
}

// Horizontal bar - used in distribution panels (ATS bands, top companies...)
function HBar({ label, value, max, color = 'indigo', sub }: {
  label: string; value: number; max: number;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet' | 'sky';
  sub?: string;
}) {
  const fill: Record<string, string> = {
    indigo:  'from-indigo-500/60 to-indigo-500/30',
    emerald: 'from-emerald-500/60 to-emerald-500/30',
    amber:   'from-amber-500/60 to-amber-500/30',
    rose:    'from-rose-500/60 to-rose-500/30',
    cyan:    'from-cyan-500/60 to-cyan-500/30',
    violet:  'from-violet-500/60 to-violet-500/30',
    sky:     'from-sky-500/60 to-sky-500/30',
  };
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-[11px]">
        <span className="text-gray-300 truncate">{label}</span>
        <span className="text-gray-500 tabular-nums shrink-0">
          {sub ? `${sub} · ` : ''}<span className="text-white font-bold">{value}</span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${fill[color]}`}
        />
      </div>
    </div>
  );
}

// Vertical mini-bar chart (e.g., ATS bucket distribution).
function MiniBars({ buckets, color = 'indigo' }: {
  buckets: { label: string; value: number }[];
  color?: 'indigo' | 'emerald' | 'violet' | 'cyan';
}) {
  const max = Math.max(1, ...buckets.map(b => b.value));
  const fill: Record<string, string> = {
    indigo:  'from-indigo-400 to-indigo-600',
    emerald: 'from-emerald-400 to-emerald-600',
    violet:  'from-violet-400 to-violet-600',
    cyan:    'from-cyan-400 to-cyan-600',
  };
  return (
    <div className="flex items-end gap-2 h-28 px-1">
      {buckets.map((b, i) => {
        const h = (b.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <span className="text-[10px] tabular-nums text-gray-400 font-semibold">{b.value || ''}</span>
            <div className="w-full bg-white/[0.03] rounded-md overflow-hidden flex items-end" style={{ height: '70%' }}>
              <motion.div
                initial={{ height: 0 }} animate={{ height: `${h}%` }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: i * 0.04 }}
                className={`w-full bg-gradient-to-t ${fill[color]} rounded-md`}
              />
            </div>
            <span className="text-[10px] text-gray-600 truncate w-full text-center">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Conversion funnel - vertical stages with a contracting bar.
function Funnel({ stages }: { stages: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...stages.map(s => s.value));
  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const conv = i > 0 ? (stages[i - 1].value > 0 ? (s.value / stages[i - 1].value) * 100 : 0) : 100;
        return (
          <div key={s.label}>
            <div className="flex items-baseline justify-between gap-3 text-[11px] mb-1">
              <span className="text-gray-300 font-medium">{s.label}</span>
              <span className="tabular-nums text-gray-500">
                {i > 0 && <span className="text-gray-600">{conv.toFixed(0)}% conv · </span>}
                <span className="text-white font-bold">{s.value}</span>
              </span>
            </div>
            <div className="relative h-7 rounded-lg bg-white/[0.03] overflow-hidden ring-1 ring-white/[0.04]">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.05 }}
                className={`absolute inset-y-0 left-0 rounded-lg ${s.color || 'bg-gradient-to-r from-indigo-500/60 via-violet-500/40 to-violet-500/10'}`}
              />
              <span className="relative z-10 inline-flex h-full items-center pl-3 text-[11px] font-semibold text-white/90">
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Consistent inner page container - same horizontal padding, max width, and
// vertical rhythm across every tab so navigation feels stable.
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8 py-6 sm:py-7 space-y-7">
      {children}
    </div>
  );
}

// Surface card - standardized container used everywhere list/analytics content
// lives. Prevents drift between panels (each tab used a slightly different
// border/background recipe before).
function Card({
  children, padded = true, className = '',
}: { children: React.ReactNode; padded?: boolean; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.01] ${padded ? 'p-5 sm:p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-12 rounded-xl bg-white/[0.03]" />
      <div className="h-12 rounded-xl bg-white/[0.025]" />
      <div className="h-12 rounded-xl bg-white/[0.02]" />
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Icon.Search c="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8 py-2 w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/30 transition"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full text-gray-500 hover:text-white hover:bg-white/10 flex items-center justify-center text-xs"
          aria-label="Clear"
        >×</button>
      )}
    </div>
  );
}

// ─── Sidebar Nav ──────────────────────────────────────────────────────────

const NAV_ITEMS: { key: Tab; label: string; icon: React.ComponentType<{ c?: string }> }[] = [
  { key: 'overview',     label: 'Overview',       icon: Icon.Home },
  { key: 'users',        label: 'Users',          icon: Icon.Users },
  { key: 'quotas',       label: 'Quotas',         icon: Icon.Bolt },
  { key: 'feedback',     label: 'Feedback',       icon: Icon.Doc },
];

function Sidebar({
  tab, setTab, counts, user, onSignOut, onBackToApp,
}: {
  tab: Tab; setTab: (t: Tab) => void;
  counts: Partial<Record<Tab, number>>;
  user: { name?: string | null; email?: string | null } | null;
  onSignOut: () => void;
  onBackToApp: () => void;
}) {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#0d0d14] sticky top-0 h-screen">
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.06]">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Icon.Sparkle c="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">Admin Suite</p>
          <p className="text-[10px] text-gray-500 leading-tight">Super-admin console</p>
        </div>
      </div>

      {/* Nav - overscroll-contain prevents the sidebar's wheel events from
          bubbling out and yanking the page; smooth scroll for keyboard nav. */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overscroll-contain scroll-smooth">
        {NAV_ITEMS.map(item => {
          const active = tab === item.key;
          const count = counts[item.key];
          const Icn = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              aria-current={active ? 'page' : undefined}
              className={`w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'text-white bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-transparent'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.03]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-y-1.5 left-0 w-0.5 bg-gradient-to-b from-indigo-400 to-violet-400 rounded-r"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icn c={`w-[18px] h-[18px] ${active ? 'text-indigo-300' : ''}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {count !== undefined && count > 0 && (
                <span className={`text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-indigo-500/20 text-indigo-200' : 'bg-white/[0.06] text-gray-500'
                }`}>{fmtNum(count)}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Back-to-app */}
      <div className="px-3 pb-2">
        <button
          onClick={onBackToApp}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition"
        >
          <Icon.Back c="w-3.5 h-3.5" />
          <span>Back to app</span>
        </button>
      </div>

      {/* User */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/[0.02]">
          <Avatar seed={user?.email || user?.name || 'admin'} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{user?.name || 'Admin'}</p>
            <p className="text-[10px] text-gray-500 truncate font-mono">{user?.email}</p>
          </div>
          <button
            onClick={onSignOut}
            title="Sign out"
            className="shrink-0 h-8 w-8 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition"
          >
            <Icon.Logout c="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileTopNav({ tab, setTab, onSignOut, onBackToApp }: {
  tab: Tab; setTab: (t: Tab) => void; onSignOut: () => void; onBackToApp: () => void;
}) {
  return (
    <div className="lg:hidden sticky top-0 z-40 bg-[#0d0d14]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_16px_-8px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Icon.Sparkle c="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">Admin Suite</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onBackToApp} title="Back to app" aria-label="Back to app"
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.05] transition">
            <Icon.Back c="w-4 h-4" />
          </button>
          <button onClick={onSignOut} title="Sign out" aria-label="Sign out"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition">
            <Icon.Logout c="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Tab strip - horizontally scrollable on small screens, with edge fade
          so users see there's more to swipe. */}
      <div className="relative">
        <div className="overflow-x-auto px-3 pb-2 flex gap-1 scrollbar-hide">
          {NAV_ITEMS.map(item => {
            const active = tab === item.key;
            const Icn = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icn c="w-3.5 h-3.5" /> {item.label}
              </button>
            );
          })}
        </div>
        <span className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-[#0d0d14] to-transparent" />
      </div>
    </div>
  );
}

// ─── Topbar ──────────────────────────────────────────────────────────────

function Topbar({ title, subtitle, onRefresh, refreshing, right }: {
  title: string; subtitle?: string; onRefresh?: () => void; refreshing?: boolean; right?: React.ReactNode;
}) {
  // Track page scroll so we can add a real shadow when content slides under
  // the bar - without it the sticky header reads as part of the page and
  // recruiters lose their bearing while scrolling long tables.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    // Mobile: not sticky - the MobileTopNav already pins to top and a second
    // sticky bar would stack on top of it. Desktop: sticky as before.
    <div
      className={`relative lg:sticky lg:top-0 z-20 lg:z-30 bg-[#0a0a0f]/90 backdrop-blur-xl border-b transition-[border-color,box-shadow] duration-200
        ${scrolled ? 'border-white/[0.10] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]' : 'border-white/[0.06]'}`}
    >
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-white leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-tight truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {right}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-gray-300 hover:text-white transition disabled:opacity-50 text-xs font-medium"
              title="Refresh data"
              aria-label="Refresh"
            >
              <Icon.Refresh c={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════

export default function AdminPortal() {
  const { user, isAuthenticated, isAdmin, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Admin access is now driven by the server `is_admin` flag (set for the
  // seeded admins + anyone promoted in the users collection), not a hardcoded
  // email - so the real product owner isn't locked out.
  const isSuperAdmin = isAuthenticated && isAdmin;

  const fetchStats = useCallback(async () => {
    const res = await apiService.getAdminStats();
    if (res.data?.total_users != null) setStats(res.data);
    else if (res.error) setError(res.error);
  }, []);
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await apiService.getAdminUsers();
    if (res.data?.users) setUsers(res.data.users);
    else if (res.error) setError(res.error);
    setLoading(false);
  }, []);
  const fetchUserDetail = useCallback(async (email: string) => {
    setLoading(true);
    const res = await apiService.getAdminUserDetail(email);
    if (res.data?.user) setSelectedUser(res.data as UserDetail);
    else if (res.error) setError(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchStats();
  }, [isSuperAdmin, fetchStats]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    // Overview and Users both surface the registered-user list (the Overview
    // funnel / "recently active" widgets read from it), so hydrate it on
    // landing for either tab.
    if (tab === 'overview' || tab === 'users') {
      if (users.length === 0) fetchUsers();
    }
  }, [tab, isSuperAdmin, users.length, fetchUsers]);

  const handleRefresh = async () => {
    setError(''); setRefreshing(true);
    await Promise.all([
      fetchStats(),
      (tab === 'users' || tab === 'overview') ? fetchUsers() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const counts: Partial<Record<Tab, number>> = {
    users: stats?.total_users,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <AdminLoginForm />;
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-7xl font-bold bg-gradient-to-b from-gray-400 to-gray-700 bg-clip-text text-transparent">403</div>
          <p className="text-gray-400">You are not authorized to access this page.</p>
          <button onClick={() => navigate('/home')} className="text-sm text-indigo-400 hover:text-indigo-300">← Back to homepage</button>
        </div>
      </div>
    );
  }

  const tabMeta: Record<Tab, { title: string; subtitle: string }> = {
    overview:     { title: 'Overview',       subtitle: 'System health, pipeline, and activity at a glance.' },
    users:        { title: 'Users',          subtitle: `${stats?.total_users ?? 0} registered · ${stats?.users_7d ?? 0} this week` },
    quotas:       { title: 'Quotas',         subtitle: 'Daily tailor limits per user. Raise for active job hunts.' },
    feedback:     { title: 'Feedback',       subtitle: 'User-submitted notes, bugs, and ideas. Respond and resolve.' },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex isolate">
      <Sidebar
        tab={tab} setTab={setTab} counts={counts}
        user={user}
        onSignOut={() => { logout(); navigate('/home'); }}
        onBackToApp={() => navigate('/home')}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        <MobileTopNav
          tab={tab} setTab={setTab}
          onSignOut={() => { logout(); navigate('/home'); }}
          onBackToApp={() => navigate('/home')}
        />
        <Topbar
          title={tabMeta[tab].title}
          subtitle={tabMeta[tab].subtitle}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="mx-6 mt-4 flex items-start justify-between gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <p className="text-sm text-red-300">{error}</p>
              <button onClick={() => setError('')} className="text-red-400/60 hover:text-red-400 text-xs">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page-scroll model: sidebar/topbar stay sticky to the viewport,
            this column contributes the long page content. Inner PageShell
            standardizes horizontal padding/max-width across every tab. */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedUser ? `user-detail:${selectedUser.user.email}` : tab}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
            >
              <PageShell>
                {selectedUser ? (
                  <UserDetailDrawer detail={selectedUser} onBack={() => setSelectedUser(null)} />
                ) : tab === 'overview' ? (
                  <OverviewPanel
                    stats={stats}
                    users={users}
                    onSelectUser={(email) => { setTab('users'); fetchUserDetail(email); }}
                  />
                ) : tab === 'users' ? (
                  <UsersPanel users={users} loading={loading} search={userSearch} setSearch={setUserSearch} onSelect={fetchUserDetail} />
                ) : tab === 'quotas' ? (
                  <QuotasPanel />
                ) : (
                  <FeedbackPanel />
                )}
              </PageShell>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ─── Overview Panel ───────────────────────────────────────────────────────

function OverviewPanel({ stats, users, onSelectUser }: {
  stats: AdminStats | null;
  users: AdminUser[];
  onSelectUser?: (email: string) => void;
}) {
  // Per-session datasets (tailoring records, applications, activity feed) were
  // backed by admin endpoints that no longer exist. Overview now derives its
  // analytics purely from the rollup `stats` payload and the user list; the
  // detail widgets degrade gracefully when these arrays are empty.
  const tailoring: any[] = [];
  const applications: AdminApplication[] = [];
  const activities: Activity[] = [];
  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.025] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <div className="h-72 rounded-2xl bg-white/[0.02] animate-pulse" />
          <div className="h-72 rounded-2xl bg-white/[0.02] animate-pulse" />
        </div>
      </div>
    );
  }
  // Cheap "trend" signal based on 7d vs 30d - no per-day data available
  const trendFrom = (seven: number, thirty: number): { direction: 'up' | 'down' | 'flat'; pct?: number } => {
    if (thirty <= 0) return { direction: 'flat' };
    const dailySeven = seven / 7;
    const dailyThirty = thirty / 30;
    if (dailyThirty === 0) return { direction: dailySeven > 0 ? 'up' : 'flat' };
    const pct = ((dailySeven - dailyThirty) / dailyThirty) * 100;
    if (Math.abs(pct) < 3) return { direction: 'flat', pct: 0 };
    return { direction: pct > 0 ? 'up' : 'down', pct };
  };

  // Fake sparklines derived from rollup counts - just for visual rhythm
  const mkSpark = (seed: number) => {
    const out: number[] = [];
    let v = Math.max(1, Math.floor(seed / 10));
    for (let i = 0; i < 12; i++) {
      v = Math.max(0, v + Math.round((Math.sin(i + seed * 0.13) + Math.cos(i * 0.7)) * Math.sqrt(seed + 1)));
      out.push(v);
    }
    return out;
  };

  const usersTrend = trendFrom(stats.users_7d, stats.users_30d);
  const tailoringTrend = trendFrom(stats.tailoring_7d, stats.tailoring_30d);

  // ATS score distribution across all tailoring records - buckets of 20.
  const atsScores: number[] = tailoring
    .map(r => r.ats_scores?.overall)
    .filter((n: any): n is number => typeof n === 'number');
  const atsBuckets = [
    { label: '0-39', value: 0 }, { label: '40-59', value: 0 },
    { label: '60-74', value: 0 }, { label: '75-89', value: 0 }, { label: '90+', value: 0 },
  ];
  for (const s of atsScores) {
    if (s < 40) atsBuckets[0].value++;
    else if (s < 60) atsBuckets[1].value++;
    else if (s < 75) atsBuckets[2].value++;
    else if (s < 90) atsBuckets[3].value++;
    else atsBuckets[4].value++;
  }
  const avgAts = atsScores.length
    ? Math.round(atsScores.reduce((a, b) => a + b, 0) / atsScores.length)
    : null;

  // Top companies / roles from tailoring records - useful for spotting demand.
  const tally = (key: (r: any) => string | undefined) => {
    const m: Record<string, number> = {};
    for (const r of tailoring) {
      const k = (key(r) || '').trim();
      if (!k || k === 'Not specified') continue;
      m[k] = (m[k] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  };
  const topCompanies = tally(r => r.jd_analysis?.company);
  const topRoles = tally(r => r.jd_analysis?.job_title);

  // Daily tailoring volume - last 14 days, by created_at.
  const days: { label: string; iso: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
      iso: d.toISOString().slice(0, 10),
      value: 0,
    });
  }
  for (const r of tailoring) {
    const d = parseISO(r.created_at);
    if (!d) continue;
    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const key = local.toISOString().slice(0, 10);
    const bucket = days.find(x => x.iso === key);
    if (bucket) bucket.value++;
  }

  // Conversion funnel - visualizes the journey through the platform.
  const appliedCount = (applications.length
    ? applications.filter(a => a.status && a.status !== 'draft').length
    : Object.entries(stats.applications_by_status || {})
        .filter(([k]) => k !== 'draft')
        .reduce((s, [, v]) => s + (v as number), 0));
  const offers = stats.applications_by_status?.offer || 0;
  const interviewing = stats.applications_by_status?.interviewing || 0;
  const funnelStages = [
    { label: 'Registered', value: stats.total_users },
    { label: 'Parsed resume', value: stats.total_parsed_resumes },
    { label: 'Tailored a JD', value: stats.total_tailoring_sessions },
    { label: 'Applied', value: appliedCount, color: 'bg-gradient-to-r from-indigo-500/70 via-blue-500/50 to-blue-500/10' },
    { label: 'Interviewing', value: interviewing, color: 'bg-gradient-to-r from-blue-500/70 via-sky-500/50 to-sky-500/10' },
    { label: 'Offer', value: offers, color: 'bg-gradient-to-r from-emerald-500/70 via-emerald-500/40 to-emerald-500/10' },
  ];

  // Activity-this-week per day, from the activities array.
  const activityDays: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    activityDays.push({
      label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      value: 0,
    });
  }
  for (const a of activities) {
    const d = parseISO(a.timestamp);
    if (!d) continue;
    const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (daysAgo < 0 || daysAgo > 6) continue;
    activityDays[6 - daysAgo].value++;
  }

  // Storage breakdown for the donut.
  const storageMax = Math.max(1, stats.total_base_resumes, stats.cached_pdf_files, stats.cached_docx_files, stats.legacy_generated_resumes);

  return (
    <div className="space-y-8">
      {/* Primary KPIs */}
      <div>
        <SectionHeading title="Snapshot" subtitle="High-level metrics across the platform." />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            label="Total Users" value={fmtNum(stats.total_users)}
            sub={`+${stats.users_7d} this week · +${stats.users_30d} this month`}
            icon={<Icon.Users c="w-4 h-4" />} color="indigo" trend={usersTrend}
            sparklineData={mkSpark(stats.total_users)}
          />
          <KPICard
            label="Tailoring Sessions" value={fmtNum(stats.total_tailoring_sessions)}
            sub={`+${stats.tailoring_7d} this week · avg ATS ${avgAts ?? ' - '}`}
            icon={<Icon.Bolt c="w-4 h-4" />} color="violet" trend={tailoringTrend}
            sparklineData={days.map(d => d.value)}
          />
          <KPICard
            label="Applications" value={fmtNum(stats.total_applications)}
            sub={stats.total_applications > 0 ? `${Math.round(((stats.applications_by_status?.offer || 0) / stats.total_applications) * 100)}% reached offer` : 'Pipeline empty'}
            icon={<Icon.Briefcase c="w-4 h-4" />} color="emerald"
            sparklineData={mkSpark(stats.total_applications)}
          />
          <KPICard
            label="Prep Packs" value={fmtNum(stats.total_interview_prep_packs)}
            sub={`${stats.total_tailoring_sessions > 0 ? Math.round((stats.total_interview_prep_packs / stats.total_tailoring_sessions) * 100) : 0}% of sessions`}
            icon={<Icon.Brain c="w-4 h-4" />} color="rose"
            sparklineData={mkSpark(stats.total_interview_prep_packs)}
          />
        </div>
      </div>

      {/* Tailoring velocity + ATS distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-6">
        <Card>
          <SectionHeading
            title="Tailoring velocity"
            subtitle={`Sessions per day, last 14 days · total ${days.reduce((s, d) => s + d.value, 0)} · peak ${Math.max(0, ...days.map(d => d.value))}/day`}
          />
          {days.some(d => d.value > 0) ? (
            <MiniBars buckets={days.map(d => ({ label: d.label, value: d.value }))} color="violet" />
          ) : (
            <p className="text-xs text-gray-600 italic py-6 text-center">No tailoring activity in the last 14 days.</p>
          )}
        </Card>
        <Card>
          <SectionHeading
            title="ATS score distribution"
            subtitle={atsScores.length > 0 ? `${atsScores.length} scored sessions · avg ${avgAts}` : 'No ATS scores yet'}
          />
          {atsScores.length > 0 ? (
            <MiniBars buckets={atsBuckets} color="emerald" />
          ) : (
            <p className="text-xs text-gray-600 italic py-6 text-center">Run tailoring + ATS scoring to populate this.</p>
          )}
        </Card>
      </div>

      {/* Conversion funnel + Top demand */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <SectionHeading
            title="Conversion funnel"
            subtitle="From signup → tailoring → application → interview → offer."
          />
          <Funnel stages={funnelStages} />
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
          <Card>
            <SectionHeading title="Top roles" subtitle="By tailoring volume." />
            {topRoles.length > 0 ? (
              <div className="space-y-3">
                {topRoles.map(([label, value]) => (
                  <HBar key={label} label={label} value={value} max={topRoles[0][1]} color="indigo" />
                ))}
              </div>
            ) : <p className="text-xs text-gray-600 italic">No role data yet.</p>}
          </Card>
          <Card>
            <SectionHeading title="Top companies" subtitle="JDs users targeted most." />
            {topCompanies.length > 0 ? (
              <div className="space-y-3">
                {topCompanies.map(([label, value]) => (
                  <HBar key={label} label={label} value={value} max={topCompanies[0][1]} color="cyan" />
                ))}
              </div>
            ) : <p className="text-xs text-gray-600 italic">No company data yet.</p>}
          </Card>
        </div>
      </div>

      {/* Secondary KPIs - infra + storage */}
      <div>
        <SectionHeading title="Storage & versioning" subtitle="How resume files are cached across the new versioning model." />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard label="Parsed Resumes" value={fmtNum(stats.total_parsed_resumes)} sub="Structured JSON extracts" icon={<Icon.Doc c="w-4 h-4" />} color="emerald" />
          <KPICard label="Base Uploads" value={fmtNum(stats.total_base_resumes)} sub="Original uploads on S3" icon={<Icon.Upload c="w-4 h-4" />} color="amber" />
          <KPICard label="Cached PDFs" value={fmtNum(stats.cached_pdf_files)} sub={`${fmtNum(stats.cached_docx_files)} DOCX · ${fmtNum(stats.total_versions)} versions`} icon={<Icon.Doc c="w-4 h-4" />} color="cyan" />
          <KPICard label="Legacy downloads" value={fmtNum(stats.legacy_generated_resumes)} sub="Pre-refactor user_resumes rows" icon={<Icon.Download c="w-4 h-4" />} color="rose" />
        </div>
        <Card className="mt-4">
          <SectionHeading title="Storage utilization" subtitle="Relative scale of each artifact type." />
          <div className="space-y-3">
            <HBar label="Base uploads (S3)" value={stats.total_base_resumes} max={storageMax} color="amber" />
            <HBar label="Cached PDFs (tailored)" value={stats.cached_pdf_files} max={storageMax} color="cyan" />
            <HBar label="Cached DOCXs (tailored)" value={stats.cached_docx_files} max={storageMax} color="violet" />
            <HBar label="Versions tracked" value={stats.total_versions} max={storageMax} color="indigo" />
            <HBar label="Legacy generated rows" value={stats.legacy_generated_resumes} max={storageMax} color="rose" />
          </div>
        </Card>
      </div>

      {/* Pipeline + Recently-active two-column. The right column has two
          tabs (people-first vs event-first) - the people view is the default
          because it's easier for a non-technical viewer to scan. */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <SectionHeading
            title="Application pipeline"
            subtitle={stats.total_applications > 0 ? `${stats.total_applications} applications across all users` : 'No applications tracked yet'}
          />
          {stats.total_applications > 0 ? (
            <PipelineBar counts={stats.applications_by_status || {}} />
          ) : (
            <EmptyHero
              icon={<Icon.Briefcase c="w-5 h-5" />}
              title="Pipeline is quiet"
              subtitle="Applications appear here as users mark status on their tailored resumes."
            />
          )}
          <div className="mt-6">
            <SectionHeading title="Activity this week" subtitle="Events per day across the platform." />
            <MiniBars buckets={activityDays} color="indigo" />
          </div>
        </Card>

        <RecentActivityCard
          activities={activities}
          users={users}
          onSelectUser={onSelectUser}
        />
      </div>
    </div>
  );
}

// Right-column card on Overview. Two views: "People" (Recently active users
// - the friendly default) and "Events" (the detailed activity log).
function RecentActivityCard({
  activities, users, onSelectUser,
}: {
  activities: Activity[];
  users: AdminUser[];
  onSelectUser?: (email: string) => void;
}) {
  const [view, setView] = useState<'people' | 'events'>('people');
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden flex flex-col">
      <div className="px-4 sm:px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">
            {view === 'people' ? 'Who used the app most recently' : 'Recent activity'}
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {view === 'people' ? 'People sorted by their last visit' : 'Last 30 days · every event'}
          </p>
        </div>
        {/* Segmented toggle - clearly labelled so the viewer knows what
            switches between the two perspectives. */}
        <div className="shrink-0 inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setView('people')}
            className={`px-2.5 py-1 rounded-md transition ${
              view === 'people' ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            People
          </button>
          <button
            type="button"
            onClick={() => setView('events')}
            className={`px-2.5 py-1 rounded-md transition ${
              view === 'events' ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Events
          </button>
        </div>
      </div>

      <div className="max-h-[480px] overflow-y-auto overscroll-contain">
        {view === 'people' ? (
          <RecentlyActiveUsers users={users} activities={activities} onSelect={onSelectUser} />
        ) : activities.length === 0 ? (
          <div className="py-14">
            <EmptyHero icon={<Icon.Sparkle c="w-5 h-5" />} title="No recent activity" />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {activities.map((a, i) => <ActivityRow key={i} a={a} />)}
          </div>
        )}
      </div>

      {/* Footer hint - gives the naive viewer a clear next action */}
      <div className="border-t border-white/[0.06] px-4 sm:px-5 py-2.5 text-[11px] text-gray-500 flex items-center justify-between">
        <span>
          {view === 'people'
            ? 'Click a person to see everything they have done'
            : `${activities.length} event${activities.length === 1 ? '' : 's'}`}
        </span>
        {view === 'people' && (
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 ml-2" /> Today
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 ml-2" /> This week
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Users Panel ──────────────────────────────────────────────────────────

function UsersPanel({ users, loading, search, setSearch, onSelect }: {
  users: AdminUser[]; loading: boolean; search: string; setSearch: (v: string) => void;
  onSelect: (email: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.email || '').toLowerCase().includes(q)
      || (u.name || '').toLowerCase().includes(q)
      || (u.role || '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const parsedPct = users.length > 0 ? Math.round((users.filter(u => u.has_parsed_resume).length / users.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Summary pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs">
          <span className="text-gray-500">Total</span>
          <span className="font-bold text-white tabular-nums">{users.length}</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
          <span className="text-emerald-300/70">Parsed</span>
          <span className="font-bold text-emerald-300 tabular-nums">{parsedPct}%</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs">
          <span className="text-indigo-300/70">Active this week</span>
          <span className="font-bold text-indigo-300 tabular-nums">{users.filter(u => {
            if (!u.last_login) return false;
            return Date.now() - new Date(u.last_login).getTime() < 7 * 86400000;
          }).length}</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex-1"><SearchBox value={search} onChange={setSearch} placeholder="Search by name, email, or role..." /></div>
        <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">{filtered.length} shown</span>
      </div>

      {loading ? <SkeletonRow /> : filtered.length === 0 ? (
        <EmptyHero icon={<Icon.Users c="w-5 h-5" />} title="No users match your search" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.01]">
          <div className="hidden md:grid grid-cols-[1fr_140px_130px_140px_160px_48px] gap-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02] text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
            <span>User</span><span>Role</span><span>Registered</span><span>Last active</span><span>Activity</span><span />
          </div>
          <div className="divide-y divide-white/[0.03]">
            {filtered.map(u => {
              const lastLoginDays = u.last_login ? (Date.now() - new Date(u.last_login).getTime()) / 86400000 : null;
              const activityDot = lastLoginDays === null ? 'bg-gray-600' :
                lastLoginDays < 1 ? 'bg-emerald-400' :
                lastLoginDays < 7 ? 'bg-amber-400' :
                lastLoginDays < 30 ? 'bg-gray-500' : 'bg-gray-700';
              return (
                <button
                  key={u.id}
                  onClick={() => onSelect(u.email)}
                  className="w-full grid grid-cols-[1fr_48px] md:grid-cols-[1fr_140px_130px_140px_160px_48px] gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left items-center"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <Avatar seed={u.name || u.email} />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${activityDot} ring-2 ring-[#0a0a0f]`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.name || u.email.split('@')[0]}</p>
                      <p className="text-[11px] text-gray-500 truncate font-mono">{u.email}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex flex-col gap-0.5">
                    {u.role ? (
                      <span className="text-xs text-gray-300 truncate">{u.role}</span>
                    ) : <span className="text-xs text-gray-600"> - </span>}
                    {u.sector && <span className="text-[10px] text-gray-600 truncate">{u.sector}</span>}
                  </div>
                  <span className="hidden md:block text-xs text-gray-500 whitespace-nowrap" title={fmtAbsolute(u.created_at)}>{fmtDate(u.created_at)}</span>
                  <span className="hidden md:block"><TimeStamp iso={u.last_login} /></span>
                  <div className="hidden md:flex items-center gap-1.5">
                    {u.has_parsed_resume && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">✓ Parsed</span>
                    )}
                    {u.tailoring_sessions > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[10px] font-semibold tabular-nums">
                        {u.tailoring_sessions} tailored
                      </span>
                    )}
                    {u.base_resumes > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold tabular-nums">
                        {u.base_resumes} base
                      </span>
                    )}
                  </div>
                  <div className="justify-self-end">
                    <Icon.Chevron c="w-4 h-4 text-gray-600 group-hover:text-gray-300" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User Detail Drawer ───────────────────────────────────────────────────

function UserDetailDrawer({ detail, onBack }: { detail: UserDetail; onBack: () => void }) {
  const { user: u, parsed_resume, base_resumes = [], generated_resumes = [], tailoring_records = [] } = detail;
  const [section, setSection] = useState<'overview' | 'resume' | 'files' | 'tailoring'>('overview');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFilename, setViewerFilename] = useState('');
  // Always null now that inline file access is disabled, but FileBlock still
  // reads it to decide the per-row "busy" state.
  const [downloadingKey] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState('');

  // Revoke any blob URL when the modal closes so we don't leak memory.
  const closeViewer = useCallback(() => {
    if (viewerUrl && viewerUrl.startsWith('blob:')) URL.revokeObjectURL(viewerUrl);
    setViewerUrl(null); setViewerFilename(''); setViewerError('');
  }, [viewerUrl]);
  useEffect(() => {
    return () => { if (viewerUrl && viewerUrl.startsWith('blob:')) URL.revokeObjectURL(viewerUrl); };
  }, [viewerUrl]);

  // Inline preview / download of a user's resume files relied on a presigned
  // S3 URL endpoint that is no longer part of the product surface. The Files
  // tab still lists what each user has on record; surfacing the raw file is
  // intentionally disabled.
  const fileAccessUnavailable = () => {
    setViewerError('Resume file access is not available in this build.');
  };
  const handleViewResume = () => fileAccessUnavailable();
  const handleDownload = () => fileAccessUnavailable();

  const sections: { key: typeof section; label: string; count?: number }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'resume',    label: 'Parsed Resume', count: parsed_resume ? 1 : 0 },
    { key: 'files',     label: 'Files', count: base_resumes.length + generated_resumes.length },
    { key: 'tailoring', label: 'Tailoring', count: tailoring_records.length },
  ];

  return (
    <div className="space-y-5">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition">
          <Icon.Back c="w-3.5 h-3.5" /> Users
        </button>
        <span className="text-gray-700">/</span>
        <span className="text-xs text-gray-300 font-mono">{u.email}</span>
      </div>

      {/* Hero */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-indigo-500/10 via-white/[0.02] to-transparent p-6">
        <div className="flex items-center gap-5">
          <Avatar seed={u.name || u.email} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white">{u.name || u.email.split('@')[0]}</h2>
              {u.role && <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06] text-gray-400">{u.role}</span>}
              {u.sector && <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.03] text-gray-500">{u.sector}</span>}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">{u.email}</p>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-500 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-gray-600">Joined</span>
                <span title={fmtAbsolute(u.created_at)} className="text-gray-300 cursor-help underline decoration-dotted decoration-gray-700 underline-offset-2">{fmtDate(u.created_at)}</span>
              </span>
              <span className="text-gray-700">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-gray-600">Last active</span>
                <TimeStamp iso={u.last_login} className="text-xs text-gray-300 whitespace-nowrap" />
              </span>
              {u.last_login_ip && (<><span className="text-gray-700">·</span><span className="font-mono text-gray-600">{u.last_login_ip}</span></>)}
            </div>
          </div>
          <div className="hidden md:grid grid-cols-3 gap-3 shrink-0">
            <MiniStat label="Resumes" value={base_resumes.length} />
            <MiniStat label="Tailored" value={tailoring_records.length} />
            <MiniStat label="Parsed" value={parsed_resume ? '✓' : ' - '} />
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06]">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition ${
              section === s.key ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {section === s.key && (
              <motion.span layoutId="detail-active" className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-indigo-400 to-violet-400" />
            )}
            {s.label}
            {s.count !== undefined && s.count > 0 && (
              <span className={`ml-1.5 text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded-full ${
                section === s.key ? 'bg-indigo-500/20 text-indigo-200' : 'bg-white/[0.04] text-gray-500'
              }`}>{s.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Section content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {section === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                  <SectionHeading title="Account" />
                  <Info label="Session ID" value={u.session_id || ' - '} mono />
                  <Info label="Fingerprint" value={u.fingerprint_hash ? u.fingerprint_hash.slice(0, 16) + '...' : ' - '} mono />
                  <Info label="Login attempts" value={String(u.login_attempts)} />
                  <Info label="Parsed resume" value={parsed_resume ? '✓ Yes' : ' - '} />
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                  <SectionHeading title="Activity" />
                  <Info label="Base uploads" value={`${base_resumes.length}`} />
                  <Info label="Generated / downloads" value={`${generated_resumes.length}`} />
                  <Info label="Tailoring sessions" value={`${tailoring_records.length}`} />
                  <Info label="Created" value={fmtDate(u.created_at)} />
                </div>
              </div>
              <AccessOverrideCard email={u.email} storedPlan={(u as { plan?: string }).plan} />
            </div>
          )}

          {section === 'resume' && (
            parsed_resume ? <ParsedResumeView r={parsed_resume} /> : <EmptyHero icon={<Icon.Doc c="w-5 h-5" />} title="No parsed resume" />
          )}

          {section === 'files' && (
            <div className="space-y-4">
              <FileBlock title="Base uploads" items={base_resumes} dateKey="uploaded_at"
                onView={handleViewResume} onDownload={handleDownload} downloadingKey={downloadingKey} />
              <FileBlock title="Legacy downloads" items={generated_resumes} dateKey="generated_at"
                onView={handleViewResume} onDownload={handleDownload} downloadingKey={downloadingKey} />
            </div>
          )}

          {section === 'tailoring' && (
            tailoring_records.length === 0 ? (
              <EmptyHero icon={<Icon.Bolt c="w-5 h-5" />} title="No tailoring sessions" />
            ) : (
              <div className="space-y-2">
                {tailoring_records.map((r: any, i: number) => <TailoringRecordCard key={i} r={r} />)}
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>

      {/* Inline error banner */}
      <AnimatePresence>
        {viewerError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm flex items-start justify-between gap-3 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl shadow-lg shadow-red-500/10 backdrop-blur-sm"
          >
            <p className="text-sm text-red-200">{viewerError}</p>
            <button onClick={() => setViewerError('')} className="text-red-400/60 hover:text-red-400 text-xs">Close</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF viewer modal - uses blob: URLs to sidestep CSP frame-src */}
      <AnimatePresence>
        {viewerUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={closeViewer}
          >
            <motion.div
              initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }}
              transition={{ type: 'spring', damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="relative w-[95vw] h-[92vh] max-w-5xl bg-[#12121a] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
                <p className="text-sm text-white font-medium truncate">{viewerFilename}</p>
                <div className="flex items-center gap-1">
                  <a
                    href={viewerUrl} download={viewerFilename}
                    className="h-8 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-gray-300 border border-white/[0.06] inline-flex items-center gap-1.5"
                    title="Download this file"
                  ><Icon.Download c="w-3.5 h-3.5" />Download</a>
                  <button onClick={closeViewer} className="h-8 w-8 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] flex items-center justify-center"><Icon.X c="w-5 h-5" /></button>
                </div>
              </div>
              <iframe src={viewerUrl} className="flex-1 w-full border-0 bg-[#1a1a24]" title={viewerFilename} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Runtime full-access grant for testers/devs. Overlays `overrides.plan` on top
// of the user's stored plan server-side; clearing the override restores it.
// Also supports limits/features overrides for Auto Apply testing.
function AccessOverrideCard({ email, storedPlan }: { email: string; storedPlan?: string | null }) {
  const [override, setOverride] = useState<AdminUserOverride | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSubmitLimit, setAutoSubmitLimit] = useState('999');

  const fetchOverride = useCallback(async () => {
    setLoading(true);
    const res = await apiService.getAdminUserOverride(email);
    if (res.error) {
      toast.error('Failed to load access override', { description: res.error });
      setOverride(null);
    } else {
      setOverride(res.data ?? null);
      const lim = res.data?.overrides?.limits?.auto_submit;
      if (lim != null) setAutoSubmitLimit(String(lim));
    }
    setLoading(false);
  }, [email]);

  useEffect(() => { fetchOverride(); }, [fetchOverride]);

  const overridePlan = override?.overrides?.plan;
  const fullAccess = !!overridePlan; // any override plan lifts the user above their stored plan
  const effectivePlan = overridePlan || storedPlan || 'free';
  const ovLimits = override?.overrides?.limits || {};
  const ovFeatures = override?.overrides?.features;

  const write = useCallback(async (overrides: Record<string, unknown>, successMsg: string) => {
    setSaving(true);
    const res = await apiService.setAdminUserOverride(email, overrides);
    if (res.error) {
      toast.error('Could not update access override', { description: res.error });
      setSaving(false);
      return;
    }
    toast.success(successMsg);
    await fetchOverride();
    setSaving(false);
  }, [email, fetchOverride]);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
      <SectionHeading
        title="Access override"
        subtitle="Grant plan / Auto Apply limits / features for testing. Clears restore the stored plan."
        action={
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
            fullAccess || Object.keys(ovLimits).length > 0
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-white/[0.03] border-white/[0.06] text-gray-500'
          }`}>
            {loading ? 'Loading...' : fullAccess ? 'Full access active' : 'No plan override'}
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-gray-600">Stored plan</span>
          <span className="font-mono text-gray-300">{storedPlan || 'free'}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-gray-600">Effective</span>
          <span className="font-mono text-emerald-300">{effectivePlan}</span>
        </span>
        {override?.updated_by && (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-gray-600">By</span>
            <span className="font-mono text-gray-400">{override.updated_by}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => write({ plan: 'premium_plus' }, 'Full access granted (Premium+).')}
          disabled={saving || loading || overridePlan === 'premium_plus'}
          className="h-9 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-medium inline-flex items-center gap-1.5 hover:from-indigo-400 hover:to-violet-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon.Bolt c="w-3.5 h-3.5" />
          Grant Premium+
        </button>
        <button
          onClick={() => write({ plan: 'premium' }, 'Premium override set.')}
          disabled={saving || loading}
          className="h-9 px-4 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs font-medium border border-white/[0.06] transition disabled:opacity-40"
        >
          Grant Premium
        </button>
        <button
          onClick={() => write({
            plan: effectivePlan === 'free' ? 'premium' : effectivePlan,
            features: Array.isArray(ovFeatures)
              ? [...new Set([...(ovFeatures as string[]), 'auto_apply'])]
              : { ...(typeof ovFeatures === 'object' && ovFeatures ? ovFeatures : {}), auto_apply: true },
            limits: { ...ovLimits, auto_submit: Number(autoSubmitLimit) || 999 },
          }, 'Auto Apply testing unlock applied.')}
          disabled={saving || loading}
          className="h-9 px-4 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-medium border border-emerald-500/30 transition disabled:opacity-40"
        >
          Unlock Auto Apply (test)
        </button>
        <button
          onClick={() => write({}, 'Override cleared - reset to stored plan.')}
          disabled={saving || loading || !override?.overrides}
          className="h-9 px-4 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs font-medium border border-white/[0.06] inline-flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reset to plan
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
        <label className="inline-flex items-center gap-1.5">
          Daily auto_submit limit
          <input
            value={autoSubmitLimit}
            onChange={(e) => setAutoSubmitLimit(e.target.value)}
            className="h-8 w-20 rounded-md border border-white/[0.08] bg-black/30 px-2 font-mono text-gray-200"
          />
        </label>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-white tabular-nums leading-tight">{value}</p>
    </div>
  );
}
function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold shrink-0">{label}</span>
      <span className={`text-xs text-gray-300 text-right ${mono ? 'font-mono' : ''} break-all`}>{value}</span>
    </div>
  );
}

function FileBlock({ title, items, dateKey, onView, onDownload, downloadingKey }: {
  title: string; items: any[]; dateKey: string;
  onView: (k: string, f?: string) => void;
  onDownload: (k: string, f?: string) => void;
  downloadingKey: string | null;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <SectionHeading title={title} />
        <p className="text-xs text-gray-600 italic">No {title.toLowerCase()}.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-[11px] text-gray-600">{items.length} file{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {items.map((f, i) => {
          const busy = downloadingKey === f.s3_key;
          return (
            <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition">
              <div className="h-9 w-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                <Icon.Doc c="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">{f.filename || f.job_title || '(no name)'}</p>
                <p className="text-[11px] text-gray-500 inline-flex items-center gap-1.5">
                  <TimeStamp iso={f[dateKey]} className="text-[11px] text-gray-500" />
                  {f.size_bytes ? <><span>·</span><span className="tabular-nums">{Math.round(f.size_bytes / 1024)} KB</span></> : null}
                </p>
              </div>
              <button
                onClick={() => onView(f.s3_key, f.filename)}
                disabled={busy}
                className="h-8 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-gray-300 border border-white/[0.06] inline-flex items-center gap-1.5 disabled:opacity-50"
              ><Icon.Eye c="w-3.5 h-3.5" />{busy ? '...' : 'View'}</button>
              <button
                onClick={() => onDownload(f.s3_key, f.filename)}
                disabled={busy}
                className="h-8 px-3 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-[11px] text-indigo-300 border border-indigo-500/25 inline-flex items-center gap-1.5 disabled:opacity-50"
              ><Icon.Download c="w-3.5 h-3.5" />Download</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TailoringRecordCard({ r }: { r: any }) {
  const s = r._summary || {};
  const ats = r.ats_scores?.overall;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{r.jd_analysis?.job_title || 'Untitled'}</p>
          {r.jd_analysis?.company && r.jd_analysis.company !== 'Not specified' && (
            <p className="text-[11px] text-gray-500">at {r.jd_analysis.company}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {s.version_count > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 text-[10px] font-semibold border border-violet-500/25">
                v{s.current_version_number ?? s.version_count}/{s.version_count}
                {s.current_source && s.current_source !== 'initial' && <span className="opacity-60 text-[9px]">· {s.current_source}</span>}
              </span>
            )}
            {s.files_cached > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/25">
                {s.files_cached} cached
              </span>
            )}
            {s.application_status && <StatusPill status={s.application_status} size="sm" />}
            {s.interview_prep_ready && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-semibold border border-blue-500/25">✓ Prep</span>
            )}
          </div>
          {r.base_resume_filename && <p className="text-[10px] text-gray-600 mt-2">Base: {r.base_resume_filename}</p>}
          {s.next_action_date && (
            <p className="text-[10px] text-amber-400/80 mt-1">
              Next: <TimeStamp iso={s.next_action_date} className="text-[10px] text-amber-300" />
              {s.next_action_note ? ` · ${s.next_action_note}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {ats != null && (
            <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl ${
              ats >= 80 ? 'bg-emerald-500/10' : ats >= 60 ? 'bg-amber-500/10' : 'bg-red-500/10'
            }`}>
              <span className={`text-lg font-bold tabular-nums ${
                ats >= 80 ? 'text-emerald-400' : ats >= 60 ? 'text-amber-400' : 'text-red-400'
              }`}>{ats}</span>
              <span className="text-[9px] text-gray-500 uppercase">ATS</span>
            </div>
          )}
          <TimeStamp iso={r.created_at} className="text-[10px] text-gray-600" />
        </div>
      </div>
    </div>
  );
}

function ParsedResumeView({ r }: { r: any }) {
  return (
    <div className="space-y-5">
      {r.summary && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Summary</p>
          <p className="text-sm text-gray-300 leading-relaxed">{r.summary}</p>
        </div>
      )}
      {r.skills && Object.keys(r.skills).length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Skills</p>
          <div className="space-y-2.5">
            {Object.entries(r.skills).map(([cat, sk]) => (
              <div key={cat}>
                <p className="text-[11px] text-indigo-400 font-medium mb-1">{cat}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(sk as string[]).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-white/[0.04] border border-white/[0.05] text-gray-400">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {r.experience?.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Experience ({r.experience.length})</p>
          <div className="space-y-3">
            {r.experience.map((e: any, i: number) => (
              <div key={i} className="border-l-2 border-indigo-500/30 pl-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-white font-medium">{e.title}</p>
                    <p className="text-[11px] text-gray-400">{e.company}{e.location && ` · ${e.location}`}</p>
                  </div>
                  {e.dates && <span className="text-[10px] text-gray-600 whitespace-nowrap">{e.dates}</span>}
                </div>
                {e.bullets?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {e.bullets.map((b: string, j: number) => (
                      <li key={j} className="text-[11px] text-gray-400 leading-relaxed flex gap-2">
                        <span className="text-gray-600 mt-0.5">•</span><span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────

function AdminLoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.error) setError(r.error);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradient flourish */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-sm space-y-7"
      >
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/30">
            <Icon.Sparkle c="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-1.5">Sign in with your admin credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm"
              >{error}</motion.div>
            )}
          </AnimatePresence>
          <div className="space-y-1.5">
            <label className="block text-xs text-gray-400 font-medium">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              placeholder="admin@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-gray-400 font-medium">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              placeholder="Enter your password" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30">
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
