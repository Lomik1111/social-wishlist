"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Cylinder } from "@react-three/drei";
import type { Group } from "three";
import SceneCanvas from "./SceneCanvas";

/* Positions for 3 spheres in a triangle */
const POSITIONS: [number, number, number][] = [
  [0, 0.25, 0],      // top center (larger)
  [-0.42, -0.2, 0.15], // bottom left
  [0.42, -0.2, 0.15],  // bottom right
];

function UsersCluster() {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const speed = hovered ? 0.005 : 0.003;
    groupRef.current.rotation.y += speed;
  });

  /* Compute cylinder between two points */
  function ConnectionLine({
    from,
    to,
  }: {
    from: [number, number, number];
    to: [number, number, number];
  }) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const mx = (from[0] + to[0]) / 2;
    const my = (from[1] + to[1]) / 2;
    const mz = (from[2] + to[2]) / 2;

    const rx = Math.atan2(
      Math.sqrt(dx * dx + dz * dz),
      dy
    );
    const ry = Math.atan2(dx, dz);

    return (
      <Cylinder
        args={[0.015, 0.015, length, 6]}
        position={[mx, my, mz]}
        rotation={[rx, ry, 0]}
      >
        <meshStandardMaterial
          color="#00B894"
          transparent
          opacity={0.35}
        />
      </Cylinder>
    );
  }

  return (
    <group
      ref={groupRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Main sphere (larger) */}
      <Sphere args={[0.35, 24, 24]} position={POSITIONS[0]}>
        <meshStandardMaterial
          color="#00B894"
          metalness={0.2}
          roughness={0.3}
        />
      </Sphere>

      {/* Secondary spheres */}
      <Sphere args={[0.27, 24, 24]} position={POSITIONS[1]}>
        <meshStandardMaterial
          color="#55EFC4"
          metalness={0.15}
          roughness={0.4}
        />
      </Sphere>
      <Sphere args={[0.27, 24, 24]} position={POSITIONS[2]}>
        <meshStandardMaterial
          color="#55EFC4"
          metalness={0.15}
          roughness={0.4}
        />
      </Sphere>

      {/* Connection lines */}
      <ConnectionLine from={POSITIONS[0]} to={POSITIONS[1]} />
      <ConnectionLine from={POSITIONS[0]} to={POSITIONS[2]} />
      <ConnectionLine from={POSITIONS[1]} to={POSITIONS[2]} />
    </group>
  );
}

export default function FeatureUsersScene() {
  return (
    <SceneCanvas className="w-full h-full" cameraPosition={[0, 0, 2.8]} cameraFov={40}>
      <UsersCluster />
    </SceneCanvas>
  );
}
