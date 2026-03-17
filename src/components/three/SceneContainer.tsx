'use client';

import type { CSSProperties } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

interface SceneContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  enableOrbit?: boolean;
}

export function SceneContainer({
  children,
  className,
  style,
  enableOrbit = false,
}: SceneContainerProps) {
  return (
    <div className={className} style={style}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{
          alpha: true,
          antialias: true,
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x0a0a0f, 0);
          scene.background = null;
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        {children}
        {enableOrbit && (
          <OrbitControls
            enableZoom={false}
            autoRotate
            autoRotateSpeed={0.5}
          />
        )}
      </Canvas>
    </div>
  );
}
