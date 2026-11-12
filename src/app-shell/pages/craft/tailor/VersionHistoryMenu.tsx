/**
 * VersionHistoryMenu - the in-session version-history dropdown. Rebuilt on the
 * shadcn DropdownMenu. Index 0 is the current version (not restorable); the
 * last entry is the uploaded original.
 *
 * Presentational: the version stack + restore handler come from props.
 */
import { History } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VersionEntry } from './types';

export function VersionHistoryMenu({
  versions,
  onRestore,
}: {
  versions: VersionEntry[];
  onRestore: (v: VersionEntry) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hit-target h-auto gap-1.5 px-3 py-1.5 text-xs hover:border-primary/40 hover:text-primary"
        >
          <History className="w-3.5 h-3.5" aria-hidden="true" />
          History
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-caption-sm font-bold bg-primary/15 text-primary border border-primary/25">
            {versions.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="py-1.5">
          <p className="text-caption-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Version history
          </p>
          <p className="text-caption-sm font-normal text-muted-foreground mt-0.5">
            Choose a version to restore it
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {versions.map((v, idx) => {
            const isCurrent = idx === 0;
            const ageMin = Math.max(1, Math.floor((Date.now() - v.timestamp) / 60000));
            return (
              <DropdownMenuItem
                key={v.id}
                disabled={isCurrent}
                onSelect={() => {
                  if (!isCurrent) onRestore(v);
                }}
                className={cn(
                  'flex-col items-start gap-0.5 py-2.5',
                  isCurrent && 'bg-primary/10 opacity-100',
                )}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      isCurrent ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    v{versions.length - idx}
                    {isCurrent && ' · current'}
                  </span>
                  <span className="text-caption-sm text-muted-foreground tabular-nums">
                    {idx === versions.length - 1 ? 'uploaded' : `${ageMin}m ago`}
                  </span>
                </div>
                <p
                  className={cn(
                    'text-caption-sm leading-snug truncate w-full',
                    isCurrent ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {v.label}
                </p>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
