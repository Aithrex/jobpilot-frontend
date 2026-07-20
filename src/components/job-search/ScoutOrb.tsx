import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import type { Group } from 'three';

/**
 * A slowly rotating faceted "scout" orb — the app's 3D signature moment,
 * reserved for a hero-tier empty state (not list chrome). Lazy-loaded so the
 * three.js bundle only ships where it renders. Under reduced motion the loop
 * runs on demand (a single static frame).
 */
function Scene({ animate }: { animate: boolean }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!animate || !group.current) return;
    group.current.rotation.y += delta * 0.3;
    group.current.rotation.x += delta * 0.1;
  });
  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial color="#8b5cf6" wireframe emissive="#6366f1" emissiveIntensity={0.5} roughness={0.4} />
      </mesh>
      <mesh scale={0.62}>
        <icosahedronGeometry args={[1.3, 0]} />
        <meshStandardMaterial color="#a78bfa" emissive="#7c3aed" emissiveIntensity={0.6} roughness={0.3} metalness={0.25} />
      </mesh>
    </group>
  );
}

export default function ScoutOrb() {
  const reduce = useReducedMotion() ?? false;
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      dpr={[1, 2]}
      frameloop={reduce ? 'demand' : 'always'}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 3, 4]} intensity={1.4} color="#c4b5fd" />
      <pointLight position={[-3, -2, -2]} intensity={0.6} color="#818cf8" />
      <Scene animate={!reduce} />
    </Canvas>
  );
}
