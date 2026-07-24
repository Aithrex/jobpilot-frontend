import {
  Link2, Sparkles, Search, FileText, Send, ClipboardList, Mic,
  GraduationCap, Trophy, PenLine, Bot, Plane, LayoutDashboard, ArrowRight,
} from 'lucide-react';

/**
 * Contextual cross-link strip - the interconnection tissue across tabs.
 *
 * Rendered once above the active tab in ResumeParser. Given the current tab,
 * it surfaces the 2-3 most relevant *other* features and navigates to them via
 * a decoupled `jobpilot:navigate` window event (ResumeParser listens). This
 * lets every legacy tab participate in the interconnected workspace without
 * editing each file.
 */
const META: Record<string, { label: string; icon: typeof Sparkles }> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  tailor: { label: 'Tailor a resume', icon: Sparkles },
  jobs: { label: 'Find jobs', icon: Search },
  'my-resumes': { label: 'Your resumes', icon: FileText },
  tailored: { label: 'Tailored resumes', icon: FileText },
  batch: { label: 'Batch tailor', icon: Send },
  applications: { label: 'Applications', icon: ClipboardList },
  interview: { label: 'Interview prep', icon: Mic },
  learning: { label: 'Learn skills', icon: GraduationCap },
  events: { label: 'Events', icon: Trophy },
  network: { label: 'Draft a post', icon: PenLine },
  copilot: { label: 'Career copilot', icon: Bot },
  visa: { label: 'Visa timeline', icon: Plane },
};

// from-tab → the most relevant related tabs (the interconnection map).
const RELATED: Record<string, string[]> = {
  jobs: ['tailor', 'learning', 'applications'],
  tailor: ['jobs', 'applications', 'interview'],
  'my-resumes': ['tailor', 'learning', 'applications'],
  tailored: ['applications', 'interview', 'network'],
  batch: ['jobs', 'applications'],
  applications: ['interview', 'network', 'jobs'],
  interview: ['applications', 'learning', 'copilot'],
  copilot: ['applications', 'interview', 'learning'],
  visa: ['applications', 'copilot'],
  beta: ['jobs', 'dashboard'],
  learning: ['jobs', 'my-resumes', 'interview'],
  events: ['network', 'copilot'],
  network: ['events', 'applications'],
};

function go(tab: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jobpilot:navigate', { detail: tab }));
  }
}

export function ConnectedTo({ from }: { from: string }) {
  const related = (RELATED[from] || []).filter((t) => META[t]);
  if (related.length === 0) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" /> Connected to
      </span>
      {related.map((t) => {
        const m = META[t];
        const Icon = m.icon;
        return (
          <button
            key={t}
            onClick={() => go(t)}
            className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="h-3.5 w-3.5" />
            {m.label}
            <ArrowRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
          </button>
        );
      })}
    </div>
  );
}

export default ConnectedTo;
