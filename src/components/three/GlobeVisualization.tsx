'use client';

import { Suspense, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useFrame } from '@react-three/fiber';
import { Line, Points } from '@react-three/drei';
import * as THREE from 'three';
import { SceneContainer } from './SceneContainer';

const RADIUS = 1.8;
const POINT_COUNT = 1500;

function fibonacciSphere(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const angleIncrement = Math.PI * 2 * goldenRatio;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const inclination = Math.acos(1 - 2 * t);
    const azimuth = angleIncrement * i;

    const x = radius * Math.sin(inclination) * Math.cos(azimuth);
    const y = radius * Math.sin(inclination) * Math.sin(azimuth);
    const z = radius * Math.cos(inclination);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
}

function randomPointOnSphere(radius: number): [number, number, number] {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  ];
}

function slerpPoints(
  start: [number, number, number],
  end: [number, number, number],
  segments: number
): [number, number, number][] {
  const points: [number, number, number][] = [];
  const v0 = new THREE.Vector3(...start);
  const v1 = new THREE.Vector3(...end);
  const angle = v0.angleTo(v1);

  if (angle < 0.001) {
    return [start, end];
  }

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const s = Math.sin((1 - t) * angle) / Math.sin(angle);
    const e = Math.sin(t * angle) / Math.sin(angle);
    const p = new THREE.Vector3()
      .addScaledVector(v0, s)
      .addScaledVector(v1, e);
    points.push([p.x, p.y, p.z]);
  }

  return points;
}

const startColor = new THREE.Color('#6366f1');
const endColor = new THREE.Color('#22c55e');

function createArcLineData(radius: number, count: number) {
  const arcs: { points: [number, number, number][]; colors: [number, number, number][] }[] = [];

  for (let i = 0; i < count; i++) {
    const start = randomPointOnSphere(radius);
    const end = randomPointOnSphere(radius);
    const points = slerpPoints(start, end, 32);

    const colors: [number, number, number][] = points.map((_, idx) => {
      const t = idx / (points.length - 1);
      const c = new THREE.Color().lerpColors(startColor, endColor, t);
      return [c.r, c.g, c.b];
    });

    arcs.push({ points, colors });
  }

  return arcs;
}

const arcData = createArcLineData(RADIUS, 4);

export function Globe() {
  const groupRef = useRef<THREE.Group>(null);
  const arcRefs = useRef<(THREE.Object3D | null)[]>([]);
  const pointPositions = useMemo(() => fibonacciSphere(POINT_COUNT, RADIUS), []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
    const offset = -state.clock.elapsedTime * 0.3;
    arcRefs.current.forEach((line) => {
       
      const mat = (line as any)?.material;
      if (mat) {
        mat.dashOffset = offset;
      }
    });
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[RADIUS, 2]} />
        <meshBasicMaterial
          color="#6366f1"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
      <Points positions={pointPositions} stride={3}>
        <pointsMaterial
          size={0.015}
          color="#8888ff"
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </Points>
      {arcData.map((arc, i) => (
        <Line
          key={i}
          ref={(el) => {
            arcRefs.current[i] = el;
          }}
          points={arc.points}
          vertexColors={arc.colors}
          color="#ffffff"
          lineWidth={0.5}
          dashed
          dashScale={20}
          dashSize={0.5}
          gapSize={0.3}
        />
      ))}
    </group>
  );
}

export function GlobeScene() {
  return (
    <SceneContainer enableOrbit>
      <Suspense fallback={<div style={{ width: '100%', height: '100%', minHeight: 300 }} />}>
        <Globe />
      </Suspense>
    </SceneContainer>
  );
}

const GlobeVisualization = dynamic(
  () => import('./GlobeVisualization').then((m) => ({ default: m.GlobeScene })),
  {
    ssr: false,
    loading: () => <div style={{ width: '100%', height: '100%', minHeight: 300 }} />,
  }
);

export default GlobeVisualization;
