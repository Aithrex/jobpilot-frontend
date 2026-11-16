/**
 * The editors behind the Jobs search bar: one small, self-explaining form per
 * question a seeker answers ("which roles", "where", "need a visa", "how close
 * a match"). The desktop bar opens each in its own popover; the phone sheet
 * stacks all of them. One implementation, so the two can never disagree.
 *
 * Every editor leads with the question in plain words and says what choosing
 * an option does, because a label like "Friendly" or "60+" means nothing to
 * someone who has not read the scoring rules.
 */
import type { ReactNode } from 'react';
import { AlertCircle, Check, Loader2, Search, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChipsInput } from '@/components/job-search/ChipsInput';
import { useCombinedJobsCtx, type SponsorFilter } from '@/components/job-search/CombinedJobsProvider';
import { FIT_BANDS } from '@/components/job-search/fitBands';
import { JOB_TITLES_CAP } from '@/hooks/useJobTitles';
import { RECENCY_OPTIONS } from '@/lib/careerJobs';
import { timeZoneName, useViewerTimeZone } from '@/lib/viewerTimezone';
import { cn } from '@/lib/utils';

const ANY_STATE = '__any__';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
] as const;

/* ── Shared pieces ───────────────────────────────────────────────────────── */

/** The question an editor answers, and one line on what the answer changes. */
export function EditorHeading({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold leading-snug text-foreground">{title}</p>
      {hint && <p className="text-caption leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * One choice in a pick-one list: a full-width row that says what it does.
 * Selected is a tinted row with a check, never colour alone.
 */
export function ChoiceRow({
  selected,
  onSelect,
  title,
  hint,
  trailing,
  swatch,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  hint?: string;
  /** Right-aligned detail, usually a count. */
  trailing?: ReactNode;
  /** Small colour dot that ties the row to what the cards show. */
  swatch?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'press flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-primary/50 bg-primary/5'
          : 'border-transparent hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background',
        )}
        aria-hidden
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-medium leading-tight text-foreground">
          {swatch && <span className={cn('h-2 w-2 shrink-0 rounded-full', swatch)} aria-hidden />}
          {title}
        </span>
        {hint && <span className="mt-0.5 block text-caption-sm leading-snug text-muted-foreground">{hint}</span>}
      </span>
      {trailing != null && (
        <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{trailing}</span>
      )}
    </button>
  );
}

/** A labelled on/off row. The whole row is the target. */
export function SwitchRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight text-foreground">{label}</span>
        {hint && <span className="mt-0.5 block text-caption-sm leading-snug text-muted-foreground">{hint}</span>}
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

/** "Search" for the two editors that change WHAT is searched, not just what
 *  is shown. Disabled with the reason beside it when there is nothing to
 *  search with. */
export function SearchAction({ onDone, className }: { onDone?: () => void; className?: string }) {
  const { sync, loading, canSearch } = useCombinedJobsCtx();
  return (
    <Button
      size="sm"
      onClick={() => {
        sync(true);
        onDone?.();
      }}
      disabled={loading || !canSearch}
      className={cn('h-10 min-w-[6.5rem] gap-1.5', className)}
      title="Search employer sites again with these settings"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Search className="h-4 w-4" aria-hidden />
      )}
      {loading ? 'Searching' : 'Search'}
    </Button>
  );
}

/* ── Roles ───────────────────────────────────────────────────────────────── */

export function RolesEditor({ id = 'roles' }: { id?: string }) {
  const {
    titles,
    setTitles,
    resumeTitles,
    smartSuggestTitles,
    suggestingTitles,
    canSearch,
    lastScanTitles,
    titlesPending,
  } = useCombinedJobsCtx();

  return (
    <div className="space-y-3" data-editor={id}>
      <EditorHeading
        title="Which job titles should we look for?"
        hint="Add the titles you would apply to. We search employer career sites for each one."
      />
      <ChipsInput
        values={titles}
        onChange={setTitles}
        maxItems={JOB_TITLES_CAP}
        placeholder="Type a job title and press Enter"
        resetLabel="Use resume titles"
        defaultValues={resumeTitles.length ? resumeTitles.slice(0, JOB_TITLES_CAP) : undefined}
        accentClass="border-border bg-muted/60 text-foreground"
        emptyState="Add a title"
        helperText="These titles shape your For you matches across employer sites."
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void smartSuggestTitles()}
        disabled={suggestingTitles}
        className="hit-target h-9 gap-1.5 text-xs font-medium"
      >
        {suggestingTitles ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
        )}
        {suggestingTitles ? 'Suggesting...' : 'Suggest from resume'}
      </Button>
      {titlesPending && lastScanTitles && (
        <p className="text-caption-sm font-medium text-warning">
          Titles changed. Press Search to apply them.
        </p>
      )}
      {!canSearch && (
        <p className="flex items-center gap-1.5 text-caption-sm font-medium text-warning">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Add a title
        </p>
      )}
    </div>
  );
}

