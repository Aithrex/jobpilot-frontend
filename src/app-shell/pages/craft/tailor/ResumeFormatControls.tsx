/**
 * Resume format choices: length, spacing, accent, section order.
 *
 * Used twice on the Tailor page: before tailoring (sent with the request, so
 * a two-page choice keeps two pages of the user's own content) and above the
 * preview after tailoring (re-fits the same content with no AI call).
 * Single-choice groups are Radix toggle groups: arrow keys move, Space picks.
 */
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ACCENT_SWATCH,
  type Accent,
  type Density,
  type PageLength,
  type ResumeFormatPreferences,
  type SectionOrder,
} from '@/lib/resumeFormat';

interface ResumeFormatControlsProps {
  value: ResumeFormatPreferences;
  onChange: (next: ResumeFormatPreferences) => void;
  disabled?: boolean;
  /** A re-fit is running: controls stay visible but inert. */
  busy?: boolean;
  /** Shown after tailoring: what the change does to this resume. */
  note?: string;
  className?: string;
}

const itemCls =
  'h-8 flex-1 rounded-control px-3 text-xs font-medium text-muted-foreground ' +
  'data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-soft ' +
  'data-[state=on]:ring-1 data-[state=on]:ring-border focus-visible:ring-2 focus-visible:ring-ring';

const groupCls = 'flex w-full gap-1 rounded-control bg-muted/70 p-1';

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-start sm:gap-3">
      <span className="pt-2 text-xs font-semibold text-foreground">{label}</span>
      <div className="min-w-0 space-y-1">
        {children}
        {hint && <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

const ORDER_HINT: Record<SectionOrder, string> = {
  auto: 'Education leads for students and recent graduates; experience leads for everyone else.',
  education_first: 'Education leads, then experience.',
  experience_first: 'Experience leads, then education.',
};

export function ResumeFormatControls({
  value,
  onChange,
  disabled = false,
  busy = false,
  note,
  className,
}: ResumeFormatControlsProps) {
  const inert = disabled || busy;
  const set = <K extends keyof ResumeFormatPreferences>(key: K, v: string) => {
    if (!v || v === value[key]) return; // Radix sends '' when the active item is re-clicked
    onChange({ ...value, [key]: v as ResumeFormatPreferences[K] });
  };

  return (
    <fieldset
      className={cn('space-y-3', className)}
      disabled={inert}
      aria-busy={busy || undefined}
    >
      <legend className="sr-only">Resume format</legend>

      <Row
        label="Length"
        hint={
          value.page_length === 'two'
            ? 'Two pages keep more of your real experience. Nothing is added to fill the space.'
            : 'One page fits most applications. The least relevant lines are left out to make it fit.'
        }
      >
        <ToggleGroup
          type="single"
          value={value.page_length}
          onValueChange={(v) => set('page_length', v as PageLength)}
          aria-label="Resume length"
          className={groupCls}
        >
          <ToggleGroupItem value="one" className={itemCls}>1 page</ToggleGroupItem>
          <ToggleGroupItem value="two" className={itemCls}>2 pages</ToggleGroupItem>
        </ToggleGroup>
      </Row>

      <Row
        label="Spacing"
        hint={
          value.density === 'comfortable'
            ? 'Larger text and half-inch margins. Fewer lines fit, so the strongest ones stay.'
            : 'The tighter layout. More lines fit on each page.'
        }
      >
        <ToggleGroup
          type="single"
          value={value.density}
          onValueChange={(v) => set('density', v as Density)}
          aria-label="Resume spacing"
          className={groupCls}
        >
          <ToggleGroupItem value="compact" className={itemCls}>Compact</ToggleGroupItem>
          <ToggleGroupItem value="comfortable" className={itemCls}>Comfortable</ToggleGroupItem>
        </ToggleGroup>
      </Row>

      <Row label="Accent">
        <ToggleGroup
          type="single"
          value={value.accent}
          onValueChange={(v) => set('accent', v as Accent)}
          aria-label="Name and heading color"
          className={groupCls}
        >
          {(['black', 'navy'] as Accent[]).map((a) => (
            <ToggleGroupItem key={a} value={a} className={cn(itemCls, 'gap-2')}>
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full ring-1 ring-border"
                style={{ background: ACCENT_SWATCH[a] }}
              />
              {a === 'black' ? 'Black' : 'Navy'}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Row>

      <Row label="Section order" hint={ORDER_HINT[value.section_order]}>
        <ToggleGroup
          type="single"
          value={value.section_order}
          onValueChange={(v) => set('section_order', v as SectionOrder)}
          aria-label="Section order"
          className={groupCls}
        >
          <ToggleGroupItem value="auto" className={itemCls}>Automatic</ToggleGroupItem>
          <ToggleGroupItem value="education_first" className={itemCls}>Education first</ToggleGroupItem>
          <ToggleGroupItem value="experience_first" className={itemCls}>Experience first</ToggleGroupItem>
        </ToggleGroup>
      </Row>

      {(busy || note) && (
        <p className="flex items-center gap-2 text-[11px] text-muted-foreground" role="status">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {busy ? 'Fitting your resume to this format...' : note}
        </p>
      )}
    </fieldset>
  );
}
