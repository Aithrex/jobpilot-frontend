/**
 * Recruiter's six seconds - a deep-link into the Six Seconds workspace tab.
 * Recruiters skim a resume in an F-pattern: the top third gets almost all of
 * the first pass. If the user has a base resume, invite them to run the scan;
 * most relevant while their match list is still thin (the resume is doing the
 * heavy lifting). Hidden entirely without a resume - the hero owns that ask.
 */
import { Eye } from 'lucide-react';
import type { Widget } from './types';
import { WidgetCard } from './primitives';
import { hasBaseResume, scoredMatches } from './selectors';

/** Mini F-pattern gaze glyph - a resume page with warning-toned hotspots. */
const gazeGlyph = (
  <svg viewBox="0 0 96 64" aria-hidden="true" className="h-16 w-24 shrink-0">
    {/* the page */}
    <rect x="1" y="1" width="94" height="62" rx="6" className="fill-muted/40 stroke-border" strokeWidth="1.5" />
    {/* F-pattern hotspots - hottest at the top, fading down the left edge */}
    <rect x="10" y="10" width="64" height="7" rx="3.5" className="fill-warning/80" />
    <rect x="10" y="23" width="44" height="6" rx="3" className="fill-warning/50" />
    <rect x="10" y="36" width="7" height="18" rx="3.5" className="fill-warning/30" />
    {/* the rest of the page barely gets read */}
    <rect x="24" y="38" width="48" height="4" rx="2" className="fill-muted-foreground/15" />
    <rect x="24" y="47" width="38" height="4" rx="2" className="fill-muted-foreground/15" />
  </svg>
);

export const sixSecondsWidget: Widget = {
  key: 'six-seconds',
  relevance: (ctx) => {
    if (!hasBaseResume(ctx)) return 0; // no resume → nothing to scan; hero owns the ask
    // Most valuable while matches are thin - the resume itself is the lever.
    return scoredMatches(ctx).length < 3 ? 0.5 : 0.34;
  },
  span: () => 1,
  render: (ctx) => (
    <WidgetCard
      icon={Eye}
      title="Recruiter's six seconds"
      eyebrow="First impression"
      onOpen={() => ctx.navigate('six-seconds')}
      openLabel="Scan"
    >
      <div className="flex flex-1 items-center gap-4">
        {gazeGlyph}
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug text-foreground/90">
            Your top third decides the first 6 seconds.
          </p>
          <button
            type="button"
            onClick={() => ctx.navigate('six-seconds')}
            className="mt-2 inline-flex items-center gap-1 rounded text-xs font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Run the six-second scan →
          </button>
        </div>
      </div>
    </WidgetCard>
  ),
};
