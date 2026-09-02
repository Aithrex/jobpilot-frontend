/**
 * Employer categories, from the canonical facet rather than from free text.
 *
 * The defect this replaces
 * -----------------------
 * The category filter was a chips input that accepted any string. Anything
 * outside `employer_registry.CATEGORIES` matched nothing, silently, and the
 * user got an empty page with a filter chip that looked applied. Measured on
 * live data, `company_categories: ["fintech"]` returned all 18,058 matching
 * postings, because nothing read the filter at all.
 *
 * So the list comes from the server, with counts, and it is the only thing
 * selectable.
 *
 * `other` is shown, last, and labelled
 * ------------------------------------
 * "Not yet categorised" is a real and countable state - it covers most of the
 * registry - and hiding it would make the counts stop adding up. It is
 * ordered last and named for what it is rather than presented as a category
 * somebody chose.
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { TechFeedCompanyCategory } from '@/types/techFeed';

interface CompanyCategoryPickerProps {
  values: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

export function CompanyCategoryPicker({
  values,
  onChange,
  className,
}: CompanyCategoryPickerProps) {
  const [categories, setCategories] = useState<TechFeedCompanyCategory[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await apiService.getTechFeedCompanyCategories();
      if (cancelled) return;
      if (res.error || !res.data) {
        setFailed(true);
        return;
      }
      setCategories(res.data.categories ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (value: string) =>
    onChange(
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
    );

  if (failed) {
    // The categories could not be loaded. Say so rather than rendering an
    // empty list, which reads as "this employer has no categories".
    return (
      <p className={cn('text-[11px] text-muted-foreground', className)}>
        Categories are unavailable right now. Every category is in scope.
      </p>
    );
  }

  if (!categories) {
    return (
      <p className={cn('flex items-center gap-1.5 text-[11px] text-muted-foreground', className)}>
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Loading categories...
      </p>
    );
  }

  if (!categories.length) {
    return (
      <p className={cn('text-[11px] text-muted-foreground', className)}>
        No employer categories have been recorded yet.
      </p>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)} role="group" aria-label="Company categories">
      <div className="flex flex-wrap gap-1.5">
        {categories.map((category) => {
          const active = values.includes(category.value);
          return (
            <button
              key={category.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(category.value)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {category.label}
              <span className={cn('ml-1 tabular-nums', active ? 'opacity-80' : 'opacity-60')}>
                {category.employers.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {values.length === 0
          ? 'Every category.'
          : 'Employers we have not categorised are kept, not hidden.'}
      </p>
    </div>
  );
}