/* ── Where ───────────────────────────────────────────────────────────────── */

export function WhereEditor({ idPrefix = 'where' }: { idPrefix?: string }) {
  const {
    usOnly,
    setUsOnly,
    usState,
    setUsState,
    city,
    setCity,
    location,
    setLocation,
    remoteOnly,
    setRemoteOnly,
  } = useCombinedJobsCtx();

  return (
    <div className="space-y-3">
      <EditorHeading
        title="Where do you want to work?"
        hint="Narrow to a state or city, or leave it open to see more."
      />
      <div className="space-y-2">
        <SwitchRow
          id={`${idPrefix}-us-only`}
          label="United States only"
          hint="Turn off to search other countries."
          checked={usOnly}
          onCheckedChange={setUsOnly}
        />
        <SwitchRow
          id={`${idPrefix}-remote-only`}
          label="Remote jobs only"
          hint="Hide jobs that need you on site."
          checked={remoteOnly}
          onCheckedChange={setRemoteOnly}
        />
      </div>
      {usOnly ? (
        <div className="grid grid-cols-2 gap-2">
          <Select value={usState || ANY_STATE} onValueChange={(v) => setUsState(v === ANY_STATE ? '' : v)}>
            <SelectTrigger id={`${idPrefix}-state`} className="h-10" aria-label="State">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ANY_STATE}>All states</SelectItem>
              {US_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id={`${idPrefix}-city`}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            aria-label="City"
            className="h-10"
          />
        </div>
      ) : (
        <Input
          id={`${idPrefix}-location`}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, country, or Remote"
          aria-label="Location"
          className="h-10"
        />
      )}
    </div>
  );
}

/* ── Posted ──────────────────────────────────────────────────────────────── */

/** The date windows as a list with a bar per row, so the spread of postings
 *  is visible before choosing one. Used in the phone sheet; the desktop page
 *  keeps the same windows one click away as pills. */
export function PostedEditor() {
  const { recency, setRecency, recencyCounts, seenThrough, newCount, newOnly, setNewOnly } =
    useCombinedJobsCtx();
  const zone = timeZoneName(useViewerTimeZone());
  const peak = Math.max(1, ...RECENCY_OPTIONS.map((o) => recencyCounts[o.key] ?? 0));
  const showNew = !!seenThrough && (newCount > 0 || newOnly);

  return (
    <div className="space-y-3">
      <EditorHeading title="When was it posted?" hint={`Days are counted in ${zone}.`} />
      <div role="radiogroup" aria-label="Posted" className="space-y-1">
        {RECENCY_OPTIONS.map((opt) => {
          const count = recencyCounts[opt.key] ?? 0;
          return (
            <ChoiceRow
              key={opt.key}
              selected={recency === opt.key}
              onSelect={() => setRecency(opt.key)}
              title={opt.label}
              trailing={
                <span className="flex items-center gap-2">
                  <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block" aria-hidden>
                    <span
                      className="block h-full rounded-full bg-primary/60"
                      style={{ width: `${Math.round((count / peak) * 100)}%` }}
                    />
                  </span>
                  <span className="w-7 text-right">{count}</span>
                </span>
              }
            />
          );
        })}
      </div>
      {showNew && (
        <SwitchRow
          id="posted-new-only"
          label={`Only new since my last visit (${newCount})`}
          checked={newOnly}
          onCheckedChange={setNewOnly}
        />
      )}
    </div>
  );
}

/* ── Visa ────────────────────────────────────────────────────────────────── */

/** `short` is what the bar shows, and it is cut from the option's own title,
 *  so the bar and the list never use two wordings for one choice. */
