'use client';

import { useRef, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFrame } from '@react-three/fiber';
import { Points } from '@react-three/drei';
import { SceneContainer } from './SceneContainer';

interface TrafficParticlesSceneProps {
  particleCount?: number;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function generatePositions(count: number) {
  const pos = new Float32Array(count * 3);
  const base = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = (seededRandom(i * 3) - 0.5) * 8;
    const y = (seededRandom(i * 3 + 1) - 0.5) * 8;
    const z = (seededRandom(i * 3 + 2) - 0.5) * 8;

    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;

    base[i * 3] = x;
    base[i * 3 + 1] = y;
    base[i * 3 + 2] = z;
  }

  return { pos, base };
}

export function TrafficParticlesScene({ particleCount = 200 }: TrafficParticlesSceneProps) {
  const positionsRef = useRef<Float32Array | null>(null);
  const basePositionsRef = useRef<Float32Array | null>(null);

  const { positions, basePositions } = useMemo(() => {
    const { pos, base } = generatePositions(particleCount);
    return { positions: pos, basePositions: base };
  }, [particleCount]);

  useEffect(() => {
    positionsRef.current = positions;
    basePositionsRef.current = basePositions;
  }, [positions, basePositions]);

  useFrame((state) => {
    const pos = positionsRef.current;
    const base = basePositionsRef.current;
    if (!pos || !base) return;

    const time = state.clock.elapsedTime;
    const count = pos.length / 3;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3 + 1] += 0.002;

      if (pos[i3 + 1] > 4) {
        pos[i3 + 1] = -4;
      }

      const speed = 0.3 + (i % 5) * 0.1;
      pos[i3] = base[i3] + Math.sin(time * speed) * 0.15;
      pos[i3 + 2] = base[i3 + 2] + Math.cos(time * speed * 0.7) * 0.15;
    }
  });

  return (
    <Points positions={positions} stride={3}>
      <pointsMaterial
        size={0.03}
        color="#0ea5e9"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </Points>
  );
}

function TrafficParticlesWrapped(props: TrafficParticlesSceneProps) {
  return (
    <SceneContainer>
      <TrafficParticlesScene {...props} />
    </SceneContainer>
  );
}

const TrafficParticles = dynamic(
  () => import('./TrafficParticles').then((m) => ({ default: m.TrafficParticlesWrapped })),
  {
    ssr: false,
    loading: () => <div style={{ width: '100%', height: '100%', minHeight: 300 }} />,
  }
);

export default TrafficParticles;
export { TrafficParticlesWrapped };