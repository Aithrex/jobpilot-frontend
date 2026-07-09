import { type ReactNode, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, FlaskConical, Briefcase, Code2, GraduationCap, FileText, User } from 'lucide-react';
import { DemoFrame, EASE, useDemoActive, useEntered } from './_demoKit';

interface GNode {
  x: number; // % position
  y: number;
  dx: number; // scatter offset px
  dy: number;
  icon: typeof User;
  label: string;
  primary?: boolean;
}

const NODES: GNode[] = [
  { x: 50, y: 50, dx: 0, dy: 0, icon: User, label: 'You', primary: true },
  { x: 20, y: 22, dx: -60, dy: -40, icon: Briefcase, label: '3 internships' },
  { x: 80, y: 20, dx: 70, dy: -34, icon: FlaskConical, label: 'Kaggle · top 8%' },
  { x: 16, y: 78, dx: -66, dy: 44, icon: Code2, label: '12 projects' },
  { x: 84, y: 80, dx: 72, dy: 40, icon: Trophy, label: 'Hackathon win' },
  { x: 50, y: 14, dx: 0, dy: -56, icon: GraduationCap, label: 'MS · CS' },
  { x: 50, y: 88, dx: 0, dy: 56, icon: FileText, label: 'Résumé' },
];

// Ambient story loop (s): evidence pulses flow inward to "You", then one pulse
// carries on out to the Résumé node, which blooms — the graph writes the résumé.
const CYCLE = 4.5;
const EVIDENCE_DUR = 1.1;
const RESUME_DUR = 0.9;
const GLOW_DUR = 1;
const RESUME_DELAY = 2.5;
const GLOW_DELAY = 3.3;

/** Career-as-a-structure: scattered evidence nodes fly in and settle into a
 *  graph wired to your résumé — the basis for an authored, never-fabricated CV. */
export default function GraphAssemble() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useDemoActive(ref);
  const entered = useEntered(ref);
  const reduce = useReducedMotion();
  const settled = reduce || entered;

  return (
    <DemoFrame>
      <div
        ref={ref}
        role="img"
        aria-label="A knowledge graph: nodes for your internships, projects, Kaggle rank, and hackathon win fly in and settle around a central 'You' node, all wired to your résumé."
        className="relative h-[260px] w-full"
      >
        {/* edges */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {NODES.filter((n) => !n.primary).map((n, i) => (
            <motion.line
              key={n.label}
              x1={50}
              y1={50}
              x2={n.x}
              y2={n.y}
              className={n.label === 'Résumé' ? 'stroke-primary' : 'stroke-border'}
              strokeWidth={n.label === 'Résumé' ? 1.5 : 1}
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
              animate={{ pathLength: settled ? 1 : 0, opacity: settled ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.7, ease: EASE, delay: reduce ? 0 : 0.15 + i * 0.06 }}
            />
          ))}

          {/* travelling pulses: evidence flows in, the résumé edge flows out */}
          {NODES.filter((n) => !n.primary).map((n, i) => {
            const isResume = n.label === 'Résumé';
            return (
              <motion.circle
                key={`pulse-${n.label}`}
                r={1.6}
                className="fill-primary"
                initial={{ opacity: 0, cx: isResume ? 50 : n.x, cy: isResume ? 50 : n.y }}
                animate={
                  active
                    ? {
                        cx: isResume ? [50, n.x] : [n.x, 50],
                        cy: isResume ? [50, n.y] : [n.y, 50],
                        opacity: [0, 1, 1, 0],
                      }
                    : { opacity: 0 }
                }
                transition={
                  active
                    ? {
                        duration: isResume ? RESUME_DUR : EVIDENCE_DUR,
                        delay: isResume ? RESUME_DELAY : 0.4 + i * 0.25,
                        repeat: Infinity,
                        repeatDelay: CYCLE - (isResume ? RESUME_DUR : EVIDENCE_DUR),
                        ease: 'easeInOut',
                      }
                    : { duration: 0.2 }
                }
              />
            );
          })}
        </svg>

        {/* nodes */}
        {NODES.map((n, i) => {
          const Icon = n.icon;
          return (
            <div key={n.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
              <motion.div
                initial={{ x: reduce ? 0 : n.dx, y: reduce ? 0 : n.dy, opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0.9 }}
                animate={{ x: settled ? 0 : n.dx, y: settled ? 0 : n.dy, opacity: settled ? 1 : 0, scale: settled ? 1 : 0.9 }}
                transition={{ duration: reduce ? 0 : 0.7, ease: EASE, delay: reduce ? 0 : 0.05 + i * 0.07 }}
              >
                <div className="relative">
                  {n.label === 'Résumé' && (
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute -inset-1 -z-10 rounded-full bg-primary/25 blur-md"
                      initial={{ opacity: 0 }}
                      animate={active ? { opacity: [0, 1, 0] } : { opacity: 0 }}
                      transition={
                        active
                          ? { duration: GLOW_DUR, delay: GLOW_DELAY, repeat: Infinity, repeatDelay: CYCLE - GLOW_DUR, ease: 'easeInOut' }
                          : { duration: 0.2 }
                      }
                    />
                  )}
                  <NodePill icon={Icon} primary={n.primary}>
                    {n.label}
                  </NodePill>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </DemoFrame>
  );
}

function NodePill({ icon: Icon, primary, children }: { icon: typeof User; primary?: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
        primary ? 'border-primary bg-primary text-primary-foreground shadow-primary/20' : 'border-border bg-card text-foreground'
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${primary ? '' : 'text-primary'}`} aria-hidden />
      {children}
    </span>
  );
}
