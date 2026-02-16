"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Torus, Sphere } from "@react-three/drei";
import type { Group } from "three";
import SceneCanvas from "./SceneCanvas";

function ChainLink() {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const speed = hovered ? 0.006 : 0.004;
    groupRef.current.rotation.y += speed;
    groupRef.current.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.03;
  });

  return (
    <group
      ref={groupRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Ring 1 */}
      <Torus
        args={[0.5, 0.12, 16, 32]}
        position={[-0.22, 0, 0]}
        rotation={[Math.PI / 2, 0, 0.3]}
      >
        <meshStandardMaterial
          color="#FD79A8"
          metalness={0.5}
          roughness={0.15}
        />
      </Torus>

      {/* Ring 2 */}
      <Torus
        args={[0.5, 0.12, 16, 32]}
        position={[0.22, 0, 0]}
        rotation={[Math.PI / 2, 0, -0.3]}
      >
        <meshStandardMaterial
          color="#FF8FB1"
          metalness={0.5}
          roughness={0.15}
        />
      </Torus>

      {/* Connection dot */}
      <Sphere args={[0.07, 12, 12]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#E84393"
          metalness={0.3}
          roughness={0.25}
        />
      </Sphere>
    </group>
  );
}

export default function FeatureShareScene() {
  return (
    <SceneCanvas className="w-full h-full" cameraPosition={[0, 0, 3]} cameraFov={40}>
      <ChainLink />
    </SceneCanvas>
  );
}
