import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Sparkles, ArrowRight, FileText, Search, GraduationCap, Trophy,
  MessageSquareText, LineChart, PenLine, ShieldCheck, Compass, Brain,
  Rocket, Check, Star, Zap, Crown,
} from 'lucide-react';

/**
 * JobPilot's public landing page — the product's "wow" surface. Communicates
 * the vision, the all-in-one differentiation no competitor matches, and every
 * pillar of the platform. Mobile-first, motion-rich, conversion-focused.
 */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } }),
};

const JOURNEY = [
  { icon: GraduationCap, label: 'Learn', tint: 'from-violet-500/20 to-violet-500/5' },
  { icon: FileText, label: 'Tailor', tint: 'from-blue-500/20 to-blue-500/5' },
  { icon: Search, label: 'Apply', tint: 'from-cyan-500/20 to-cyan-500/5' },
  { icon: MessageSquareText, label: 'Interview', tint: 'from-emerald-500/20 to-emerald-500/5' },
  { icon: Trophy, label: 'Stand out', tint: 'from-amber-500/20 to-amber-500/5' },
  { icon: Rocket, label: 'Get hired', tint: 'from-rose-500/20 to-rose-500/5' },
];

const PILLARS = [
  { icon: FileText, t: 'Per-job resume tailoring', d: 'AI rewrites your resume for each role — grounded in your real experience, ATS-scored, never fabricated.' },
  { icon: Search, t: 'Smarter job search', d: 'Find roles that fit, match them to your resume, and track every application in one pipeline.' },
  { icon: GraduationCap, t: 'Self-learning hub', d: 'End-to-end study plans for any topic — finish a module and we surface the jobs it just unlocked.' },
  { icon: Trophy, t: 'Legit hackathons & webinars', d: 'Curated, legitimacy-scored events from top companies — then draft the LinkedIn post about it in one click.' },
  { icon: MessageSquareText, t: 'Interview Pattern Coach', d: 'Practice across roles and we flag your recurring weak spots, then drill them until they’re gone.' },
  { icon: LineChart, t: 'ATS · fit · salary intel', d: 'Know your ATS readiness, interview fit, and salary benchmark for every role before you invest time.' },
  { icon: PenLine, t: 'AI career narrative', d: 'Turn wins, learnings, and events into audience-tailored posts that bring recruiters to you.' },
  { icon: Brain, t: 'Your senior recruiter, on tap', d: 'A personalized advisor that plans your next best move — from target role to offer.' },
];

const DIFF = [
  { t: 'Skill → resume → job loop', d: 'Learning platforms don’t apply for you. Auto-appliers don’t track what you learned. We connect both.' },
  { t: 'Coaching that remembers', d: 'We track interview performance across every role to find patterns one-off tools never see.' },
  { t: 'Hackathon → hiring', d: 'No one turns a hackathon win into a resume line, a post, and the companies that hire for it. We do.' },
  { t: 'One platform, not seven tabs', d: 'Stop paying for a resume tool, a tracker, a coach, and a course. It’s all here, personalized to you.' },
];

