import { useRef, useState, KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { MultiAgentProcessing } from './MultiAgentProcessing';
import {
  Briefcase, Compass, Rocket, MapPin, GraduationCap, Sparkles, X, Loader2, Check,
  UploadCloud, FileText, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * First-run personalization. RESUME-FIRST: the primary action is uploading one
 * resume — a team of agents analyzes it, we auto-derive skills + target roles,
 * and the whole workspace personalizes. Users can then "Enter" immediately or
 * "Refine" through optional preference steps. Shown when an authenticated user
 * hasn't completed onboarding (covers new signups + retrofitted users).
 */

type Intensity = 'exploring' | 'active' | 'all_in';
type ResumeState = 'idle' | 'parsing' | 'parsed' | 'error';

const INTENSITY: { id: Intensity; icon: typeof Compass; title: string; sub: string }[] = [
  { id: 'exploring', icon: Compass, title: 'Just exploring', sub: 'Keeping an eye out for the right thing' },
  { id: 'active', icon: Briefcase, title: 'Actively applying', sub: 'Sending applications regularly' },
  { id: 'all_in', icon: Rocket, title: 'All in', sub: 'Job hunt is my top priority right now' },
];
const ROLE_SUGGESTIONS = ['Software Engineer', 'Data Scientist', 'Product Manager', 'DevOps Engineer', 'Designer', 'ML Engineer'];
const SKILL_SUGGESTIONS = ['Python', 'React', 'AWS', 'SQL', 'TypeScript', 'Kubernetes', 'System Design'];
const INTEREST_SUGGESTIONS = ['System Design', 'Cloud / AWS', 'Machine Learning', 'Data Structures', 'Leadership', 'Product Sense'];
const REMOTE = ['Remote', 'Hybrid', 'On-site', 'Any'];
const EXPERIENCE = ['Student / New grad', '1–3 years', '3–6 years', '6–10 years', '10+ years'];

function deriveFromResume(parsed: any): { skills: string[]; roles: string[] } {
  const skillsObj = parsed?.skills && typeof parsed.skills === 'object' ? parsed.skills : {};
  const skills = Array.from(new Set((Object.values(skillsObj).flat() as unknown[]).filter(Boolean) as string[])).slice(0, 12);
  const exp = Array.isArray(parsed?.experience) ? parsed.experience : [];
  const roles = Array.from(new Set(exp.map((e: any) => e?.title).filter(Boolean) as string[])).slice(0, 4);
  return { skills, roles };
}

function TagInput({ value, onChange, placeholder, suggestions }: {
  value: string[]; onChange: (v: string[]) => void; placeholder: string; suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');
  const add = (t: string) => {
    const v = t.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
    else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-input bg-background p-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm text-primary">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => add(draft)}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
        />
      </div>
      {suggestions && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.filter((s) => !value.includes(s)).map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingWizard() {
  const { user, isAuthenticated, savePreferences } = useAuth();
  const [step, setStep] = useState(0); // 0 = resume; 1..5 = preference steps
  const [saving, setSaving] = useState(false);
  const [resumeState, setResumeState] = useState<ResumeState>('idle');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [intensity, setIntensity] = useState<Intensity | ''>('');
  const [roles, setRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [remote, setRemote] = useState('Remote');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  const show = isAuthenticated && !!user && user.onboarded === false;
  if (!show) return null;

  const TOTAL = 6;

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      toast.error('Please upload a PDF or Word document.');
      return;
    }
    setResumeState('parsing');
    const res = await apiService.uploadResumeForParser(file);
    if (res.error) {
      setResumeState('error');
      toast.error('Could not read that resume', { description: res.error });
      return;
    }
    const parsed = (res.data as any)?.parsed_resume ?? (res.data as any)?.resume ?? {};
    const { skills: s, roles: r } = deriveFromResume(parsed);
    if (s.length) setSkills(s);
    if (r.length) setRoles(r);
    setResumeState('parsed');
  };

  const persist = async (complete: boolean) => {
    setSaving(true);
    const prefs: Record<string, unknown> = { onboarding_complete: complete };
    if (intensity) prefs.intensity = intensity;
    if (roles.length) prefs.target_roles = roles;
    if (locations.length) prefs.target_locations = locations;
    if (remote) prefs.remote_pref = remote;
    if (experience) prefs.experience_level = experience;
    if (skills.length) prefs.current_skills = skills;
    if (interests.length) prefs.learning_interests = interests;
    const res = await savePreferences(prefs);
    setSaving(false);
    if (res.error) { toast.error('Could not save', { description: res.error }); return; }
    if (complete) toast.success("You're all set — welcome aboard!");
  };

  // ── Preference steps (1..5) ──
  const prefSteps = [
    {
      icon: Sparkles, title: 'How’s your search going?', sub: 'We’ll tune the pace of nudges to match.',
      body: (
        <div className="grid gap-3">
          {INTENSITY.map((o) => {
            const Icon = o.icon; const active = intensity === o.id;
            return (
              <button key={o.id} type="button" onClick={() => setIntensity(o.id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${active ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/50'}`}>
                <span className={`grid h-10 w-10 place-items-center rounded-lg ${active ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{o.title}</span>
                  <span className="block text-sm text-muted-foreground">{o.sub}</span>
                </span>
                {active && <Check className="h-5 w-5 text-primary" />}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      icon: Briefcase, title: 'Roles you’re targeting', sub: 'Prefilled from your resume — tweak as needed.',
      body: <TagInput value={roles} onChange={setRoles} placeholder="Type a role and press Enter" suggestions={ROLE_SUGGESTIONS} />,
    },
    {
      icon: MapPin, title: 'Where do you want to work?', sub: 'Locations and your remote preference.',
      body: (
        <div className="space-y-4">
          <TagInput value={locations} onChange={setLocations} placeholder="City or country (optional)" />
          <div>
            <Label className="mb-2 block text-sm">Work style</Label>
            <div className="flex flex-wrap gap-2">
              {REMOTE.map((r) => (
                <button key={r} type="button" onClick={() => setRemote(r)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${remote === r ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: GraduationCap, title: 'Experience & skills', sub: 'Skills prefilled from your resume.',
      body: (
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm">Experience</Label>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE.map((e) => (
                <button key={e} type="button" onClick={() => setExperience(e)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${experience === e ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block text-sm">Top skills</Label>
            <TagInput value={skills} onChange={setSkills} placeholder="Add a skill" suggestions={SKILL_SUGGESTIONS} />
          </div>
        </div>
      ),
    },
    {
      icon: Rocket, title: 'What do you want to grow?', sub: 'We build end-to-end learning paths around these.',
      body: <TagInput value={interests} onChange={setInterests} placeholder="A topic you want to master" suggestions={INTEREST_SUGGESTIONS} />,
    },
  ];

  const onResume = step === 0;
  const pref = prefSteps[step - 1];
  const isLast = step === TOTAL - 1;

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !saving && resumeState !== 'parsing') persist(true); }}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-2xl">
        {/* progress */}
        <div className="flex items-center gap-1.5 px-6 pt-5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {onResume ? (
          <ResumeStep
            state={resumeState}
            onPick={() => fileRef.current?.click()}
            onDrop={handleFile}
            onRetry={() => setResumeState('idle')}
            onManual={() => setStep(1)}
            onEnter={() => persist(true)}
            onRefine={() => setStep(1)}
            saving={saving}
            skills={skills}
            roles={roles}
          />
        ) : (
          <>
            <div className="px-6 pb-2 pt-5">
              <div className="flex items-center gap-2 text-primary">
                <pref.icon className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wide">Step {step + 1} of {TOTAL}</span>
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight">{pref.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{pref.sub}</p>
            </div>
            <div className="min-h-[230px] px-6 py-3">
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  {pref.body}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-6 py-4">
              <button type="button" onClick={() => persist(true)} disabled={saving} className="text-sm text-muted-foreground hover:text-foreground">
                Skip for now
              </button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={saving}>Back</Button>
                {!isLast ? (
                  <Button onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !intensity}>Continue</Button>
                ) : (
                  <Button onClick={() => persist(true)} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Finish
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
      </DialogContent>
    </Dialog>
  );
}

function ResumeStep({
  state, onPick, onDrop, onRetry, onManual, onEnter, onRefine, saving, skills, roles,
}: {
  state: ResumeState;
  onPick: () => void;
  onDrop: (f: File) => void;
  onRetry: () => void;
  onManual: () => void;
  onEnter: () => void;
  onRefine: () => void;
  saving: boolean;
  skills: string[];
  roles: string[];
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div className="px-6 pb-6 pt-5">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide">Welcome to JobPilot</span>
      </div>
      <h2 className="mt-1.5 text-xl font-bold tracking-tight">Upload your resume — we’ll do the rest</h2>
      <p className="mt-1 text-sm text-muted-foreground">One upload personalizes your entire workspace. No forms required.</p>

      <div className="mt-4 min-h-[260px]">
        {state === 'idle' && (
          <div>
            <button
              type="button"
              onClick={onPick}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onDrop(f); }}
              className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="h-7 w-7" />
              </span>
              <span className="font-semibold">Drop your resume or tap to browse</span>
              <span className="text-xs text-muted-foreground">PDF or Word · we never share it</span>
            </button>
            <button type="button" onClick={onManual} className="mt-4 block w-full text-center text-sm text-muted-foreground hover:text-foreground">
              I’ll set preferences manually instead
            </button>
          </div>
        )}

        {state === 'parsing' && <MultiAgentProcessing active />}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <FileText className="h-8 w-8 text-destructive" />
            <p className="text-sm">We couldn’t read that file. Try a different PDF/Word resume.</p>
            <Button variant="outline" onClick={onRetry}><RotateCcw className="h-4 w-4" /> Try again</Button>
          </div>
        )}

        {state === 'parsed' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
              <span className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
                <Check className="h-6 w-6" />
              </span>
              <p className="font-semibold">Personalized from your resume</p>
              <p className="text-xs text-muted-foreground">Your whole workspace is now tuned to you.</p>
            </div>
            {(roles.length > 0 || skills.length > 0) && (
              <div className="space-y-2">
                {roles.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Target roles</p>
                    <div className="flex flex-wrap gap-1.5">{roles.map((r) => <span key={r} className="rounded-full bg-muted px-2.5 py-1 text-xs">{r}</span>)}</div>
                  </div>
                )}
                {skills.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Detected skills</p>
                    <div className="flex flex-wrap gap-1.5">{skills.slice(0, 10).map((s) => <span key={s} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{s}</span>)}</div>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={onEnter} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enter JobPilot
              </Button>
              <Button variant="outline" className="flex-1" onClick={onRefine} disabled={saving}>Refine details</Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
