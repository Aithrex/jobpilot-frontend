import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  ArrowRight,
  Sparkles,
  Target,
  LineChart,
  Search,
  FileText,
  GraduationCap,
  ClipboardList,
  Bot,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Compass,
} from 'lucide-react';

/**
 * JobPilot — public marketing landing page.
 * Product-first entry point. Logged-in users are nudged straight into the
 * workspace; everyone else gets a clean, professional pitch and a path to
 * sign up. This replaces the old personal-portfolio Welcome page.
 */

const FEATURES = [
  {
    icon: LineChart,
    title: 'Live market trends',
    body: 'See what skills, titles, and stacks are heating up right now — a daily, AI-curated pulse so you always aim where the hiring is.',
  },
  {
    icon: Search,
    title: 'Opportunities, fast',
    body: 'Aggregated roles from across the web and company career pages, scored against your resume so the best-fit jobs surface first.',
  },
  {
    icon: Target,
    title: 'Tailored to every JD',
    body: 'Paste a job description and get a resume rewritten for it — accurate, ATS-scored, keyword-aligned, and grounded in your real experience.',
  },
  {
    icon: GraduationCap,
    title: 'A learning workspace',
    body: 'Interview prep, a coding & system-design playground, and a career copilot that turns the hunt into deliberate, compounding practice.',
  },
  {
    icon: ClipboardList,
    title: 'Track every application',
    body: 'One pipeline for drafts, applied, interviewing, and offers — with follow-up reminders so nothing slips through the cracks.',
  },
  {
    icon: Bot,
    title: 'Agentic career copilot',
    body: 'A RAG-grounded assistant that knows your resume and your goals, drafts outreach, and recommends your next best action.',
  },
];

const STEPS = [
  {
    icon: FileText,
    title: 'Upload your resume',
    body: 'We parse it into structured experience, skills, and projects you can reuse everywhere.',
  },
  {
    icon: Compass,
    title: 'Find & target roles',
    body: 'Discover scored opportunities and read the market, then tailor your resume to any JD in seconds.',
  },
  {
    icon: GraduationCap,
    title: 'Prep & apply with intent',
    body: 'Practice interviews, track applications, and let the copilot keep you moving forward every day.',
  },
];

const STATS = [
  { value: 'ATS-scored', label: 'Every tailored resume' },
  { value: 'Per-JD', label: 'Accurate, grounded rewrites' },
  { value: 'Daily', label: 'Market & career intelligence' },
  { value: 'One place', label: 'Search · tailor · track · prep' },
];

function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`}>
      <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl shadow-lg shadow-primary/25">
        <Sparkles className="h-4 w-4 text-white" strokeWidth={2.2} />
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight">JobPilot</span>
    </Link>
  );
}

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const primaryHref = isAuthenticated ? '/app' : '/register';
  const primaryLabel = isAuthenticated ? 'Open your workspace' : 'Get started free';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#workspace" className="transition-colors hover:text-foreground">Workspace</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to={primaryHref}>{isAuthenticated ? 'Workspace' : 'Get started'}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(60% 50% at 50% 0%, hsl(var(--brand-from)) 0%, transparent 70%)',
          }}
        />
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              The job hunt, turned into a productive workspace
            </span>
            <h1 className="font-display mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
              Land the right role,
              <br />
              <span className="gradient-text">not just any role.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
              JobPilot is a focused workspace for students and job seekers: read the market,
              surface opportunities fast, tailor your resume accurately to every job description,
              and prep with intent — all in one place built to make you better, not just busier.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-7 text-base">
                <Link to={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
                <Link to="/app">Explore the workspace</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No spam. Free to start. Your data stays yours.
            </p>
          </div>

          {/* Stat band */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-card px-5 py-6 text-center">
                <div className="gradient-text font-display text-xl font-extrabold">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Everything in one place</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Built to make the hunt feel like progress
            </h2>
            <p className="mt-4 text-muted-foreground">
              Most tools just collect listings. JobPilot is a system — search, intelligence,
              tailoring, tracking, and practice that reinforce each other.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="font-display mt-4 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">How it works</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              From resume to offer, with a plan
            </h2>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Step {i + 1}
                </div>
                <h3 className="font-display mt-1 text-lg font-bold">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workspace highlight ─────────────────────────────────────────── */}
      <section id="workspace" className="border-t border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">A workspace, not a feed</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Calm, focused, and actually productive
            </h2>
            <p className="mt-4 text-muted-foreground">
              A clean sidebar workspace puts every tool a click away — and keeps you in flow
              instead of bouncing between ten browser tabs.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Accurate, ATS-scored resume tailoring grounded in your real experience',
                'Daily market & career intelligence so you aim where hiring is happening',
                'Interview prep with practice questions, a coach, and a learning playground',
                'A single pipeline to track applications and never miss a follow-up',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span className="text-foreground/90">{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Stylized workspace preview */}
          <div className="rounded-2xl border border-border bg-card p-3 shadow-xl">
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-3 rounded-xl bg-secondary/60 p-3">
              <div className="space-y-1.5">
                {['Dashboard', 'Tailor', 'Jobs', 'Applications', 'Interview', 'Copilot'].map((n, i) => (
                  <div
                    key={n}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold ${
                      i === 0 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                    {n}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Zap, k: 'Applied', v: '24' },
                    { icon: Target, k: 'Match avg', v: '82%' },
                    { icon: ShieldCheck, k: 'Streak', v: '7d' },
                  ].map((c) => (
                    <div key={c.k} className="rounded-lg border border-border bg-card p-2.5">
                      <c.icon className="h-3.5 w-3.5 text-primary" />
                      <div className="font-display mt-1.5 text-base font-extrabold">{c.v}</div>
                      <div className="text-[9px] text-muted-foreground">{c.k}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="mb-2 h-2 w-1/3 rounded bg-primary/30" />
                  <div className="space-y-1.5">
                    <div className="h-2 w-full rounded bg-muted" />
                    <div className="h-2 w-5/6 rounded bg-muted" />
                    <div className="h-2 w-2/3 rounded bg-muted" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-7 flex-1 rounded-lg brand-gradient opacity-90" />
                  <div className="h-7 w-16 rounded-lg border border-border bg-card" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="brand-gradient relative overflow-hidden rounded-3xl px-8 py-14 text-center text-white shadow-xl sm:px-16">
            <h2 className="font-display mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your next role is a workspace away
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/90">
              Stop juggling tabs and spray-and-pray applications. Work the hunt like a pro.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary" className="h-12 px-7 text-base">
                <Link to={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/40 bg-transparent px-7 text-base text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row sm:px-8">
          <Logo />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} JobPilot. Built for job seekers, not for ad clicks.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link to="/applypilot/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
            <Link to="/register" className="hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