const PRICING = [
  { id: 'free', name: 'Free', price: 0, icon: Sparkles, blurb: 'A genuinely useful free core', perks: ['5 tailored resumes / day', 'ATS scores & applications tracker', 'Browse curated events', '1 learning path'] },
  { id: 'premium', name: 'Premium', price: 19.99, icon: Zap, popular: true, blurb: 'For a serious, active search', perks: ['30 tailors/day, unlimited ATS', 'Interview Pattern Coach', 'Personalized events + advisor', '5 learning paths'] },
  { id: 'plus', name: 'Premium+', price: 39.99, icon: Crown, blurb: 'Everything, unlimited', perks: ['Unlimited everything', 'Predictive coaching + drills', 'Negotiation scripts', 'Unlimited learning + posts'] },
];

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-lg tracking-tight">JobPilot</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* gradient mesh */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute right-[5%] top-[20%] h-[260px] w-[260px] rounded-full bg-violet-500/20 blur-[100px]" />
        <div className="absolute left-[5%] top-[35%] h-[220px] w-[220px] rounded-full bg-cyan-500/20 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}
          className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          The all-in-one career platform · freemium
        </motion.div>

        <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
          className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          The only platform that takes you{' '}
          <span className="bg-gradient-to-r from-primary via-violet-500 to-cyan-500 bg-clip-text text-transparent">
            from learning to hired
          </span>
        </motion.h1>

        <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
          className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          Learn the skills, tailor every resume, apply smarter, ace the interview, and build a standout
          profile — all in one place, personalized to you, guided like you have a senior recruiter in your corner.
        </motion.p>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/register">Start free <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link to="/login">Continue with Google</Link>
          </Button>
        </motion.div>
        <motion.p variants={fadeUp} initial="hidden" animate="show" custom={4} className="mt-3 text-xs text-muted-foreground">
          Free to start · no credit card · productive resumes, never fake
        </motion.p>
      </div>
    </section>
  );
}

function Journey() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="mb-6 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        One connected journey — not seven disconnected tools
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-2">
        {JOURNEY.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
              className="flex items-center gap-2 sm:gap-3">
              <div className={`flex flex-col items-center gap-2 rounded-2xl border border-border bg-gradient-to-b ${s.tint} px-4 py-3`}>
                <Icon className="h-5 w-5 text-foreground" />
                <span className="text-xs font-semibold">{s.label}</span>
              </div>
              {i < JOURNEY.length - 1 && <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function VisionMission() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 inline-flex items-center gap-2 text-primary">
            <Compass className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-wide">Our vision</span>
          </div>
          <p className="text-lg font-medium leading-snug">
            Everyone deserves a senior recruiter in their corner — and the skills to back up a resume they’re proud of.
          </p>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1}
          className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 inline-flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-wide">Our mission</span>
          </div>
          <p className="text-lg font-medium leading-snug">
            Help you land the right role faster and more fairly — with AI that builds real skills and
            productive, honest resumes, never fabricated ones.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything your job hunt needs</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Each piece is great on its own. Together, they compound — because they all know you.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div key={p.t} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i % 4}
              className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
              <span className="mb-4 inline-grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold">{p.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.d}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function Difference() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why we’re different</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Teal, Huntr, Jobright, Pathrise, Coursera — each does one slice. We connect the whole loop, and own the gaps no one fills.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {DIFF.map((d, i) => (
            <motion.div key={d.t} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
              className="flex gap-3 rounded-2xl border border-border bg-card p-5">
              <Star className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">{d.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d.d}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Start free. Upgrade when it pays off.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">A generous free core — premium unlocks the AI superpowers and analytics.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {PRICING.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div key={p.id} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 ${p.popular ? 'border-primary shadow-lg ring-1 ring-primary/30' : 'border-border'}`}>
              {p.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                  Most popular
                </span>
              )}
              <div className="flex items-center gap-2 text-primary">
                <Icon className="h-5 w-5" />
                <span className="text-lg font-bold text-foreground">{p.name}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
              <p className="mt-4 text-4xl font-extrabold">${p.price}<span className="text-base font-medium text-muted-foreground">/mo</span></p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6" variant={p.popular ? 'default' : 'outline'}>
                <Link to="/register">{p.id === 'free' ? 'Start free' : `Choose ${p.name}`}</Link>
              </Button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-10 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Your next role starts here</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Build the skills, the resume, and the story — and let JobPilot pilot the rest.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/register">Create your free account <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          JobPilot <span className="font-normal text-muted-foreground">by Aithrex</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="hover:text-foreground">Sign in</Link>
          <Link to="/register" className="hover:text-foreground">Get started</Link>
          <Link to="/applypilot/privacy" className="hover:text-foreground">Privacy</Link>
        </div>
        <p>© {new Date().getFullYear()} Aithrex</p>
      </div>
    </footer>
  );
}

export default function LandingExperience() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Journey />
        <VisionMission />
        <Pillars />
        <Difference />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
