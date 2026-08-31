import { useEffect, useState } from 'react';

/**
 * Starts `false` so the first paint is always the narrow layout — a phone never
 * flashes a desktop pane before the query resolves.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, [query]);

  return matches;
}
