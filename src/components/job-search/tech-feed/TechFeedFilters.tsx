/**
 * The tech feed filter rail.
 *
 * Split deliberately in two:
 *  - PRIMARY controls are always visible, because they are the ones that
 *    decide whether the feed is useful at all: what the role IS, where it is,
 *    how senior, what it pays, and whether you can legally take it.
 *  - ADVANCED controls live behind one disclosure. They are the "I know what I
 *    am doing" levers - employer scope, provenance, exclusions, and the
 *    switches that decide whether postings with MISSING data are shown.
 *
 * The unknown-data switches default to INCLUDING unknowns. Hiding a posting
 * because the crawler could not read its salary is a silent, invisible filter;
 * the user has to opt into that.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ChipsInput } from '@/components/job-search/ChipsInput';
import { useWorkAuthorization } from '@/hooks/useWorkAuthorization';
import { needsSponsorship } from '@/types/workAuthorization';
import { CompanyAutocomplete } from './CompanyAutocomplete';
import { CompanyCategoryPicker } from './CompanyCategoryPicker';
import { cn } from '@/lib/utils';
import {
  clampDays,
  loadTechFeedUiState,
  saveTechFeedUiState,
  SENIORITIES,
  TECH_SCOPES,
  WORK_MODES,
} from '@/lib/techFeedUrlState';
import type {
  AccessBarrierHandling,
  TechFeedFamily,
  TechFeedFilters as TechFeedFilterState,
  TechFeedSeniority,
  TechFeedWorkMode,
  TechScope,
} from '@/types/techFeed';

interface TechFeedFiltersProps {
  filters: TechFeedFilterState;
  onPatch: (patch: Partial<TechFeedFilterState>) => void;
  onReset: () => void;
  families: TechFeedFamily[];
  taxonomyLoading?: boolean;
  queryDraft: string;
  onQueryDraftChange: (value: string) => void;
  /** The panel renders its own search box on small screens - avoid two. */
  hideSearch?: boolean;
  className?: string;
}

const SCOPE_LABEL: Record<TechScope, string> = {
  core: 'Core technical',
  adjacent: 'Adjacent technical',
  non_tech: 'Non technical',
  unknown: 'Unclassified',
};

const WORK_MODE_LABEL: Record<TechFeedWorkMode, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On site',
  unknown: 'Not stated',
};

const SENIORITY_LABEL: Record<TechFeedSeniority, string> = {
  intern: 'Intern',
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  staff: 'Staff',
  principal: 'Principal',
  director: 'Director',
  executive: 'Executive',
  unknown: 'Not stated',
};

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
];

const RECENCY_PRESETS = [7, 14, 30, 60, 90, 180];

const UI_STATE_DEFAULT = { advancedOpen: false };

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

// ── Small building blocks ────────────────────────────────────────