export const VISA_CHOICES: Array<{ value: SponsorFilter; short: string; title: string; hint: string }> = [
  {
    value: 'friendly',
    short: 'Hide refusals',
    title: 'Hide refusals: jobs that say they will not sponsor',
    hint: 'Best for most people who need a visa. Everything else stays, including jobs that say nothing about it.',
  },
  {
    value: 'proven',
    short: 'Past sponsors only',
    title: 'Past sponsors only',
    hint: 'Only employers with recent H-1B approvals on public record. Fewer jobs, better odds.',
  },
  {
    value: 'all',
    short: 'Every job',
    title: 'Every job, sponsoring or not',
    hint: 'Choose this if you do not need a visa.',
  },
];

export function visaLabel(value: SponsorFilter): string {
  return VISA_CHOICES.find((c) => c.value === value)?.short ?? 'Every job';
}

export function VisaEditor() {
  const { sponsorFilter, setSponsorFilter, jobs } = useCombinedJobsCtx();
  // Plain facts about the whole board, so each choice says what it removes.
  const refused = jobs.filter((j) => j.sponsorship === 'refused').length;
  const proven = jobs.filter((j) => j.sponsorship === 'likely').length;
  const trailing: Record<SponsorFilter, ReactNode> = {
    friendly: refused > 0 ? `hides ${refused}` : null,
    proven: proven > 0 ? `${proven} jobs` : null,
    all: null,
  };

  return (
    <div className="space-y-3">
      <EditorHeading
        title="Do you need visa sponsorship?"
        hint="We read each posting and the public H-1B record of each employer."
      />
      <div role="radiogroup" aria-label="Visa sponsorship" className="space-y-1">
        {VISA_CHOICES.map((choice) => (
          <ChoiceRow
            key={choice.value}
            selected={sponsorFilter === choice.value}
            onSelect={() => setSponsorFilter(choice.value)}
            title={choice.title}
            hint={choice.hint}
            trailing={trailing[choice.value]}
          />
        ))}
      </div>
      <p className="text-caption-sm leading-snug text-muted-foreground">
        Past sponsorship is a track record, not a promise about any one application.
      </p>
    </div>
  );
}

/* ── Match ───────────────────────────────────────────────────────────────── */

const bandMin = (key: string) => FIT_BANDS.find((b) => b.key === key)?.min ?? 0;

/** The cut-offs are the scoring engine's own bands, so the words here are the
 *  same words printed on each card. */
export const MATCH_CHOICES: Array<{ value: number; short: string; title: string; hint: string; swatch: string }> = [
  { value: 0, short: 'Any match', title: 'Any match', hint: 'Everything that fits your search.', swatch: 'bg-muted-foreground/40' },
  {
    value: bandMin('possible'),
    short: 'Possible or better',
    title: 'Possible match or better',
    hint: 'Reachable roles, including ones a tailored resume has to make the case for.',
    swatch: 'bg-warning',
  },
  {
    value: bandMin('good'),
    short: 'Good or better',
    title: 'Good match or better',
    hint: 'Your experience lines up with many of the stated requirements.',
    swatch: 'bg-signal/60',
  },
  {
    value: bandMin('strong'),
    short: 'Strong only',
    title: 'Strong match only',
    hint: 'Your resume already covers most of what the posting asks for.',
    swatch: 'bg-signal',
  },
];

export function matchLabel(minScore: number): string {
  // A score saved under the old 40 / 60 steps reads as the nearest band below.
  const choice = [...MATCH_CHOICES].reverse().find((c) => minScore >= c.value);
  return choice?.short ?? 'Any match';
}

export function MatchEditor() {
  const { minScore, setMinScore, showWeaker, setShowWeaker, weakerMatchCount } = useCombinedJobsCtx();
  const current = [...MATCH_CHOICES].reverse().find((c) => minScore >= c.value)?.value ?? 0;

  return (
    <div className="space-y-3">
      <EditorHeading
        title="How close a match?"
        hint="Each job is scored against your resume. The same words appear on every card."
      />
      <div role="radiogroup" aria-label="Minimum match" className="space-y-1">
        {MATCH_CHOICES.map((choice) => (
          <ChoiceRow
            key={choice.value}
            selected={current === choice.value}
            onSelect={() => setMinScore(choice.value)}
            title={choice.title}
            hint={choice.hint}
            swatch={choice.swatch}
          />
        ))}
      </div>
      {(weakerMatchCount > 0 || showWeaker) && current === 0 && (
        <SwitchRow
          id="match-show-weaker"
          label={`Also show weaker matches (${weakerMatchCount})`}
          hint="Hidden by default so your best matches come first."
          checked={showWeaker}
          onCheckedChange={setShowWeaker}
        />
      )}
    </div>
  );
}
