import { useEffect, useState } from 'react';

/**
 * True at >=1024px. Extracted from the section that first needed it so the
 * cinematic/narrative decision is made the same way everywhere.
 *
 * Deliberately not the shared 768px `useIsMobile`: a pinned two-column
 * walkthrough is a 1024 question, not a phone/not-phone one. Starts `false`,
 * so the first paint is always the narrative layout and a reader on a slow
 * device never sees a sticky frame flash before it resolves.
 */
export function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const sync = () => setWide(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);
  return wide;
}
