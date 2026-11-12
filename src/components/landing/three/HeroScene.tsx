import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Lightformer, PerformanceMonitor, RoundedBox } from '@react-three/drei';
import { parseTriplet, type StagePalette } from './palette';

/**
 * THE ONLY MODULE THAT IMPORTS three / fiber / drei. It is reached through a
 * dynamic import from `HeroStage`, so none of it is in the eager landing
 * chunk, and it loads only after `load` + idle, with WebGL available and no
 * reduced-motion preference.
 *
 * The scene is a studio product shot, built to read like a Blender render:
 *
 *  - one resume sheet (paper with a soft sheen) and three job cards
 *    (clearcoated clay, the top one in the plum accent), all fictional:
 *    bars and tiles, no words, no companies, no numbers;
 *  - lit ONLY by an environment baked from Lightformers (a key softbox, two
 *    rim strips and a highlight ring) through PMREM, in this file. drei's
 *    `<Environment>` is deliberately not used: its loader pulls the HDR/EXR
 *    and gain-map decoders into the chunk and carries the preset CDN URL, and
 *    nothing here may fetch at runtime;
 *  - AgX tone mapping (Blender's default view transform since 4.0), set in
 *    the `gl` config, which fiber 8 applies AFTER its ACES default, and
 *    re-asserted in `onCreated`; the wrapper reports what actually stuck;
 *  - one soft contact shadow on an invisible floor.
 *
 * Motion: a slow camera orbit plus a loop in which the cards fold back into
 * the sheet and split out again, so the first frame equals the poster. It
 * runs only while `active` (on screen, tab visible, not paused); otherwise the
 * frameloop drops to `demand` and the last frame simply stays.
 */

const LOOP_S = 12;
const ORBIT_PERIOD_S = 26;
const ORBIT_AMPLITUDE = 0.2;
const CAMERA_RADIUS = 9.6;
const CAMERA_HEIGHT = 1.35;
const TARGET = new THREE.Vector3(0.25, -0.15, 0);

