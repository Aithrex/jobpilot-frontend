import { HeroLoop } from './HeroLoop';

/**
 * Legacy module name - the hero's centerpiece is now the live product loop
 * (HeroLoop: matched -> approved -> applied -> reply). Kept as a thin
 * wrapper so any old imports keep resolving to the new centerpiece.
 */
export function HeroShortlist({ className }: { className?: string }) {
  return <HeroLoop className={className} />;
}

export default HeroShortlist;
