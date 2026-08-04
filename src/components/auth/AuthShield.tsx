import { motion, useReducedMotion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/components/theme-provider';
import { checkPasswordRules, type PasswordRules } from './PasswordChecklist';

/**
 * The auth stage's right pane while a password is being chosen: a barrier under
 * fire, where each satisfied requirement deflects one more incoming strike.
 *
 * Two earlier versions are worth not repeating. A shield with a rising fill was
 * a progress bar in costume. Adding growth, plating and a ring gauge made it
 * handsomer but no more alive - every part of it sat still until you typed, so
 * it read as a static badge reporting a score.
 *
 * This one is always moving, and the motion IS the explanation. Five strikes
 * loop in continuously, one per requirement. A rule you have met turns its
 * strike into a deflection - it breaks on the rim in a ripple. A rule you have
 * not met lets its strike straight through, and the core flinches. So the pane
 * answers the question the checklist cannot: not "how many boxes are ticked"
 * but "what does that buy me". At 5/5 nothing gets in.
 *
 * Strike i maps to rule i, so the count of deflections is exactly the count of
 * met rules from {@link checkPasswordRules} - the same function the checklist
 * renders, itself a mirror of the backend policy. Nothing here is a separate
 * heuristic, so the animation cannot flatter a password the server rejects.
 *
 * Decorative by contract: `AuthShell` marks the pane `aria-hidden`, and the
 * checklist already announces per-rule state. Under `prefers-reduced-motion`
 * nothing loops - the barrier renders settled, at its strength-appropriate size.
 */

const RULE_KEYS: (keyof PasswordRules)[] = ['length', 'upper', 'lower', 'digit', 'special'];
const TOTAL = RULE_KEYS.length;

/* ── Geometry (viewBox cropped to the artwork) ───────────────────── */
const CX = 120;
const CY = 136;
const SHIELD_D =
  'M 120 40 L 196 72 V 140 C 196 186 160 218 120 232 C 80 218 44 186 44 140 V 72 Z';

/** Where each strike lands, spread around the exposed upper arc. */
const IMPACTS: Array<{ x: number; y: number }> = [
  { x: 48, y: 122 },
  { x: 66, y: 68 },
  { x: 120, y: 41 },
  { x: 174, y: 68 },
  { x: 192, y: 122 },
];

/** Launch point and breach point, both along the impact's own radius. */
const along = (p: { x: number; y: number }, k: number) => ({
  x: CX + (p.x - CX) * k,
  y: CY + (p.y - CY) * k,
});

/** Outward unit vector at an impact - the direction a tracer's tail trails. */
const radial = (p: { x: number; y: number }) => {
  const dx = p.x - CX;
  const dy = p.y - CY;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
};

/** Tail length. A dot reads as a speck; a streak reads as something incoming. */
const TRACER = 20;

/** Centre badge, sat slightly above the crest's midpoint. */
const BADGE_CY = CY - 6;
const BADGE_R = 30;

/**
 * The badge's centre as a percentage of the rendered SVG height, so the HTML
 * glyph lands exactly on the disc drawn inside the SVG. The viewBox is
 * `0 12 240 248`, so y=130 is (130-12)/248 down, not 50%.
 */
const BADGE_TOP = `${(((BADGE_CY - 12) / 248) * 100).toFixed(2)}%`;

const CYCLE = 2.8;

/**
 * Position at the moment a strike finishes fading in (t=0.06 of a flight that
 * lands at t=0.52), as a fraction of the distance still to travel. Keeping the
 * position keyframes in step with the opacity keyframes means the fade-in does
 * not visibly stall the tracer at its launch point.
 */
const FADE_IN_LEFT = 1 - 0.06 / 0.52;

function tierOf(met: number) {
  if (met === TOTAL) return { key: 'strong', label: 'Strong', color: 'hsl(var(--success))' };
  if (met >= 3) return { key: 'fair', label: 'Getting there', color: 'hsl(var(--primary))' };
  if (met >= 1) return { key: 'weak', label: 'Weak', color: 'hsl(var(--warning))' };
  return { key: 'empty', label: 'Set a password', color: 'hsl(var(--muted-foreground))' };
}

export function AuthShield({ password, className }: { password: string; className?: string }) {
  const reduce = useReducedMotion();
  const rules = checkPasswordRules(password);
  const met = RULE_KEYS.filter((k) => rules[k]).length;
  const pct = met / TOTAL;
  const tier = tierOf(met);
  const complete = met === TOTAL;


  /**
   * The barrier does NOT resize. It used to scale 0.72 -> 1.06 with strength,
   * which is a lot of movement on a panel you are looking at while typing:
   * every keystroke that crossed a rule nudged the whole crest, and the edges
   * drifted under the eye. Strength is carried by colour, fill depth and how
   * many strikes get through - none of which move anything.
   */

  /**
   * Light and dark want different amounts of tint. The same 54% green that
   * reads as a solid field on near-black turns muddy and washed on a pearl
   * page, so the light surface takes a lighter fill and leans on the rim.
   */
  const light = useResolvedTheme() === 'light';
  const fillOpacity = light ? 0.10 + pct * 0.16 : 0.14 + pct * 0.36;

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none relative flex h-full w-full flex-col items-center justify-center px-10',
        className,
      )}
    >
      <div className="relative w-full max-w-[400px]">
        {/* Aura, centred on the barrier and widening with it. */}
        <motion.div
          className="absolute left-1/2 top-1/2 rounded-full blur-3xl"
          initial={false}
          animate={{
            width: 300 + pct * 280,
            height: 300 + pct * 280,
            background: `radial-gradient(circle, ${tier.color.replace(')', ` / ${0.07 + pct * 0.18})`)}, transparent 68%)`,
          }}
          transition={{ duration: reduce ? 0 : 0.7 }}
          style={{ translateX: '-50%', translateY: '-50%' }}
        />

        <svg viewBox="0 12 240 248" className="relative w-full overflow-visible" focusable="false">
          <defs>
            <clipPath id="auth-shield-clip">
              <path d={SHIELD_D} />
            </clipPath>
            {/* Depth layer. It has to work in opposite directions per theme:
                on the dark surface more of the tier colour READS as glow, but
                on the pearl surface the same coat lands on top of the base tint
                and the interior goes muddy - two coats of green where one was
                wanted. Light gets a WHITE lift instead, so the body stays a
                pale tint of the tier colour with a light source above it. */}
            <radialGradient id="auth-shield-core" cx="50%" cy="38%">
              {light ? (
                <>
                  <stop offset="0%" stopColor="white" stopOpacity="0.85" />
                  <stop offset="70%" stopColor="white" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="white" stopOpacity="0.12" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
                </>
              )}
            </radialGradient>
          </defs>

          <g>
            {/* ── The barrier ─────────────────────────────────────────── */}
            <motion.g
              initial={false}
              animate={{ color: tier.color }}
              transition={{ duration: reduce ? 0 : 0.5 }}
            >
              {/* SOLID body. The barrier used to be a transparent lattice over
                  the page, which read as hollow - you could see the background
                  grid straight through the thing that is meant to be stopping
                  things. It is opaque now: a card-coloured base carrying a tier
                  tint that deepens as the field strengthens. */}
              <path d={SHIELD_D} fill="hsl(var(--card))" />
              <motion.path
                d={SHIELD_D}
                fill="currentColor"
                initial={false}
                animate={{ opacity: fillOpacity }}
                transition={{ duration: reduce ? 0 : 0.5 }}
              />
              {/* Depth: a light source above, so the surface is not flat. No
                  lattice - a grid inside the shield sat on top of the page's
                  own background grid and the two read as graph paper. */}
              <path d={SHIELD_D} fill="url(#auth-shield-core)" opacity={0.75} />
              {/* Rim carries the strength the fill no longer has to: a hairline
                  when exposed, heavy when sealed. A stroke width does not move
                  the crest, so it costs nothing in stability. */}
              <motion.path
                d={SHIELD_D}
                fill="none"
                stroke="currentColor"
                strokeLinejoin="round"
                initial={false}
                animate={{ strokeWidth: 1.6 + pct * 3, opacity: 0.5 + pct * 0.5 }}
                transition={{ duration: reduce ? 0 : 0.5 }}
              />
            </motion.g>

            {/* ── Incoming fire ───────────────────────────────────────── */}
            {!reduce &&
              IMPACTS.map((p, i) => {
                const deflects = i < met;
                // 1.85, not 2.7. At 2.7 a strike launched ~330px from the crest
                // - outside the pane entirely - so it spent most of its flight
                // off-screen and frames often showed no incoming fire at all,
                // which made a weak barrier look like it was under one attack
                // rather than four.
                const from = along(p, 1.85);
                const into = along(p, 0.3);
                const delay = i * (CYCLE / TOTAL);
                const r = radial(p);
                const dx = from.x - p.x;
                const dy = from.y - p.y;
                // Deflected fire stops dead on the rim; a breach carries on in.
                const endX = deflects ? 0 : into.x - p.x;
                const endY = deflects ? 0 : into.y - p.y;
                // Deflected fire takes the barrier's colour; what gets through
                // is destructive - the one place red is honest here.
                const strikeColor = deflects ? tier.color : 'hsl(var(--destructive))';

                return (
                  <g key={i}>
                    {/* The strike itself: a tracer flying down its radius.
                        NO `initial={false}` here. That prop rests the element at
                        the animate TARGET and only runs the animation when the
                        prop changes - so a strike whose state never changed
                        (any rule left unmet for more than a keystroke) parked on
                        its final keyframe at opacity 0 and never flew again.
                        Only the ones that flipped deflect/breach as you typed
                        appeared to work, which is why a weak barrier looked like
                        it was under a single attack. */}
                    <motion.g
                      // Opacity reaches full almost immediately and HOLDS for
                      // the flight. It used to ramp 0 -> 1 across the whole
                      // approach, so a strike was a faint smudge for most of
                      // the time it was on screen.
                      // Every keyframe list ends with a HOLD at t=1.
                      //
                      // Without it `times` ended at 0.6/0.88, framer treated the
                      // animation as finished there, and `repeat: Infinity`
                      // never re-armed - the strike parked on its last keyframe
                      // at opacity 0 and stayed there. Deflections happened to
                      // survive it; breaches did not, so a weak barrier showed
                      // one lonely strike instead of the four getting through.
                      animate={{
                        x: [dx, dx * FADE_IN_LEFT, 0, endX, endX],
                        y: [dy, dy * FADE_IN_LEFT, 0, endY, endY],
                        opacity: [0, 1, 1, 0, 0],
                      }}
                      transition={{
                        duration: CYCLE,
                        times: deflects
                          ? [0, 0.06, 0.52, 0.6, 1]
                          : [0, 0.06, 0.52, 0.88, 1],
                        repeat: Infinity,
                        repeatType: 'loop',
                        delay,
                        ease: 'linear',
                      }}
                    >
                      {/* Tail trails outward along the impact's own radius, so
                          each tracer points where it is going. */}
                      <line
                        x1={p.x + r.x * TRACER}
                        y1={p.y + r.y * TRACER}
                        x2={p.x}
                        y2={p.y}
                        stroke={strikeColor}
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        opacity={0.55}
                      />
                      <circle cx={p.x} cy={p.y} r={4.2} fill={strikeColor} />
                      <circle cx={p.x} cy={p.y} r={10} fill={strikeColor} opacity={0.22} />
                    </motion.g>

                    {/* Deflection: the rim throws the strike off in a ripple. */}
                    {deflects && (
                      <motion.circle
                        cx={p.x}
                        cy={p.y}
                        r={9}
                        fill="none"
                        stroke={tier.color}
                        strokeWidth={2}
                        // Same reason as the tracer above: no `initial={false}`,
                        // or the ripple rests at its target and never loops.
                        animate={{ scale: [0.3, 0.3, 2.1, 2.1], opacity: [0, 0.9, 0, 0] }}
                        transition={{
                          duration: CYCLE,
                          times: [0, 0.52, 0.82, 1],
                          repeat: Infinity,
                          repeatType: 'loop',
                          delay,
                          ease: 'easeOut',
                        }}
                        style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                      />
                    )}
                  </g>
                );
              })}

            {/* Centre badge: a SOLID disc so the glyph sits on its own ground
                rather than floating on the barrier's tint, which it was doing
                at every strength. Drawn in the SVG, not overlaid in HTML, so it
                cannot drift out of register with the crest. */}
            <motion.circle
              cx={CX}
              cy={BADGE_CY}
              r={BADGE_R}
              initial={false}
              animate={{ fill: tier.color, opacity: met === 0 ? 0.55 : 1 }}
              transition={{ duration: reduce ? 0 : 0.5 }}
            />
          </g>
        </svg>

        {/* Centre glyph. Deliberately STILL - it used to pulse once per breach,
            which put the barrier in constant low-level motion and read as the
            whole thing drifting. The tracers carry the movement; the barrier and
            its glyph hold their ground, which is rather the point of a shield. */}
        {/* Anchored to the disc's own centre. The badge sits at viewBox y=130
            in a box spanning 12..260, i.e. 47.6% down - not 50%, which left the
            glyph a few pixels proud of the disc it is meant to sit in. */}
        <span
          className="absolute grid place-items-center"
          style={{ left: '50%', top: BADGE_TOP, transform: 'translate(-50%, -50%)' }}
        >
          {/* Card colour, against the solid tier-coloured disc: near-white on
              the light surface, deep on the dark one. Foreground would be one
              tone on itself in one theme or the other. */}
          <span className="grid h-16 w-16 place-items-center" style={{ color: 'hsl(var(--card))' }}>
            {complete ? (
              <Check className="h-9 w-9" strokeWidth={3} />
            ) : (
              <Lock className="h-8 w-8" strokeWidth={2.2} style={{ opacity: met === 0 ? 0.7 : 1 }} />
            )}
          </span>
        </span>

        {/* Sealed: one ring on arrival, not a loop. */}
        {complete && !reduce && (
          <motion.span
            className="absolute h-44 w-44 rounded-full"
            style={{
              border: `2px solid ${tier.color}`,
              left: '50%',
              top: BADGE_TOP,
              translateX: '-50%',
              translateY: '-50%',
            }}
            initial={{ scale: 0.6, opacity: 0.75 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        )}
      </div>

      <motion.p
        key={tier.key}
        className="mt-1 font-display text-xl font-extrabold tracking-tight"
        style={{ color: tier.color }}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.35 }}
      >
        {tier.label}
      </motion.p>
      {/* Says the same thing the checklist says, in the checklist's own words.
          It briefly read "2 of 5 getting through", which counted BREACHES - so
          the number went down as you improved, it never named what was getting
          through, and you had to invert it against a list that counts up. The
          animation can carry the threat; the label should just be countable. */}
      <p className="mt-1 text-sm text-muted-foreground">
        {complete ? `All ${TOTAL} requirements met` : `${met} of ${TOTAL} requirements met`}
      </p>
    </div>
  );
}