function color(triplet: string, saturate = 1, lighten = 1) {
  const [h, s, l] = parseTriplet(triplet);
  return new THREE.Color().setHSL(h, Math.min(1, s * saturate), Math.min(1, l * lighten));
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/**
 * How split the composition is at time `e` (1 = cards out, as in the
 * poster). Holds split, folds in, holds, splits out again.
 */
function splitAt(e: number, delay: number): number {
  const t = (e % LOOP_S) - delay;
  if (t < 6.5) return 1;
  if (t < 7.7) return 1 - easeInOut(clamp01((t - 6.5) / 1.2));
  if (t < 8.4) return 0;
  return easeInOut(clamp01((t - 8.4) / 1.6));
}

interface Materials {
  paper: THREE.MeshPhysicalMaterial;
  ink: THREE.MeshStandardMaterial;
  line: THREE.MeshStandardMaterial;
  accent: THREE.MeshPhysicalMaterial;
  card: THREE.MeshPhysicalMaterial;
  cardLine: THREE.MeshStandardMaterial;
  onAccent: THREE.MeshStandardMaterial;
  tile: THREE.MeshStandardMaterial;
}

function useMaterials(p: StagePalette): Materials {
  const mats = useMemo<Materials>(() => {
    const dark = p.theme === 'dark';
    return {
      paper: new THREE.MeshPhysicalMaterial({
        color: color(p.paper),
        roughness: 0.62,
        sheen: 0.5,
        sheenRoughness: 0.8,
        sheenColor: new THREE.Color(1, 1, 1),
      }),
      ink: new THREE.MeshStandardMaterial({ color: color(p.paperInk), roughness: 0.85 }),
      line: new THREE.MeshStandardMaterial({ color: color(p.paperLine), roughness: 0.9 }),
      // Lit under a bright studio and AgX, a token colour renders lighter and
      // paler than the same token as a flat CSS fill. The plum is pre-darkened
      // and pre-saturated so the lit card reads as the same plum as the DOM
      // button beside it, judged by eye in both themes.
      accent: new THREE.MeshPhysicalMaterial({
        color: color(p.accent, dark ? 1.3 : 1.5, dark ? 0.9 : 0.42),
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.07,
      }),
      card: new THREE.MeshPhysicalMaterial({
        color: color(p.card, 1, dark ? 0.5 : 1),
        roughness: dark ? 0.42 : 0.4,
        clearcoat: 0.8,
        clearcoatRoughness: 0.12,
      }),
      cardLine: new THREE.MeshStandardMaterial({ color: color(p.cardLine), roughness: 0.9 }),
      onAccent: new THREE.MeshStandardMaterial({ color: color(p.onAccent), roughness: 0.7 }),
      tile: new THREE.MeshStandardMaterial({ color: color(p.tile), roughness: 0.55 }),
    };
  }, [p]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

/** Lightformer studio baked into `scene.environment` once per theme. */
function StudioEnvironment({ theme }: { theme: 'light' | 'dark' }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const envScene = useMemo(() => new THREE.Scene(), []);
  const dark = theme === 'dark';

  useEffect(() => {
    // The studio walls: a dim grey on light, near-black on dark, so the
    // Lightformers do the shaping and the fill never washes the objects flat.
    envScene.background = new THREE.Color().setHSL(240 / 360, 0.06, dark ? 0.05 : 0.42);
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(envScene, 0.035);
    scene.environment = target.texture;
    invalidate();
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, envScene, dark, invalidate]);

  return createPortal(
    <>
      {/* Key softbox above and in front. */}
      <Lightformer form="rect" intensity={dark ? 2.2 : 3} position={[0, 5, 4]} scale={[9, 2.5, 1]} target={[0, 0, 0]} />
      {/* Two rim strips: what draws the glossy edges on a dark stage. */}
      <Lightformer form="rect" intensity={dark ? 2.6 : 1.4} position={[-6, 1, -2]} scale={[1.2, 7, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={dark ? 2.2 : 1.2} position={[6, 1.5, -1]} scale={[1.2, 7, 1]} target={[0, 0, 0]} />
      {/* A low fill so the undersides are not black. */}
      <Lightformer form="rect" intensity={dark ? 0.35 : 0.8} position={[0, -4, 3]} scale={[8, 1.5, 1]} target={[0, 0, 0]} />
      {/* Ring for a round specular highlight on the clearcoat. */}
      <Lightformer form="ring" intensity={dark ? 1.4 : 1} position={[2, 3, 6]} scale={2.2} target={[0, 0, 0]} />
    </>,
    envScene,
  );
}

function Bar({
  w,
  h = 0.05,
  x,
  y,
  z,
  material,
}: {
  w: number;
  h?: number;
  x: number;
  y: number;
  z: number;
  material: THREE.Material;
}) {
  return (
    <RoundedBox
      args={[w, h, 0.016]}
      radius={Math.min(h / 2, 0.06) * 0.95}
      smoothness={3}
      position={[x + w / 2, y, z]}
      material={material}
    />
  );
}

const SHEET_W = 2.4;
const SHEET_H = 3.1;
const FRONT = 0.026;

function ResumeSheet({ m }: { m: Materials }) {
  const left = -SHEET_W / 2 + 0.24;
  const body: Array<[number, number]> = [];
  [1.92, 1.66, 1.82, 1.24].forEach((w, i) => body.push([w, 0.38 - i * 0.16]));
  [1.88, 1.58, 1.74, 1.08].forEach((w, i) => body.push([w, -0.4 - i * 0.16]));
  return (
    <group position={[-1.1, 0.05, 0]} rotation={[-0.06, 0.42, 0.01]}>
      <RoundedBox args={[SHEET_W, SHEET_H, 0.035]} radius={0.05} smoothness={4} material={m.paper} />
      {/* Header: the name, the target role in the accent, contact lines. */}
      <Bar w={1.05} h={0.13} x={left} y={1.2} z={FRONT} material={m.ink} />
      <Bar w={0.62} h={0.07} x={left} y={0.99} z={FRONT} material={m.accent} />
      <Bar w={0.5} x={0.46} y={1.24} z={FRONT} material={m.line} />
      <Bar w={0.42} x={0.54} y={1.1} z={FRONT} material={m.line} />
      <Bar w={SHEET_W - 0.48} h={0.014} x={left} y={0.78} z={FRONT} material={m.line} />
      <Bar w={0.44} h={0.065} x={left} y={0.58} z={FRONT} material={m.ink} />
      <Bar w={0.4} h={0.065} x={left} y={-0.2} z={FRONT} material={m.ink} />
      {body.map(([w, y]) => (
        <Bar key={y} w={w} x={left} y={y} z={FRONT} material={m.line} />
      ))}
      {/* Skills: the row the matched cards fold out of. */}
      {[0, 1, 2].map((i) => (
        <Bar key={i} w={0.46} h={0.13} x={left + i * 0.56} y={-1.2} z={FRONT} material={m.tile} />
      ))}
    </group>
  );
}

const CARD_W = 2.05;
const CARD_H = 1.08;

function JobCard({ m, accent }: { m: Materials; accent: boolean }) {
  const face = accent ? m.accent : m.card;
  const lines = accent ? m.onAccent : m.cardLine;
  const left = -CARD_W / 2 + 0.2;
  return (
    <group>
      <RoundedBox args={[CARD_W, CARD_H, 0.07]} radius={0.1} smoothness={4} material={face} />
      <RoundedBox
        args={[0.34, 0.34, 0.04]}
        radius={0.08}
        smoothness={3}
        position={[left + 0.17, 0.2, 0.05]}
        material={accent ? m.onAccent : m.tile}
      />
      <Bar w={0.98} h={0.085} x={left + 0.48} y={0.27} z={0.045} material={lines} />
      <Bar w={0.62} x={left + 0.48} y={0.11} z={0.045} material={lines} />
      <Bar w={0.4} h={0.11} x={left} y={-0.28} z={0.045} material={lines} />
      <Bar w={0.4} h={0.11} x={left + 0.48} y={-0.28} z={0.045} material={lines} />
    </group>
  );
}

/** Where each card sits when split (the poster) and when folded in. */
const CARD_OUT = [
  { p: [1.45, 1.12, 0.62], r: [-0.06, -0.4, 0.04] },
  { p: [1.85, -0.02, 0.2], r: [-0.06, -0.46, -0.015] },
  { p: [1.5, -1.16, -0.22], r: [-0.06, -0.38, 0.03] },
] as const;
const CARD_IN = { p: [-1.0, -1.05, -0.14], r: [-0.06, 0.42, 0], s: 0.42 } as const;

function Composition({
  m,
  active,
  elapsed,
}: {
  m: Materials;
  active: boolean;
  elapsed: MutableRefObject<number>;
}) {
  const cards = useRef<Array<THREE.Group | null>>([]);
  const camera = useThree((s) => s.camera);

  const place = (e: number) => {
    cards.current.forEach((g, i) => {
      if (!g) return;
      const k = splitAt(e, i * 0.18);
      const out = CARD_OUT[i];
      g.position.set(
        THREE.MathUtils.lerp(CARD_IN.p[0], out.p[0], k),
        THREE.MathUtils.lerp(CARD_IN.p[1] + i * 0.04, out.p[1], k),
        THREE.MathUtils.lerp(CARD_IN.p[2], out.p[2], k),
      );
      g.rotation.set(
        THREE.MathUtils.lerp(CARD_IN.r[0], out.r[0], k),
        THREE.MathUtils.lerp(CARD_IN.r[1], out.r[1], k),
        THREE.MathUtils.lerp(CARD_IN.r[2], out.r[2], k),
      );
      g.scale.setScalar(THREE.MathUtils.lerp(CARD_IN.s, 1, k));
    });
    const a = Math.sin((e / ORBIT_PERIOD_S) * Math.PI * 2) * ORBIT_AMPLITUDE;
    camera.position.set(TARGET.x + Math.sin(a) * CAMERA_RADIUS, CAMERA_HEIGHT, Math.cos(a) * CAMERA_RADIUS);
    camera.lookAt(TARGET);
  };

  // Paint the poster pose before the first frame, so the fade-in is seamless.
  useLayoutEffect(() => {
    place(elapsed.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    if (!active) return;
    // Clamp the step so a background tab coming back does not jump the loop.
    elapsed.current += Math.min(delta, 1 / 20);
    place(elapsed.current);
  });

  return (
    <group>
      <ResumeSheet m={m} />
      {CARD_OUT.map((_, i) => (
        <group key={i} ref={(g) => (cards.current[i] = g)}>
          <JobCard m={m} accent={i === 0} />
        </group>
      ))}
    </group>
  );
}

function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    // After this frame has been submitted, not during it.
    requestAnimationFrame(onReady);
  });
  return null;
}

function Repaint({ palette }: { palette: StagePalette }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [palette, invalidate]);
  return null;
}

export interface HeroSceneProps {
  palette: StagePalette;
  /** On screen, tab visible and not paused. */
  active: boolean;
  label: string;
  onReady: () => void;
  /** Reports the renderer's tone mapping after creation ('agx' expected). */
  onToneMapping?: (name: string) => void;
}

export default function HeroScene({ palette, active, label, onReady, onToneMapping }: HeroSceneProps) {
  const m = useMaterials(palette);
  const elapsed = useRef(0);
  const [dpr, setDpr] = useState<number | [number, number]>([1, 1.75]);
  const dark = palette.theme === 'dark';
  // Memoised: ContactShadows rebuilds its materials whenever `color` changes
  // identity, so a fresh Color per render would rebuild them every render.
  const shadowColor = useMemo(() => color(palette.shadow), [palette.shadow]);

  return (
    <Canvas
      dpr={dpr}
      frameloop={active ? 'always' : 'demand'}
      camera={{ position: [TARGET.x, CAMERA_HEIGHT, CAMERA_RADIUS], fov: 30, near: 0.1, far: 60 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'default',
        toneMapping: THREE.AgXToneMapping,
        toneMappingExposure: dark ? 1.15 : 1.3,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.AgXToneMapping;
        gl.setClearColor(0x000000, 0);
        const el = gl.domElement as HTMLCanvasElement;
        el.setAttribute('role', 'img');
        el.setAttribute('aria-label', label);
        el.tabIndex = -1;
        onToneMapping?.(gl.toneMapping === THREE.AgXToneMapping ? 'agx' : String(gl.toneMapping));
      }}
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr([1, 1.75])}
        onFallback={() => setDpr(1)}
      />
      <StudioEnvironment theme={palette.theme} />
      {/* The environment gives reflections; these two give FORM. A soft
          ambient lift plus one key from the upper left, no shadow maps (the
          floor shadow is the contact shadow below). */}
      <ambientLight intensity={dark ? 0.35 : 0.7} />
      <directionalLight position={[-4, 6, 7]} intensity={dark ? 1.6 : 2.4} />
      <Repaint palette={palette} />
      <Composition m={m} active={active} elapsed={elapsed} />
      <ContactShadows
        position={[0.2, -2.05, 0]}
        scale={12}
        resolution={256}
        blur={2.6}
        far={3.2}
        opacity={dark ? 0.8 : 0.5}
        color={shadowColor}
      />
      <FirstFrame onReady={onReady} />
    </Canvas>
  );
}
