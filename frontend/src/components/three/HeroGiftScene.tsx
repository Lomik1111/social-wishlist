"use client";

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Sphere, Torus, Octahedron } from "@react-three/drei";
import type { Group } from "three";
import SceneCanvas from "./SceneCanvas";

/* ---------- sparkle orbit data ---------- */

interface SparkleData {
  radius: number;
  speed: number;
  offset: number;
  yOffset: number;
  scale: number;
}

function generateSparkles(count: number): SparkleData[] {
  return Array.from({ length: count }, (_, i) => ({
    radius: 1.8 + Math.random() * 0.6,
    speed: 0.4 + Math.random() * 0.3,
    offset: (i / count) * Math.PI * 2,
    yOffset: (Math.random() - 0.5) * 1.2,
    scale: 0.06 + Math.random() * 0.06,
  }));
}

/* ---------- Sparkle particle ---------- */

function Sparkle({ data }: { data: SparkleData }) {
  const ref = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * data.speed + data.offset;
    ref.current.position.x = Math.cos(t) * data.radius;
    ref.current.position.z = Math.sin(t) * data.radius;
    ref.current.position.y = data.yOffset + Math.sin(t * 2) * 0.15;
    ref.current.rotation.x = t * 2;
    ref.current.rotation.z = t * 1.5;
  });

  return (
    <group ref={ref}>
      <Octahedron args={[data.scale, 0]}>
        <meshStandardMaterial
          color="#FDCB6E"
          metalness={0.6}
          roughness={0.1}
          emissive="#FDCB6E"
          emissiveIntensity={0.15}
        />
      </Octahedron>
    </group>
  );
}

/* ---------- Gift Box group ---------- */

function GiftBox() {
  const groupRef = useRef<Group>(null);
  const lidRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const sparkles = useMemo(() => generateSparkles(7), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const speed = hovered ? 0.005 : 0.003;
    groupRef.current.rotation.y += speed;

    // Lid breathing
    if (lidRef.current) {
      lidRef.current.position.y =
        0.9 + Math.sin(clock.elapsedTime * 1.5) * 0.04;
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* --- Box body --- */}
      <Box args={[2, 1.5, 2]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#6C5CE7"
          metalness={0.15}
          roughness={0.3}
          emissive="#6C5CE7"
          emissiveIntensity={0.05}
        />
      </Box>

      {/* --- Lid --- */}
      <group ref={lidRef} position={[0, 0.9, 0]}>
        <Box args={[2.2, 0.3, 2.2]}>
          <meshStandardMaterial
            color="#7C6CF0"
            metalness={0.15}
            roughness={0.3}
          />
        </Box>
      </group>

      {/* --- Vertical ribbon (X axis) --- */}
      <Box args={[0.25, 2.1, 2.1]} position={[0, 0.15, 0]}>
        <meshStandardMaterial
          color="#FD79A8"
          metalness={0.3}
          roughness={0.2}
        />
      </Box>

      {/* --- Horizontal ribbon (Z axis) --- */}
      <Box args={[2.1, 0.25, 0.25]} position={[0, 0.15, 0]}>
        <meshStandardMaterial
          color="#FD79A8"
          metalness={0.3}
          roughness={0.2}
        />
      </Box>

      {/* --- Bow left loop --- */}
      <Torus
        args={[0.35, 0.1, 16, 32]}
        position={[-0.3, 1.35, 0]}
        rotation={[0.3, 0, -0.5]}
      >
        <meshStandardMaterial
          color="#FD79A8"
          metalness={0.4}
          roughness={0.15}
        />
      </Torus>

      {/* --- Bow right loop --- */}
      <Torus
        args={[0.35, 0.1, 16, 32]}
        position={[0.3, 1.35, 0]}
        rotation={[0.3, 0, 0.5]}
      >
        <meshStandardMaterial
          color="#FD79A8"
          metalness={0.4}
          roughness={0.15}
        />
      </Torus>

      {/* --- Bow knot --- */}
      <Sphere args={[0.15, 16, 16]} position={[0, 1.35, 0]}>
        <meshStandardMaterial
          color="#E84393"
          metalness={0.2}
          roughness={0.3}
        />
      </Sphere>

      {/* --- Orbiting sparkles --- */}
      {sparkles.map((s, i) => (
        <Sparkle key={i} data={s} />
      ))}
    </group>
  );
}

/* ---------- Exported scene ---------- */

export default function HeroGiftScene() {
  return (
    <SceneCanvas className="w-full h-full" cameraPosition={[0, 0.5, 6]} cameraFov={40}>
      <GiftBox />
    </SceneCanvas>
  );
}
