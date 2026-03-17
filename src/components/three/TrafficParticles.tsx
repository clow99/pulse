'use client';

import { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useFrame } from '@react-three/fiber';
import { Points } from '@react-three/drei';
import { SceneContainer } from './SceneContainer';

interface TrafficParticlesSceneProps {
  particleCount?: number;
}

export function TrafficParticlesScene({ particleCount = 200 }: TrafficParticlesSceneProps) {
  const positionsRef = useRef<Float32Array | null>(null);
  const basePositionsRef = useRef<Float32Array | null>(null);

  const positions = useMemo(() => {
    const count = particleCount;
    const pos = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 8;
      const y = (Math.random() - 0.5) * 8;
      const z = (Math.random() - 0.5) * 8;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      base[i * 3] = x;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = z;
    }

    positionsRef.current = pos;
    basePositionsRef.current = base;
    return pos;
  }, [particleCount]);

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
        color="#6366f1"
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