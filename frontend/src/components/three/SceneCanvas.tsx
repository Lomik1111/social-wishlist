"use client";

import { Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";

interface SceneCanvasProps {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#f0ecff" />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} color="#fde8f0" />
    </>
  );
}

export default function SceneCanvas({
  children,
  className = "",
  fallback,
  cameraPosition = [0, 0, 6],
  cameraFov = 45,
}: SceneCanvasProps) {
  return (
    <div className={`three-canvas-container ${className}`}>
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        camera={{ position: cameraPosition, fov: cameraFov }}
        style={{ background: "transparent" }}
      >
        <Lights />
        <Environment preset="city" environmentIntensity={0.4} />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
      {/* Static fallback shown while Canvas/Three.js loads */}
      {fallback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0">
          {fallback}
        </div>
      )}
    </div>
  );
}
