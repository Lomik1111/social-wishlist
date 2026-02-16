"use client";

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Icosahedron, Octahedron, Box } from "@react-three/drei";
import type { Group, Mesh } from "three";
import SceneCanvas from "./SceneCanvas";

const CONFETTI_COLORS = ["#FDCB6E", "#FFEAA7", "#FD79A8", "#A29BFE", "#55EFC4", "#6C5CE7"];

interface ConfettiPiece {
  color: string;
  radius: number;
  speed: number;
  offset: number;
  yBob: number;
  scale: number;
  shape: "oct" | "box";
}

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    radius: 0.65 + Math.random() * 0.2,
    speed: 0.5 + Math.random() * 0.4,
    offset: (i / count) * Math.PI * 2,
    yBob: (Math.random() - 0.5) * 0.3,
    scale: 0.05 + Math.random() * 0.04,
    shape: Math.random() > 0.5 ? "oct" : "box",
  }));
}

function ConfettiPieceComponent({ data, hovered }: { data: ConfettiPiece; hovered: boolean }) {
  const ref = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * data.speed + data.offset;
    const r = data.radius * (hovered ? 1.2 : 1);
    ref.current.position.x = Math.cos(t) * r;
    ref.current.position.z = Math.sin(t) * r;
    ref.current.position.y = data.yBob + Math.sin(t * 2) * 0.08;
    ref.current.rotation.x += 0.02;
    ref.current.rotation.z += 0.015;
  });

  const ShapeComponent = data.shape === "oct" ? Octahedron : Box;
  const args: [number, number?] | [number, number, number] =
    data.shape === "oct" ? [data.scale, 0] : [data.scale, data.scale, data.scale];

  return (
    <ShapeComponent ref={ref} args={args as never}>
      <meshStandardMaterial color={data.color} metalness={0.5} roughness={0.15} />
    </ShapeComponent>
  );
}

function ConfettiBurst() {
  const groupRef = useRef<Group>(null);
  const starRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const confetti = useMemo(() => generateConfetti(7), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const speed = hovered ? 0.006 : 0.004;
    groupRef.current.rotation.y += speed;

    if (starRef.current) {
      starRef.current.rotation.x += 0.005;
      starRef.current.rotation.z += 0.003;
      const s = 1 + Math.sin(clock.elapsedTime * 2) * 0.05;
      starRef.current.scale.setScalar(s);
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Central star */}
      <Icosahedron ref={starRef} args={[0.32, 0]}>
        <meshStandardMaterial
          color="#FDCB6E"
          metalness={0.6}
          roughness={0.1}
          emissive="#FDCB6E"
          emissiveIntensity={0.1}
        />
      </Icosahedron>

      {/* Orbiting confetti */}
      {confetti.map((c, i) => (
        <ConfettiPieceComponent key={i} data={c} hovered={hovered} />
      ))}
    </group>
  );
}

export default function FeatureConfettiScene() {
  return (
    <SceneCanvas className="w-full h-full" cameraPosition={[0, 0, 2.8]} cameraFov={40}>
      <ConfettiBurst />
    </SceneCanvas>
  );
}