function FilterGroup({
  title,
  children,
  description,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ToggleChips<T extends string>({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-medium text-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.value)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:bg-muted',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ChoiceGroup({
  legend,
  options,
  value,
  onChange,
  name,
}: {
  legend: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  name: string;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-medium text-foreground">{legend}</legend>
      <RadioGroup value={value} onValueChange={onChange} className="gap-1.5">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem id={id} value={option.value} />
              <Label htmlFor={id} className="text-xs font-normal">
                {option.label}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-xs font-normal">
          {label}
        </Label>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/**
 * Show / demote / hide, for a stated access barrier.
 *
 * Three states rather than a switch, because the honest middle option is the
 * default and a two-state control cannot express it. The current state is
 * always visible as a selected radio, and moving off it is one click - a
 * filter that quietly deletes results has to be one the user can SEE is on.
 */
function BarrierHandlingGroup({
  name,
  legend,
  value,
  onChange,
  showLabel,
  demoteLabel,
  hideLabel,
}: {
  name: string;
  legend: string;
  value: AccessBarrierHandling;
  onChange: (value: AccessBarrierHandling) => void;
  showLabel: string;
  demoteLabel: string;
  hideLabel: string;
}) {
  return (
    <ChoiceGroup
      name={name}
      legend={legend}
      value={value}
      onChange={(next) => onChange(next as AccessBarrierHandling)}
      options={[
        { value: 'show', label: showLabel },
        { value: 'demote', label: demoteLabel },
        { value: 'hide', label: hideLabel },
      ]}
    />
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  min,
  step,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-normal">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        step={step}
        placeholder={placeholder}
        value={value === null ? '' : String(value)}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
        className="h-8 text-xs"
      />
    </div>
  );
}

// ── Role family / specialty tree ─────────────────────────────────

interface TreeNode {
  id: string;
  key: string;
  label: string;
  level: 1 | 2;
  familyKey: string;
  hasChildren: boolean;
}

/**
 * A real ARIA tree, not a pile of checkboxes: multi-selectable, roving
 * tabindex, ArrowUp/Down to walk, ArrowRight/Left to open and close, Space or
 * Enter to select. Two levels only - family, then specialty.
 */
function RoleFamilyTree({
  families,
  selectedFamilies,
  selectedSpecialties,
  onToggleFamily,
  onToggleSpecialty,
}: {
  families: TechFeedFamily[];
  selectedFamilies: string[];
  selectedSpecialties: string[];
  onToggleFamily: (key: string) => void;
  onToggleSpecialty: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  // Auto-open any family that already has a selected specialty, so a shared
  // URL does not land on a tree that hides the user's own choices.
  const selectedSpecialtyKey = selectedSpecialties.join('|');
  useEffect(() => {
    if (!selectedSpecialtyKey || !families.length) return;
    const chosen = selectedSpecialtyKey.split('|');
    const owning = families
      .filter((family) => family.specialties.some((s) => chosen.includes(s.key)))
      .map((family) => family.key);
    if (!owning.length) return;
    setExpanded((prev) => {
      const merged = Array.from(new Set([...prev, ...owning]));
      // Bail out when nothing actually opens - a fresh array every render
      // would re-render the tree forever.
      return merged.length === prev.length ? prev : merged;
    });
  }, [families, selectedSpecialtyKey]);

  const visible = useMemo<TreeNode[]>(() => {
    const nodes: TreeNode[] = [];
    for (const family of families) {
      nodes.push({
        id: `family:${family.key}`,
        key: family.key,
        label: family.label,
        level: 1,
        familyKey: family.key,
        hasChildren: family.specialties.length > 0,
      });
      if (expanded.includes(family.key)) {
        for (const specialty of family.specialties) {
          nodes.push({
            id: `specialty:${specialty.key}`,
            key: specialty.key,
            label: specialty.label,
            level: 2,
            familyKey: family.key,
            hasChildren: false,
          });
        }
      }
    }
    return nodes;
  }, [families, expanded]);

  const focusNode = useCallback((id: string) => {
    setActiveId(id);
    itemRefs.current.get(id)?.focus();
  }, []);

  const isSelected = (node: TreeNode) =>
    node.level === 1 ? selectedFamilies.includes(node.key) : selectedSpecialties.includes(node.key);

  const select = (node: TreeNode) => {
    if (node.level === 1) onToggleFamily(node.key);
    else onToggleSpecialty(node.key);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>, node: TreeNode) => {
    const index = visible.findIndex((item) => item.id === node.id);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (index < visible.length - 1) focusNode(visible[index + 1].id);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (index > 0) focusNode(visible[index - 1].id);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (node.level === 1 && node.hasChildren) {
          if (!expanded.includes(node.key)) setExpanded((prev) => [...prev, node.key]);
          else if (index < visible.length - 1) focusNode(visible[index + 1].id);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (node.level === 2) focusNode(`family:${node.familyKey}`);
        else setExpanded((prev) => prev.filter((key) => key !== node.key));
        break;
      case 'Home':
        event.preventDefault();
        if (visible.length) focusNode(visible[0].id);
        break;
      case 'End':
        event.preventDefault();
        if (visible.length) focusNode(visible[visible.length - 1].id);
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        select(node);
        break;
      default:
        break;
    }
  };

  if (!families.length) return null;

  const activeOrFirst = activeId && visible.some((n) => n.id === activeId) ? activeId : visible[0]?.id;

  return (
    <ul
      role="tree"
      aria-label="Role families and specialties"
      aria-multiselectable="true"
      className="max-h-72 space-y-0.5 overflow-y-auto rounded-md border border-border p-1"
      data-testid="tech-feed-role-tree"
    >
      {visible.map((node) => {
        const selected = isSelected(node);
        const isExpanded = node.level === 1 ? expanded.includes(node.key) : undefined;
        return (
          <li
            key={node.id}
            role="treeitem"
            aria-level={node.level}
            aria-selected={selected}
            aria-expanded={node.hasChildren ? isExpanded : undefined}
            tabIndex={node.id === activeOrFirst ? 0 : -1}
            ref={(element) => {
              if (element) itemRefs.current.set(node.id, element);
              else itemRefs.current.delete(node.id);
            }}
            onFocus={() => setActiveId(node.id)}
            onKeyDown={(event) => handleKeyDown(event, node)}
            onClick={(event) => {
              event.stopPropagation();
              select(node);
            }}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              node.level === 2 && 'ml-4',
              selected ? 'bg-primary/10 font-medium text-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {node.hasChildren ? (
              <span
                role="presentation"
                onClick={(event) => {
                  event.stopPropagation();
                  setExpanded((prev) =>
                    prev.includes(node.key)
                      ? prev.filter((key) => key !== node.key)
                      : [...prev, node.key],
                  );
                }}
                className="inline-flex h-4 w-4 items-center justify-center"
              >
                <ChevronRight
                  className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')}
                  aria-hidden
                />
              </span>
            ) : (
              <span className="inline-block h-4 w-4" aria-hidden />
            )}
            <span className="truncate">{node.label}</span>
            {selected && <span className="sr-only">(selected)</span>}
          </li>
        );
      })}
    </ul>
  );
}

// ── The rail ─────────────────────────────────────────────────────

export function TechFeedFilters({
  filters,
  onPatch,
  onReset,
  families,
  taxonomyLoading = false,
  queryDraft,
  onQueryDraftChange,
  hideSearch = false,
  className,
}: TechFeedFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(
    () => loadTechFeedUiState(UI_STATE_DEFAULT).advancedOpen ?? false,
  );

  useEffect(() => {
    saveTechFeedUiState({ advancedOpen });
  }, [advancedOpen]);

  // The saved work-authorization answer, read only to OFFER it. It never
  // patches the filters on its own: a search that silently narrows itself
  // from a profile setting is a search the user cannot debug.
  const { status: workAuthStatus } = useWorkAuthorization();
  const sponsorshipNudge =
    needsSponsorship(workAuthStatus) && filters.sponsorshipPreference === null;

  // The Workday CATALOG fan-out that used to back the company suggestions is
  // gone. It fetched an entire industry catalog to render twelve chips whose
  // values were ATS tenant slugs - the same slugs a user could not type and
  // could not read back. `CompanyAutocomplete` asks the canonical employer
  // registry instead, one bounded query per keystroke burst, and returns the
  // id the rest of the system agrees on.

  return (
    <div className={cn('space-y-5', className)} data-testid="tech-feed-filters">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filters
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-7 px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring"
        >
          Reset
        </Button>
      </div>

      {/* ── Primary ────────────────────────────────────────────── */}

      {!hideSearch && (
        <div className="space-y-1">
          <Label htmlFor="tech-feed-keywords" className="text-xs font-medium">
            Keywords
          </Label>
          <Input
            id="tech-feed-keywords"
            type="search"
            value={queryDraft}
            onChange={(event) => onQueryDraftChange(event.target.value)}
            placeholder="Describe the job, or paste keywords"
            className="h-9 text-sm"
          />
        </div>
      )}

      <FilterGroup title="Job titles">
        <ChipsInput
          values={filters.titles}
          onChange={(titles) => onPatch({ titles })}
          placeholder="Add a title and press Enter"
          emptyState="No titles yet - the search covers every title."
          accentClass="border-primary/30 bg-primary/10 text-foreground"
        />
      </FilterGroup>

      <FilterGroup
        title="Role"
        description="Pick a family, or open it and pick specialties inside it."
      >
        {taxonomyLoading ? (
          <p className="text-xs text-muted-foreground">Loading the role tree...</p>
        ) : families.length ? (
          <RoleFamilyTree
            families={families}
            selectedFamilies={filters.roleFamilies}
            selectedSpecialties={filters.roleSpecialties}
            onToggleFamily={(key) => onPatch({ roleFamilies: toggle(filters.roleFamilies, key) })}
            onToggleSpecialty={(key) =>
              onPatch({ roleSpecialties: toggle(filters.roleSpecialties, key) })
            }
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            The role tree is unavailable right now. Keywords and titles still work.
          </p>
        )}
        <ToggleChips
          legend="Technical scope"
          options={TECH_SCOPES.map((scope) => ({ value: scope, label: SCOPE_LABEL[scope] }))}
          selected={filters.techScope}
          onToggle={(scope) => onPatch({ techScope: toggle(filters.techScope, scope) })}
        />
      </FilterGroup>

      <FilterGroup title="Skills">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Must have</Label>
            <ChipsInput
              values={filters.skillsRequired}
              onChange={(skillsRequired) => onPatch({ skillsRequired })}
              placeholder="Add a required skill"
              emptyState="No required skills."
              accentClass="border-primary/30 bg-primary/10 text-foreground"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Nice to have</Label>
            <ChipsInput
              values={filters.skillsPreferred}
              onChange={(skillsPreferred) => onPatch({ skillsPreferred })}
              placeholder="Add a preferred skill"
              emptyState="No preferred skills."
              accentClass="border-border bg-muted text-foreground"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Exclude skills</Label>
            <ChipsInput
              values={filters.excludeSkills}
              onChange={(excludeSkills) => onPatch({ excludeSkills })}
              placeholder="Add a skill to exclude"
              emptyState="Nothing excluded."
              accentClass="border-destructive/30 bg-destructive/10 text-foreground"
            />
          </div>
        </div>
      </FilterGroup>

      <FilterGroup title="Location and work arrangement">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Countries</Label>
            <ChipsInput
              values={filters.countries}
              onChange={(countries) => onPatch({ countries })}
              placeholder="Add a country"
              emptyState="Anywhere."
              accentClass="border-border bg-muted text-foreground"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">States or regions</Label>
            <ChipsInput
              values={filters.regions}
              onChange={(regions) => onPatch({ regions })}
              placeholder="Add a state or region"
              emptyState="Any region."
              accentClass="border-border bg-muted text-foreground"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Cities</Label>
            <ChipsInput
              values={filters.cities}
              onChange={(cities) => onPatch({ cities })}
              placeholder="Add a city"
              emptyState="Any city."
              accentClass="border-border bg-muted text-foreground"
            />
          </div>
          <NumberField
            id="tech-feed-radius"
            label="Radius (km)"
            value={filters.radiusKm}
            onChange={(radiusKm) => onPatch({ radiusKm })}
            placeholder="Any distance"
            min={0}
          />
          <ToggleChips
            legend="Work arrangement"
            options={WORK_MODES.map((mode) => ({ value: mode, label: WORK_MODE_LABEL[mode] }))}
            selected={filters.workModes}
            onToggle={(mode) => onPatch({ workModes: toggle(filters.workModes, mode) })}
          />
          <div className="space-y-1">
            <Label className="text-xs font-medium">Remote roles I can take from</Label>
            <ChipsInput
              values={filters.remoteEligibleLocations}
              onChange={(remoteEligibleLocations) => onPatch({ remoteEligibleLocations })}
              placeholder="Add a country you can work from"
              emptyState="Any remote eligibility."
              accentClass="border-border bg-muted text-foreground"
            />
          </div>
          <NumberField
            id="tech-feed-tz-overlap"
            label="Minimum timezone overlap (hours)"
            value={filters.timezoneOverlapHours}
            onChange={(timezoneOverlapHours) => onPatch({ timezoneOverlapHours })}
            placeholder="Any overlap"
            min={0}
          />
        </div>
      </FilterGroup>

      <FilterGroup title="Seniority and experience">
        <div className="space-y-3">
          <ToggleChips
            legend="Seniority"
            options={SENIORITIES.map((level) => ({
              value: level,
              label: SENIORITY_LABEL[level],
            }))}
            selected={filters.seniority}
            onToggle={(level) => onPatch({ seniority: toggle(filters.seniority, level) })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              id="tech-feed-min-years"
              label="Min years"
              value={filters.minYears}
              onChange={(minYears) => onPatch({ minYears })}
              placeholder="Any"
              min={0}
            />
            <NumberField
              id="tech-feed-max-years"
              label="Max years"
              value={filters.maxYears}
              onChange={(maxYears) => onPatch({ maxYears })}
              placeholder="Any"
              min={0}
            />
          </div>
        </div>
      </FilterGroup>

      <FilterGroup title="Employment type">
        <ToggleChips
          legend="Employment type"
          options={EMPLOYMENT_TYPES}
          selected={filters.employmentTypes}
          onToggle={(type) => onPatch({ employmentTypes: toggle(filters.employmentTypes, type) })}
        />
      </FilterGroup>

      <FilterGroup title="Salary">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              id="tech-feed-min-salary"
              label="Minimum"
              value={filters.minSalary}
              onChange={(minSalary) => onPatch({ minSalary })}
              placeholder="No floor"
              min={0}
              step={1000}
            />
            <div className="space-y-1">
              <Label htmlFor="tech-feed-currency" className="text-xs font-normal">
                Currency
              </Label>
              <Input
                id="tech-feed-currency"
                value={filters.salaryCurrency ?? ''}
                onChange={(event) =>
                  onPatch({ salaryCurrency: event.target.value.trim() || null })
                }
                placeholder="USD"
                className="h-8 text-xs uppercase"
              />
            </div>
          </div>
          <ChoiceGroup
            name="tech-feed-pay-interval"
            legend="Pay interval"
            value={filters.payInterval ?? 'any'}
            onChange={(value) => onPatch({ payInterval: value === 'any' ? null : value })}
            options={[
              { value: 'any', label: 'Any interval' },
              { value: 'year', label: 'Per year' },
              { value: 'month', label: 'Per month' },
              { value: 'hour', label: 'Per hour' },
            ]}
          />
          <SwitchRow
            id="tech-feed-unknown-salary"
            label="Include jobs without published salary"
            description="Most postings never publish pay. Turning this off hides them."
            checked={filters.includeUnknownSalary}
            onCheckedChange={(includeUnknownSalary) => onPatch({ includeUnknownSalary })}
          />
        </div>
      </FilterGroup>

      <FilterGroup
        title="Sponsorship and clearance"
        description="These act on what a posting STATES. A posting that says nothing is never moved or hidden."
      >
        <div className="space-y-3">
          <ChoiceGroup
            name="tech-feed-sponsorship"
            legend="Visa sponsorship"
            value={filters.sponsorshipPreference ?? 'any'}
            onChange={(value) =>
              onPatch({ sponsorshipPreference: value === 'any' ? null : value })
            }
            options={[
              { value: 'any', label: 'No preference' },
              { value: 'needs_sponsorship', label: 'I need visa sponsorship' },
              { value: 'no_sponsorship_needed', label: 'I do not need sponsorship' },
            ]}
          />

          {/* The saved answer is OFFERED, never applied behind the user's
              back. A filter that appears without being chosen is a filter
              nobody can find to turn off. */}
          {sponsorshipNudge && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
              <p className="text-[11px] leading-snug text-foreground">
                Your profile says you will need visa sponsorship. Want this search to
                use that?
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-1.5 h-7 text-xs focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onPatch({ sponsorshipPreference: 'needs_sponsorship' })}
              >
                Apply my saved answer
              </Button>
            </div>
          )}

          <BarrierHandlingGroup
            name="tech-feed-clearance-roles"
            legend="Roles needing a security clearance"
            value={filters.clearanceRoles}
            onChange={(clearanceRoles) => onPatch({ clearanceRoles })}
            showLabel="Show them in normal order"
            demoteLabel="Show them, but lower down"
            hideLabel="Hide them"
          />

          <BarrierHandlingGroup
            name="tech-feed-nosponsor-roles"
            legend="Postings that state no sponsorship"
            value={filters.noSponsorshipRoles}
            onChange={(noSponsorshipRoles) => onPatch({ noSponsorshipRoles })}
            showLabel="Show them in normal order"
            demoteLabel="Show them, but lower down"
            hideLabel="Hide them"
          />

          {(filters.clearanceRoles === 'hide' || filters.noSponsorshipRoles === 'hide') && (
            <p className="text-[11px] leading-snug text-muted-foreground">
              Hiding removes reachable jobs from your results. The count of what it
              removed is shown above the list, and one click puts them back.
            </p>
          )}
        </div>
      </FilterGroup>

      <Separator />

      {/* ── Advanced ───────────────────────────────────────────── */}

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between focus-visible:ring-2 focus-visible:ring-ring"
          >
            Advanced filters
            <ChevronRight
              className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-90')}
              aria-hidden
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-5">
          <FilterGroup title="Employer">
            <div className="space-y-3">
              <ChoiceGroup
                name="tech-feed-employer-scope"
                legend="Employer scope"
                value={filters.employerScope}
                onChange={(value) =>
                  onPatch({ employerScope: value as TechFeedFilterState['employerScope'] })
                }
                options={[
                  { value: 'any', label: 'Any employer' },
                  { value: 'tech_only', label: 'Technology companies only' },
                ]}
              />
              {/* The toggle is a POSITIVE filter: it keeps the employers we
                  hold technology evidence for, which necessarily hides the
                  ones we hold none about. Saying so is the difference between
                  a narrowing the user chose and one that just happened. */}
              {filters.employerScope === 'tech_only' && (
                <p className="text-[11px] text-muted-foreground">
                  Shows MNCs, public technology companies, growth companies and
                  niche startups we hold documentary evidence for. Employers we
                  have not yet classified are hidden - the result count says how
                  many.
                </p>
              )}
              <ChoiceGroup
                name="tech-feed-employer-kind"
                legend="Who is hiring"
                value={filters.employerKind}
                onChange={(value) =>
                  onPatch({ employerKind: value as TechFeedFilterState['employerKind'] })
                }
                options={[
                  { value: 'any', label: 'Anyone' },
                  { value: 'direct_employer', label: 'Direct employers only' },
                  { value: 'staffing', label: 'Staffing agencies only' },
                  { value: 'marketplace', label: 'Marketplaces only' },
                ]}
              />
              <div className="space-y-1">
                <Label className="text-xs font-medium" id="tech-feed-company-label">
                  Companies
                </Label>
                {/* Names, never ids. See `CompanyAutocomplete` - the filter
                    used to want whichever slug the catalog handed the UI, and
                    a user typing "Stripe" had no way to reach it. */}
                <CompanyAutocomplete
                  values={filters.companyIds}
                  onChange={(companyIds) => onPatch({ companyIds })}
                  technologyOnly={filters.employerScope === 'tech_only'}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Company categories</Label>
                {/* The canonical facet with counts, not free text: a category
                    outside the registry's vocabulary matched nothing, silently,
                    and rendered as an applied filter. */}
                <CompanyCategoryPicker
                  values={filters.companyCategories}
                  onChange={(companyCategories) => onPatch({ companyCategories })}
                />
              </div>
            </div>
          </FilterGroup>

          <FilterGroup title="Eligibility">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Work authorization</Label>
                <ChipsInput
                  values={filters.workAuthorization}
                  onChange={(workAuthorization) => onPatch({ workAuthorization })}
                  placeholder="Add a citizenship or work permit"
                  emptyState="Not specified."
                  accentClass="border-border bg-muted text-foreground"
                />
              </div>
              <ChoiceGroup
                name="tech-feed-clearance"
                legend="Security clearance"
                value={
                  filters.requiresClearance === null
                    ? 'any'
                    : filters.requiresClearance
                      ? 'required'
                      : 'not_required'
                }
                onChange={(value) =>
                  onPatch({
                    requiresClearance:
                      value === 'any' ? null : value === 'required' ? true : false,
                  })
                }
                options={[
                  { value: 'any', label: 'No preference' },
                  { value: 'required', label: 'Clearance roles only' },
                  { value: 'not_required', label: 'No clearance required' },
                ]}
              />
            </div>
          </FilterGroup>

          <FilterGroup title="Recency and apply route">
            <div className="space-y-3">
              <fieldset className="space-y-1.5">
                <legend className="text-xs font-medium text-foreground">Posted within</legend>
                <div className="flex flex-wrap gap-1.5">
                  {RECENCY_PRESETS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      aria-pressed={filters.postedWithinDays === days}
                      onClick={() => onPatch({ postedWithinDays: clampDays(days) })}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        filters.postedWithinDays === days
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:bg-muted',
                      )}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </fieldset>
              <ChoiceGroup
                name="tech-feed-apply-mode"
                legend="Apply route"
                value={filters.applyMode}
                onChange={(value) =>
                  onPatch({ applyMode: value as TechFeedFilterState['applyMode'] })
                }
                options={[
                  { value: 'any', label: 'Any apply route' },
                  { value: 'direct_apply', label: 'Applies on the employer site' },
                ]}
              />
            </div>
          </FilterGroup>

          <FilterGroup title="Exclusions">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Excluded title terms</Label>
                <ChipsInput
                  values={filters.excludeTitleTerms}
                  onChange={(excludeTitleTerms) => onPatch({ excludeTitleTerms })}
                  placeholder="e.g. senior"
                  emptyState="Nothing excluded."
                  accentClass="border-destructive/30 bg-destructive/10 text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Excluded companies</Label>
                <ChipsInput
                  values={filters.excludeCompanies}
                  onChange={(excludeCompanies) => onPatch({ excludeCompanies })}
                  placeholder="Add a company to exclude"
                  emptyState="Nothing excluded."
                  accentClass="border-destructive/30 bg-destructive/10 text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Excluded keywords</Label>
                <ChipsInput
                  values={filters.excludeKeywords}
                  onChange={(excludeKeywords) => onPatch({ excludeKeywords })}
                  placeholder="Add a keyword to exclude"
                  emptyState="Nothing excluded."
                  accentClass="border-destructive/30 bg-destructive/10 text-foreground"
                />
              </div>
            </div>
          </FilterGroup>

          <FilterGroup
            title="Postings with missing data"
            description="These are ON by default. Turning one off hides real jobs whose data we could not read."
          >
            <div className="space-y-3">
              <SwitchRow
                id="tech-feed-include-undated"
                label="Postings with no publish date"
                checked={filters.includeUndated}
                onCheckedChange={(includeUndated) => onPatch({ includeUndated })}
              />
              <SwitchRow
                id="tech-feed-advanced-unknown-salary"
                label="Postings with no published salary"
                checked={filters.includeUnknownSalary}
                onCheckedChange={(includeUnknownSalary) => onPatch({ includeUnknownSalary })}
              />
              <SwitchRow
                id="tech-feed-unknown-scope"
                label="Roles we could not classify"
                checked={filters.techScope.includes('unknown')}
                onCheckedChange={(checked) =>
                  onPatch({
                    techScope: checked
                      ? Array.from(new Set([...filters.techScope, 'unknown' as TechScope]))
                      : filters.techScope.filter((scope) => scope !== 'unknown'),
                  })
                }
              />
              <SwitchRow
                id="tech-feed-unknown-work-mode"
                label="Postings with an unclear work arrangement"
                checked={filters.workModes.includes('unknown')}
                onCheckedChange={(checked) =>
                  onPatch({
                    workModes: checked
                      ? Array.from(new Set([...filters.workModes, 'unknown' as TechFeedWorkMode]))
                      : filters.workModes.filter((mode) => mode !== 'unknown'),
                  })
                }
              />
            </div>
          </FilterGroup>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default TechFeedFilters;
