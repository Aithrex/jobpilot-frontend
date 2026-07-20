import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

/**
 * SignalScene - the landing hero's interactive 3D tableau ("career signal
 * network"). One composed scene tells the product story left to right:
 *
 *   glass resume card
 *     -> three curved signal paths carrying small flowing particles
 *       -> a fan of five mini job cards; one carries an indigo glow edge and
 *          a filling score ring, and the highlight cycles slowly across the
 *          middle three cards
 *         -> the highlighted card continues along one more path into a
 *            tailored resume card holding a soft green integrity check.
 *
 * Motion contract: particles flow along their curves, the whole rig floats
 * on a tiny sinusoid, the score ring fills, and the rig leans toward the
 * pointer by at most 6 degrees (lerped) - controlled, never busy. No random
 * rotating geometry, no postprocessing, no drei.
 *
 * Perf contract: dpr clamped [1, 1.75]; one ambient + one directional light;
 * frameloop 'never' while offscreen (IntersectionObserver) or while the tab
 * is hidden. This module is only ever loaded through React.lazy from the
 * HeroSceneStage mount gate, so three/r3f never touch the eager bundle.
 *
 * three@0.182 is typed as `any` via src/types/three-shim.d.ts, so the few
 * objects mutated from JS are paired with narrow structural interfaces.
 * Raw color values are allowed here (WebGL materials), harmonized with the
 * indigo 238 70% 57% primary and the sky brand-to accent.
 */

const INDIGO = '#4f46e5';
const INDIGO_SOFT = '#6366f1';
const SKY = '#0ea5e9';
const INK = '#3b3f8f';
const FRAME = '#cbcff3';
const GREEN = '#10b981';

/** Max pointer lean, ~6 degrees. */
const MAX_TILT = 0.105;
/** Seconds each highlighted card holds before the highlight moves on. */
const CYCLE_SECONDS = 4.5;
/** Fan indices that take the highlight (the middle three cards). */
const CYCLE_CARDS = [1, 2, 3] as const;
/** Score-ring fill targets for each cycling card. */
const SCORES = [0.74, 0.86, 0.68];

const CARD_W = 0.62;
const CARD_H = 0.42;
const RESUME_W = 1.14;
const RESUME_H = 1.5;
const TAILOR_W = 0.8;
const TAILOR_H = 1.06;
const RESUME_POS: [number, number, number] = [-1.72, 0.12, 0];
const TAILOR_POS: [number, number, number] = [1.98, -0.02, 0.06];

/** Fan of five mini job cards, arced with a slight depth stagger. */
const FAN: Array<{ x: number; y: number; z: number }> = [
  { x: 0.4, y: 1.02, z: -0.14 },
  { x: 0.58, y: 0.51, z: 0.0 },
  { x: 0.66, y: 0.0, z: 0.15 },
  { x: 0.58, y: -0.51, z: 0.0 },
  { x: 0.4, y: -1.02, z: -0.14 },
];

/* ------------------------------------------------------------------ */
/* Narrow structural types for the untyped three objects we mutate.    */
/* ------------------------------------------------------------------ */

interface Vec3Like {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): unknown;
}
interface TransformLike {
  position: Vec3Like;
  rotation: Vec3Like;
  scale: Vec3Like;
  visible: boolean;
}
interface MaterialLike {
  opacity: number;
}
interface CurveLike {
  getPointAt(t: number): { x: number; y: number; z: number };
}
interface UniformLike {
  value: number;
}
interface RingUniforms {
  uFill: UniformLike;
  uOpacity: UniformLike;
}

interface PointerState {
  /** Normalized -1..1 coords relative to the stage wrapper. */
  x: number;
  y: number;
  /** 1 while the pointer is over the stage, else 0. */
  active: number;
}

