import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei/core/PerformanceMonitor';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

/**
 * SignalField — the landing hero's WebGL layer ("signal from noise").
 * ~6000 GPU points open as a chaotic scatter (the job-search doom loop:
 * ghost jobs, spam, fabricated claims) and, over ~3.5s, resolve into five
 * milestone clusters climbing lower-left → upper-right — a career path.
 * ~15% of points stay behind as faint background stars. All morphing,
 * breathing, twinkle, and pointer repulsion runs in the vertex shader; the
 * CPU only eases a handful of uniforms per frame.
 *
 * Perf contract: renders only while on-screen AND the tab is foreground
 * (frameloop 'never' otherwise), dpr capped at 1.75 and dropped to 1 by
 * PerformanceMonitor on sustained decline. The canvas is pointer-events-none
 * (hero copy/CTAs stay clickable) — pointer position is read from window
 * moves tested against the wrapper's rect instead.
 */

const COUNT = 6000;
const STAR_RATIO = 0.15; // fraction that never joins the path (faint stars)
const INTRO_SECONDS = 3.5;

/** Design-space extents; the field is rescaled to the live viewport. */
const FIELD_W = 17.5;
const FIELD_H = 10;

/** Milestone cluster centers — a gently accelerating rise, left → right. */
const MILESTONES: Array<[number, number, number]> = [
  [-6.4, -2.5, 0],
  [-3.3, -1.7, 0.2],
  [0.1, -0.5, -0.2],
  [3.3, 1.0, 0.15],
  [6.4, 2.7, 0],
];

/** Box–Muller gaussian, clamped so no point flies far outside its cluster. */
function gaussian(): number {
  const u = Math.max(Math.random(), 1e-6);
  const v = Math.random();
  return Math.max(-2.6, Math.min(2.6, Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)));
}

/**
 * Builds the three per-point attributes:
 *   position (aScattered) — random cloud in a wide, shallow band-shaped box
 *   aOrdered             — constellation target (cluster blob / path / star)
 *   aSeed                — [stagger, size+twinkle+hue, isStar]
 */
function buildField() {
  const scattered = new Float32Array(COUNT * 3);
  const ordered = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const o = i * 3;

    const sx = (Math.random() - 0.5) * FIELD_W;
    const sy = (Math.random() - 0.5) * FIELD_H;
    const sz = (Math.random() - 0.5) * 2.8;
    scattered[o] = sx;
    scattered[o + 1] = sy;
    scattered[o + 2] = sz;

    const isStar = Math.random() < STAR_RATIO;
    seeds[o] = Math.random();
    seeds[o + 1] = Math.random();
    seeds[o + 2] = isStar ? 1 : 0;

    if (isStar) {
      // Stars never travel — their ordered target mirrors the scatter.
      ordered[o] = sx;
      ordered[o + 1] = sy;
      ordered[o + 2] = sz;
      continue;
    }

    if (Math.random() < 0.7) {
      // Milestone cluster: a loose gaussian blob around one of five stops.
      const [cx, cy, cz] = MILESTONES[Math.floor(Math.random() * MILESTONES.length)];
      ordered[o] = cx + gaussian() * 0.55;
      ordered[o + 1] = cy + gaussian() * 0.42;
      ordered[o + 2] = cz + gaussian() * 0.3;
    } else {
      // Connective tissue: sparse points along the rising path between stops.
      const u = Math.random() * (MILESTONES.length - 1);
      const seg = Math.min(Math.floor(u), MILESTONES.length - 2);
      const t = u - seg;
      const [ax, ay, az] = MILESTONES[seg];
      const [bx, by, bz] = MILESTONES[seg + 1];
      ordered[o] = ax + (bx - ax) * t + gaussian() * 0.16;
      ordered[o + 1] = ay + (by - ay) * t + gaussian() * 0.14;
      ordered[o + 2] = az + (bz - az) * t + gaussian() * 0.18;
    }
  }
  return { scattered, ordered, seeds };
}

const VERTEX = /* glsl */ `
  attribute vec3 aOrdered;
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uProgress;
  uniform float uPush;
  uniform vec3 uPointer;
  uniform float uPixelRatio;
  varying float vTravel;
  varying float vSeed;
  varying float vStar;

  void main() {
    // Staggered resolve — each point departs on its own beat, so the field
    // settles as a wave rather than a lockstep morph. Stars never travel.
    float t = clamp(uProgress * 1.9 - aSeed.x * 0.9, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    float travel = t * (1.0 - aSeed.z);
    vec3 pos = mix(position, aOrdered, travel);

    // Breathing drift so the settled constellation never freezes.
    float amp = 0.045 + 0.055 * aSeed.y;
    pos.x += sin(uTime * 0.55 + aSeed.x * 43.7) * amp;
    pos.y += cos(uTime * 0.47 + aSeed.y * 39.1) * amp;
    pos.z += sin(uTime * 0.40 + aSeed.x * 27.3) * amp * 0.6;

    // Pointer ripple: nearby points push away with a smooth falloff and
    // re-settle as uPush eases back down on the CPU.
    vec2 d = pos.xy - uPointer.xy;
    float dist = length(d);
    float fall = smoothstep(1.5, 0.0, dist);
    pos.xy += (d / max(dist, 0.001)) * fall * 0.85 * uPush;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float twinkle = 0.8 + 0.2 * sin(uTime * (0.9 + aSeed.y * 1.7) + aSeed.x * 61.0);
    float size = mix(2.1, 3.6, aSeed.y) * (1.0 - aSeed.z * 0.55);
    gl_PointSize = size * twinkle * uPixelRatio * (10.0 / -mv.z);

    vTravel = travel;
    vSeed = aSeed.y;
    vStar = aSeed.z;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vTravel;
  varying float vSeed;
  varying float vStar;

  void main() {
    // Soft round sprite — discard the corners, feather the rim.
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.06, r);

    // Deep indigo → near-white as points join the ordered constellation.
    vec3 color = mix(uColorA, uColorB, clamp(vTravel * 0.5 + vSeed * 0.35, 0.0, 1.0));
    float alpha = (0.30 + 0.42 * vTravel) * (1.0 - vStar * 0.62);
    gl_FragColor = vec4(color, soft * alpha);
  }
`;

