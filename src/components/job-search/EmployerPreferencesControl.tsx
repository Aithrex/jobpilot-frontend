/**
 * "Employer types" - the user's direct-employer exclusions.
 *
 * One form, two homes: a popover off the jobs refine bar (and off the
 * "Hidden by your employer filters" line), and the Settings page. Both read
 * and write the same server-owned preferences through
 * `useEmployerPreferences`, so a change in one is the state of the other.
 *
 * The preset is a SHORTCUT over the independent toggles, not a separate
 * setting: "Direct employers only" is exactly the six business-model
 * exclusions, and "Hide employers we couldn't verify" stays independent of it.
 * What is on is always stated in words below the toggles.
 */
import { useId, type ReactNode } from 'react';
import { AlertCircle, Building2, Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useEmployerPreferences } from '@/hooks/useEmployerPreferences';
import {
  EXCLUSION_KEYS,
  EXCLUSION_LABEL,
  activeExclusionKeys,
  preferencesSummary,
  presetFor,
  withExclusion,
  withStrictDirect,
} from '@/lib/employerPolicy';
import { cn } from '@/lib/utils';

interface EmployerPreferencesFormProps {
  /** Tighter spacing and no per-toggle hints - for the popover. */
  compact?: boolean;
  className?: string;
}

export function EmployerPreferencesForm({ compact = false, className }: EmployerPreferencesFormProps) {
  const baseId = useId();
  const { preferences, isLoading, error, unavailable, saving, save, refetch } = useEmployerPreferences();

  if (unavailable) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)} data-testid="employer-prefs-unavailable">
        Employer-type filters are not available on this server yet.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)} aria-busy="true" aria-label="Loading employer filters">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !preferences) {
    return (
      <Alert variant="destructive" className={className} data-testid="employer-prefs-error">
        <AlertCircle className="h-4 w-4" aria-hidden />
        <AlertTitle>Couldn't load your employer filters</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{error ?? 'No preferences were returned.'}</p>
          <Button type="button" size="sm" variant="outline" onClick={refetch}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const strict = presetFor(preferences.exclude) === 'strict_direct';
  const active = activeExclusionKeys(preferences);
  const presetId = `${baseId}-preset`;

  return (
    <div className={cn('space-y-3', className)} data-testid="employer-prefs-form">
      <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/[0.06] p-3">
        <div className="space-y-0.5">
          <Label htmlFor={presetId} className="text-sm font-semibold">
            Direct employers only (recommended)
          </Label>
          <p className="text-xs text-muted-foreground">
            Hides staffing agencies, consultancies, client placements, marketplaces, gig work and
            talent pools.
          </p>
        </div>
        <Switch
          id={presetId}
          checked={strict}
          disabled={saving}
          onCheckedChange={(on) => void save(withStrictDirect(preferences, on))}
        />
      </div>

      <fieldset className="space-y-2" disabled={saving}>
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Hide these
        </legend>
        {EXCLUSION_KEYS.map((key) => {
          const id = `${baseId}-${key}`;
          const meta = EXCLUSION_LABEL[key];
          return (
            <div
              key={key}
              className={cn(
                'flex items-start justify-between gap-3',
                key === 'unknown_business_model' && 'border-t border-border pt-2',
              )}
            >
              <div className="min-w-0 space-y-0.5">
                <Label htmlFor={id} className="text-xs font-medium">
                  {meta.label}
                </Label>
                {!compact && <p className="text-[11px] text-muted-foreground">{meta.hint}</p>}
              </div>
              <Switch
                id={id}
                checked={preferences.exclude[key]}
                disabled={saving}
                onCheckedChange={(on) => void save(withExclusion(preferences, key, on))}
              />
            </div>
          );
        })}
      </fieldset>

      <p className="text-[11px] text-muted-foreground" role="status" aria-live="polite" data-testid="employer-prefs-summary">
        {saving ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Saving...
          </span>
        ) : active.length ? (
          <>Hiding: {active.map((key) => EXCLUSION_LABEL[key].label.replace(/^Hide /, '')).join(', ')}.</>
        ) : (
          'Nothing hidden: every employer type is shown.'
        )}
        {!saving && preferences.set_by === 'default' && (
          <span className="block">This is the default for new accounts. Changing a toggle saves it as your choice.</span>
        )}
      </p>
    </div>
  );
}

interface EmployerFiltersPopoverProps {
  /** A custom trigger (rendered `asChild`). Defaults to a summary button. */
  children?: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

/**
 * The refine-bar entry point. Hides itself when the backend does not serve
 * the preferences endpoint, so an older backend shows the bar unchanged.
 */
export function EmployerFiltersPopover({ children, align = 'start', className }: EmployerFiltersPopoverProps) {
  const { preferences, unavailable } = useEmployerPreferences();
  if (unavailable) return null;
  const summary = preferencesSummary(preferences);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children ?? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn('h-9 shrink-0 gap-1.5 rounded-full text-xs font-semibold', className)}
            aria-label={`Employer types: ${summary}`}
            data-testid="employer-filters-trigger"
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            {summary}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-[22rem] max-w-[calc(100vw-2rem)]">
        <EmployerPreferencesForm compact />
      </PopoverContent>
    </Popover>
  );
}

export default EmployerPreferencesForm;