/* ------------------------------------------------------------------ */
/* Geometry + texture helpers                                          */
/* ------------------------------------------------------------------ */

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** 128px radial-gradient canvas texture - the fake blurred shadow/glow. */
function makeRadialTexture(rgb: string) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, `rgba(${rgb}, 1)`);
    g.addColorStop(0.55, `rgba(${rgb}, 0.35)`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

/* ------------------------------------------------------------------ */
/* Score ring: a tiny shader quad - the arc fills clockwise from 12    */
/* o'clock as uFill rises. Cheaper and cleaner than rebuilding a       */
/* RingGeometry every frame.                                           */
/* ------------------------------------------------------------------ */

const RING_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RING_FRAG = /* glsl */ `
  uniform float uFill;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p);
    float band = smoothstep(0.30, 0.345, d) * (1.0 - smoothstep(0.455, 0.5, d));
    float ang = atan(p.x, p.y);
    if (ang < 0.0) ang += 6.28318530718;
    float a = ang / 6.28318530718;
    float filled = 1.0 - smoothstep(uFill - 0.015, uFill + 0.015, a);
    float alpha = band * (0.16 + 0.84 * filled) * uOpacity;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/* ------------------------------------------------------------------ */
/* Small scene pieces                                                  */
/* ------------------------------------------------------------------ */

interface BarSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  opacity: number;
}

function Bars({ bars }: { bars: BarSpec[] }) {
  return (
    <>
      {bars.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, 0.006]}>
          <planeGeometry args={[b.w, b.h]} />
          <meshBasicMaterial color={b.color} transparent opacity={b.opacity} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

/** Glass card: translucent white body over a hairline tinted frame. */
function GlassCard({
  w,
  h,
  r = 0.06,
  bodyOpacity = 0.82,
  children,
}: {
  w: number;
  h: number;
  r?: number;
  bodyOpacity?: number;
  children?: React.ReactNode;
}) {
  const frame = useMemo(() => roundedRectShape(w + 0.022, h + 0.022, r + 0.011), [w, h, r]);
  const body = useMemo(() => roundedRectShape(w, h, r), [w, h, r]);
  return (
    <>
      <mesh position={[0, 0, -0.004]}>
        <shapeGeometry args={[frame]} />
        <meshBasicMaterial color={FRAME} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh>
        <shapeGeometry args={[body]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={bodyOpacity} roughness={0.32} metalness={0.02} depthWrite={false} />
      </mesh>
      {children}
    </>
  );
}

const RESUME_BARS: BarSpec[] = [
  { x: -0.06, y: 0.555, w: 0.4, h: 0.045, color: INK, opacity: 0.5 },
  { x: -0.11, y: 0.48, w: 0.3, h: 0.035, color: INK, opacity: 0.28 },
  { x: 0, y: 0.375, w: 0.94, h: 0.01, color: INK, opacity: 0.12 },
  { x: 0, y: 0.27, w: 0.94, h: 0.038, color: INDIGO, opacity: 0.26 },
  { x: -0.07, y: 0.15, w: 0.8, h: 0.038, color: INDIGO, opacity: 0.22 },
  { x: -0.03, y: 0.03, w: 0.88, h: 0.038, color: INDIGO, opacity: 0.26 },
  { x: -0.14, y: -0.1, w: 0.66, h: 0.038, color: SKY, opacity: 0.42 },
  { x: -0.04, y: -0.23, w: 0.86, h: 0.038, color: INDIGO, opacity: 0.22 },
  { x: -0.17, y: -0.35, w: 0.6, h: 0.038, color: INDIGO, opacity: 0.18 },
  { x: -0.11, y: -0.5, w: 0.72, h: 0.038, color: INDIGO, opacity: 0.24 },
  { x: -0.22, y: -0.62, w: 0.5, h: 0.038, color: INDIGO, opacity: 0.16 },
];

const TAILOR_BARS: BarSpec[] = [
  { x: 0, y: 0.38, w: 0.6, h: 0.036, color: INK, opacity: 0.45 },
  { x: -0.06, y: 0.265, w: 0.48, h: 0.034, color: INDIGO, opacity: 0.24 },
  { x: 0.02, y: 0.15, w: 0.64, h: 0.034, color: INDIGO, opacity: 0.26 },
  { x: -0.04, y: 0.035, w: 0.52, h: 0.034, color: GREEN, opacity: 0.42 },
  { x: 0.01, y: -0.08, w: 0.62, h: 0.034, color: INDIGO, opacity: 0.22 },
  { x: -0.08, y: -0.195, w: 0.44, h: 0.034, color: INDIGO, opacity: 0.18 },
  { x: -0.01, y: -0.33, w: 0.58, h: 0.034, color: INDIGO, opacity: 0.26 },
  { x: -0.1, y: -0.44, w: 0.4, h: 0.034, color: INDIGO, opacity: 0.16 },
];

function miniCardBars(highlighted: boolean): BarSpec[] {
  return [
    { x: highlighted ? -0.01 : 0.03, y: 0.115, w: highlighted ? 0.22 : 0.3, h: 0.034, color: INK, opacity: 0.45 },
    { x: highlighted ? -0.045 : -0.005, y: 0.05, w: highlighted ? 0.15 : 0.23, h: 0.028, color: INK, opacity: 0.28 },
    { x: highlighted ? -0.15 : -0.115, y: -0.105, w: highlighted ? 0.2 : 0.28, h: 0.032, color: SKY, opacity: 0.35 },
  ];
}

/* ------------------------------------------------------------------ */
/* The tableau                                                         */
/* ------------------------------------------------------------------ */

interface ParticleDef {
  curve: CurveLike;
  speed: number;
  offset: number;
  /** Index into CYCLE_CARDS when the particle rides a tailor path (only
   *  visible while its card holds the highlight), else null. */
  cycleIdx: number | null;
  sky: boolean;
}

function Tableau({ pointer }: { pointer: MutableRefObject<PointerState> }) {
  const rig = useRef<TransformLike | null>(null);
  const cardGroups = useRef<Array<TransformLike | null>>([]);
  const particleEls = useRef<Array<TransformLike | null>>([]);
  const highlightMats = useRef<Array<MaterialLike | null>>([]);
  const glowMats = useRef<Array<MaterialLike | null>>([]);
  const outTubeMats = useRef<Array<MaterialLike | null>>([]);
  const checkMat = useRef<MaterialLike | null>(null);
  const checkHaloMat = useRef<MaterialLike | null>(null);
  const cycleEase = useRef<{ glow: number[]; fill: number[] }>({ glow: [0, 0, 0], fill: [0, 0, 0] });

  const shadowTex = useMemo(() => makeRadialTexture('24, 28, 68'), []);
  const glowTex = useMemo(() => makeRadialTexture('99, 102, 241'), []);
  const particleGeo = useMemo(() => new THREE.SphereGeometry(0.02, 8, 8), []);
  const particleMatIndigo = useMemo(
    () => new THREE.MeshBasicMaterial({ color: INDIGO, transparent: true, opacity: 0.9, depthWrite: false }),
    [],
  );
  const particleMatSky = useMemo(
    () => new THREE.MeshBasicMaterial({ color: SKY, transparent: true, opacity: 0.85, depthWrite: false }),
    [],
  );

  const curves = useMemo(() => {
    const inPaths = CYCLE_CARDS.map((ci, i) => {
      const c = FAN[ci];
      const startY = [0.5, 0.1, -0.34][i];
      const bow = i === 0 ? 0.14 : i === 2 ? -0.16 : 0.04;
      return new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(RESUME_POS[0] + RESUME_W / 2 + 0.02, RESUME_POS[1] + startY, 0.02),
        new THREE.Vector3(-0.38, (startY + c.y) / 2 + bow, 0.06),
        new THREE.Vector3(c.x - CARD_W / 2 - 0.02, c.y, c.z),
      ) as CurveLike;
    });
    const outPaths = CYCLE_CARDS.map((ci) => {
      const c = FAN[ci];
      return new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(c.x + CARD_W / 2 + 0.02, c.y, c.z),
        new THREE.Vector3(1.34, c.y / 2 + 0.12, 0.12),
        new THREE.Vector3(TAILOR_POS[0] - TAILOR_W / 2 - 0.02, TAILOR_POS[1] + 0.12, TAILOR_POS[2]),
      ) as CurveLike;
    });
    return { inPaths, outPaths };
  }, []);

  const tubeGeos = useMemo(
    () => ({
      inPaths: curves.inPaths.map((c) => new THREE.TubeGeometry(c, 36, 0.011, 6, false)),
      outPaths: curves.outPaths.map((c) => new THREE.TubeGeometry(c, 36, 0.011, 6, false)),
    }),
    [curves],
  );

  const particles = useMemo<ParticleDef[]>(() => {
    const defs: ParticleDef[] = [];
    curves.inPaths.forEach((curve, i) => {
      for (let j = 0; j < 4; j++) {
        defs.push({
          curve,
          speed: 0.085 + i * 0.014 + j * 0.004,
          offset: j / 4 + i * 0.09,
          cycleIdx: null,
          sky: (i + j) % 3 === 2,
        });
      }
    });
    curves.outPaths.forEach((curve, i) => {
      for (let j = 0; j < 2; j++) {
        defs.push({
          curve,
          speed: 0.12 + j * 0.015,
          offset: j / 2 + i * 0.13,
          cycleIdx: i,
          sky: j === 1,
        });
      }
    });
    return defs;
  }, [curves]);

  const ringMats = useMemo(
    () =>
      CYCLE_CARDS.map(
        () =>
          new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
              uFill: { value: 0 },
              uOpacity: { value: 0 },
              uColor: { value: new THREE.Color(INDIGO) },
            },
            vertexShader: RING_VERT,
            fragmentShader: RING_FRAG,
          }),
      ),
    [],
  );

  const highlightFrame = useMemo(() => roundedRectShape(CARD_W + 0.05, CARD_H + 0.05, 0.075), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const k = Math.min(1, delta * 3); // ~0.05 lerp at 60fps

    // Pointer lean (max ~6 degrees each axis) + tiny sinusoidal float.
    if (rig.current) {
      const p = pointer.current;
      const targetY = p.active > 0 ? p.x * MAX_TILT : 0;
      const targetX = p.active > 0 ? -p.y * MAX_TILT : 0;
      rig.current.rotation.y += (targetY - rig.current.rotation.y) * k;
      rig.current.rotation.x += (targetX - rig.current.rotation.x) * k;
      rig.current.position.y = Math.sin(t * 0.55) * 0.028;
    }

    // Individual card float: barely-there, phase-offset.
    FAN.forEach((c, i) => {
      const g = cardGroups.current[i];
      if (g) g.position.y = c.y + Math.sin(t * 0.7 + i * 1.7) * 0.013;
    });

    // Highlight cycle across the middle three cards.
    const active = Math.floor(t / CYCLE_SECONDS) % CYCLE_CARDS.length;
    const ease = cycleEase.current;
    for (let i = 0; i < CYCLE_CARDS.length; i++) {
      const isActive = i === active;
      ease.glow[i] += ((isActive ? 1 : 0) - ease.glow[i]) * Math.min(1, delta * 2.4);
      const fillTarget = isActive ? SCORES[i] : 0;
      ease.fill[i] += (fillTarget - ease.fill[i]) * Math.min(1, delta * (isActive ? 1.5 : 3.2));

      const hl = highlightMats.current[i];
      if (hl) hl.opacity = 0.85 * ease.glow[i];
      const gm = glowMats.current[i];
      if (gm) gm.opacity = 0.4 * ease.glow[i];
      const om = outTubeMats.current[i];
      if (om) om.opacity = 0.34 * ease.glow[i];
      const uniforms = ringMats[i].uniforms as unknown as RingUniforms;
      uniforms.uFill.value = ease.fill[i];
      uniforms.uOpacity.value = 0.25 + 0.75 * ease.glow[i];
    }

    // Particles flow along their curves; tailor-path particles only travel
    // while their card holds the highlight.
    particles.forEach((def, i) => {
      const el = particleEls.current[i];
      if (!el) return;
      const u = (t * def.speed + def.offset) % 1;
      const pt = def.curve.getPointAt(u);
      el.position.set(pt.x, pt.y, pt.z + 0.02);
      let s = 0.72 + 0.55 * Math.sin(u * Math.PI);
      if (def.cycleIdx !== null) {
        const g = cycleEase.current.glow[def.cycleIdx];
        el.visible = g > 0.06;
        s *= g;
      }
      el.scale.set(s, s, s);
    });

    // Integrity check: a soft, steady green breath on the tailored resume.
    const breath = 0.5 + 0.5 * Math.sin(t * 0.8);
    if (checkMat.current) checkMat.current.opacity = 0.72 + 0.2 * breath;
    if (checkHaloMat.current) checkHaloMat.current.opacity = 0.12 + 0.08 * breath;
  });

  return (
    <group ref={rig}>
      {/* Ambient brand wash + fake blurred-ellipse shadows for grounding. */}
      <mesh position={[0.15, 0.05, -0.9]} scale={[5.4, 4.4, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glowTex} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[RESUME_POS[0], -0.86, -0.25]} scale={[1.5, 0.42, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <mesh position={[0.52, -1.42, -0.3]} scale={[1.9, 0.5, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      <mesh position={[TAILOR_POS[0], -0.74, -0.25]} scale={[1.15, 0.36, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.3} depthWrite={false} />
      </mesh>

      {/* Resume card. */}
      <group position={RESUME_POS}>
        <GlassCard w={RESUME_W} h={RESUME_H} r={0.09}>
          <mesh position={[-0.38, 0.53, 0.006]}>
            <circleGeometry args={[0.07, 24]} />
            <meshBasicMaterial color={INDIGO} transparent opacity={0.5} depthWrite={false} />
          </mesh>
          <Bars bars={RESUME_BARS} />
        </GlassCard>
      </group>

      {/* Signal paths resume -> fan. */}
      {tubeGeos.inPaths.map((geo, i) => (
        <mesh key={`in-${i}`} geometry={geo}>
          <meshBasicMaterial color={[INDIGO, INDIGO_SOFT, SKY][i % 3]} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}

      {/* Tailor paths (one per cycling card; opacity follows the highlight). */}
      {tubeGeos.outPaths.map((geo, i) => (
        <mesh key={`out-${i}`} geometry={geo}>
          <meshBasicMaterial
            ref={(m: MaterialLike | null) => {
              outTubeMats.current[i] = m;
            }}
            color={INDIGO}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Flowing signal particles. */}
      {particles.map((def, i) => (
        <mesh
          key={`p-${i}`}
          geometry={particleGeo}
          material={def.sky ? particleMatSky : particleMatIndigo}
          ref={(el: TransformLike | null) => {
            particleEls.current[i] = el;
          }}
        />
      ))}

      {/* Fan of five mini job cards. */}
      {FAN.map((c, i) => {
        const cycleIdx = (CYCLE_CARDS as readonly number[]).indexOf(i);
        const cycling = cycleIdx !== -1;
        return (
          <group
            key={`card-${i}`}
            position={[c.x, c.y, c.z]}
            rotation={[i === 0 ? -0.04 : i === 4 ? 0.04 : 0, 0, 0]}
            ref={(g: TransformLike | null) => {
              cardGroups.current[i] = g;
            }}
          >
            {cycling && (
              <>
                {/* Soft indigo halo behind the highlighted card. */}
                <mesh position={[0, 0, -0.03]} scale={[CARD_W * 2.4, CARD_H * 2.8, 1]}>
                  <planeGeometry args={[1, 1]} />
                  <meshBasicMaterial
                    ref={(m: MaterialLike | null) => {
                      glowMats.current[cycleIdx] = m;
                    }}
                    map={glowTex}
                    transparent
                    opacity={0}
                    depthWrite={false}
                  />
                </mesh>
                {/* Indigo glow edge. */}
                <mesh position={[0, 0, -0.007]}>
                  <shapeGeometry args={[highlightFrame]} />
                  <meshBasicMaterial
                    ref={(m: MaterialLike | null) => {
                      highlightMats.current[cycleIdx] = m;
                    }}
                    color={INDIGO_SOFT}
                    transparent
                    opacity={0}
                    depthWrite={false}
                  />
                </mesh>
              </>
            )}
            <GlassCard w={CARD_W} h={CARD_H} r={0.06} bodyOpacity={0.86}>
              <mesh position={[-0.21, 0.09, 0.006]}>
                <circleGeometry args={[0.045, 20]} />
                <meshBasicMaterial color={INDIGO_SOFT} transparent opacity={0.4} depthWrite={false} />
              </mesh>
              <Bars bars={miniCardBars(cycling)} />
              {cycling && (
                <mesh position={[0.17, -0.03, 0.01]} material={ringMats[cycleIdx]}>
                  <planeGeometry args={[0.24, 0.24]} />
                </mesh>
              )}
            </GlassCard>
          </group>
        );
      })}

      {/* Tailored resume card + integrity check. */}
      <group position={TAILOR_POS}>
        <GlassCard w={TAILOR_W} h={TAILOR_H} r={0.075}>
          <Bars bars={TAILOR_BARS} />
        </GlassCard>
        <group position={[TAILOR_W / 2 - 0.06, TAILOR_H / 2 - 0.04, 0.02]}>
          <mesh>
            <circleGeometry args={[0.15, 24]} />
            <meshBasicMaterial
              ref={(m: MaterialLike | null) => {
                checkHaloMat.current = m;
              }}
              color={GREEN}
              transparent
              opacity={0.14}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0, 0.004]}>
            <circleGeometry args={[0.085, 24]} />
            <meshBasicMaterial
              ref={(m: MaterialLike | null) => {
                checkMat.current = m;
              }}
              color={GREEN}
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </mesh>
          {/* Check glyph: two white strokes. */}
          <mesh position={[-0.028, -0.01, 0.008]} rotation={[0, 0, 0.785]}>
            <planeGeometry args={[0.016, 0.052]} />
            <meshBasicMaterial color="#ffffff" depthWrite={false} />
          </mesh>
          <mesh position={[0.016, 0.002, 0.008]} rotation={[0, 0, -0.6]}>
            <planeGeometry args={[0.016, 0.094]} />
            <meshBasicMaterial color="#ffffff" depthWrite={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Canvas shell                                                        */
/* ------------------------------------------------------------------ */

export interface SignalSceneProps {
  className?: string;
  /** Fires once the GL context exists - the host crossfades the fallback. */
  onReady?: () => void;
}

export default function SignalScene({ className, onReady }: SignalSceneProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<PointerState>({ x: 0, y: 0, active: 0 });
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden);

  // Render only while the stage is on-screen and the tab is foreground.
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

  // Pointer tracked at window level against the wrapper rect, so the lean
  // stays smooth even though the canvas itself is pointer-events-none.
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
    <div ref={wrapRef} className={cn('pointer-events-none h-full w-full', className)}>
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop={running ? 'always' : 'never'}
        camera={{ position: [0, 0, 7], fov: 40, near: 0.1, far: 30 }}
        onCreated={() => onReady?.()}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.95} />
        <directionalLight position={[2.5, 3.5, 4.5]} intensity={0.9} color="#eef0ff" />
        <Tableau pointer={pointer} />
      </Canvas>
    </div>
  );
}