interface PointerState {
  /** Normalized device coords (-1..1) relative to the wrapper. */
  x: number;
  y: number;
  /** 1 while the pointer is over the band, else 0 (repulsion target). */
  active: number;
}

/** Minimal structural types for the (untyped — see three-shim.d.ts) three
 *  objects we mutate from JS. */
interface Vec3Like {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): unknown;
}
interface GroupLike {
  scale: Vec3Like;
}

function FieldPoints({ pointer }: { pointer: MutableRefObject<PointerState> }) {
  const groupRef = useRef<GroupLike | null>(null);
  const born = useMemo(() => performance.now(), []);
  const field = useMemo(buildField, []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPush: { value: 0 },
      uPointer: { value: new THREE.Vector3(999, 999, 0) },
      uPixelRatio: { value: 1 },
      uColorA: { value: new THREE.Color('#4F63E7') },
      uColorB: { value: new THREE.Color('#E8ECFF') },
    }),
    [],
  );
  // Constructor-args form (memoized so r3f never reconstructs the material on
  // parent re-renders — reconstruction would recompile the shader).
  const materialArgs = useMemo(
    () => [
      {
        uniforms,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      },
    ],
    [uniforms],
  );

  useFrame((state, delta) => {
    // Intro: cubic ease-out 0→1 over ~3.5s from mount, then a permanent slow
    // sine micro-oscillation (0.97–1.0) so the field never fully freezes.
    const elapsed = (performance.now() - born) / 1000;
    if (elapsed < INTRO_SECONDS) {
      const x = elapsed / INTRO_SECONDS;
      uniforms.uProgress.value = 1 - Math.pow(1 - x, 3);
    } else {
      uniforms.uProgress.value = 0.985 + 0.015 * Math.sin(Math.PI / 2 + (elapsed - INTRO_SECONDS) * 0.4);
    }

    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uPixelRatio.value = state.gl.getPixelRatio();

    // Fit the design-space field to the live viewport (non-uniform scale is
    // fine for a point cloud) and express the pointer in that object space.
    const vp = state.viewport;
    const sx = vp.width / FIELD_W;
    const sy = vp.height / FIELD_H;
    if (groupRef.current) groupRef.current.scale.set(sx, sy, Math.min(sx, sy));

    const p = pointer.current;
    const target = uniforms.uPointer.value as Vec3Like;
    if (p.active > 0) {
      const wx = (p.x * vp.width) / 2 / sx;
      const wy = (p.y * vp.height) / 2 / sy;
      const k = Math.min(1, delta * 6); // trailing ease → ripple, not snap
      // First contact: jump straight to the pointer so the push never sweeps
      // in from the previous resting spot.
      if (uniforms.uPush.value < 0.01) target.set(wx, wy, 0);
      else target.set(target.x + (wx - target.x) * k, target.y + (wy - target.y) * k, 0);
    }
    uniforms.uPush.value += (p.active - uniforms.uPush.value) * Math.min(1, delta * 4);
  });

  return (
    <group ref={groupRef}>
      {/* Positions are shader-driven, so the static bounds lie — never cull. */}
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[field.scattered, 3]} />
          <bufferAttribute attach="attributes-aOrdered" args={[field.ordered, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[field.seeds, 3]} />
        </bufferGeometry>
        <shaderMaterial args={materialArgs} />
      </points>
    </group>
  );
}

interface SignalFieldProps {
  className?: string;
}

export default function SignalField({ className }: SignalFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<PointerState>({ x: 0, y: 0, active: 0 });
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [painted, setPainted] = useState(false);
  const [dpr, setDpr] = useState<number | [number, number]>([1, 1.75]);

  // Render only while the band is on-screen and the tab is foreground.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '80px' });
    io.observe(el);
    const onVis = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Pointer over the band, tracked at window level — the canvas itself is
  // pointer-events-none so the hero copy and CTAs stay fully interactive.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      const p = pointer.current;
      p.active = inside ? 1 : 0;
      if (inside) {
        p.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        p.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      }
    };
    const onLeave = () => {
      pointer.current.active = 0;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('blur', onLeave);
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('blur', onLeave);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const running = inView && pageVisible;

  return (
    <div ref={wrapRef} className={cn('h-full w-full', className)}>
      <Canvas
        dpr={dpr}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        frameloop={running ? 'always' : 'never'}
        camera={{ position: [0, 0, 11], fov: 45, near: 0.1, far: 50 }}
        onCreated={() => setPainted(true)}
        className={cn('transition-opacity duration-1000', painted ? 'opacity-100' : 'opacity-0')}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)}>
          <FieldPoints pointer={pointer} />
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
