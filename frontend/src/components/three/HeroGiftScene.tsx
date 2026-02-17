"use client";

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Sphere, Octahedron } from "@react-three/drei";
import type { Group } from "three";
import SceneCanvas from "./SceneCanvas";

/* --------- Sparkle orbit data --------- */

interface SparkleData {
  radius: number;
  speed: number;
  offset: number;
  yOffset: number;
  scale: number;
}

function generateSparkles(count: number): SparkleData[] {
  return Array.from({ length: count }, (_, i) => ({
    radius: 2.2 + Math.random() * 0.6,
    speed: 0.3 + Math.random() * 0.2,
    offset: (i / count) * Math.PI * 2,
    yOffset: (Math.random() - 0.5) * 1.2,
    scale: 0.05 + Math.random() * 0.04,
  }));
}

/* --------- Sparkle particle --------- */

function Sparkle({ data }: { data: SparkleData }) {
  const ref = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * data.speed + data.offset;
    ref.current.position.x = Math.cos(t) * data.radius;
    ref.current.position.z = Math.sin(t) * data.radius;
    ref.current.position.y = data.yOffset + Math.sin(t * 2) * 0.12;
    ref.current.rotation.x = t * 2;
    ref.current.rotation.z = t * 1.5;
  });

  return (
    <group ref={ref}>
      <Octahedron args={[data.scale, 0]}>
        <meshStandardMaterial
          color="#FDCB6E"
          metalness={0.7}
          roughness={0.1}
          emissive="#FDCB6E"
          emissiveIntensity={0.3}
        />
      </Octahedron>
    </group>
  );
}

/* --------- Bow loop (elegant ribbon loop using scaled sphere) --------- */

function BowLoop({
  position,
  rotation,
  color,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
}) {
  return (
    <Sphere args={[1, 24, 16]} position={position} rotation={rotation} scale={[0.22, 0.14, 0.08]}>
      <meshStandardMaterial
        color={color}
        metalness={0.2}
        roughness={0.25}
        emissive={color}
        emissiveIntensity={0.05}
      />
    </Sphere>
  );
}

/* --------- Gift Box --------- */

const BOX_W = 1.7;
const BOX_H = 1.2;
const BOX_D = 1.7;
const LID_H = 0.24;
const LID_OVER = 0.06; // overhang on each side
const RIBBON_W = 0.18; // ribbon width

function GiftBox() {
  const groupRef = useRef<Group>(null);
  const lidRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const sparkles = useMemo(() => generateSparkles(6), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += hovered ? 0.006 : 0.003;

    if (lidRef.current) {
      lidRef.current.position.y =
        BOX_H / 2 + LID_H / 2 + 0.015 + Math.sin(clock.elapsedTime * 1.2) * 0.025;
    }
  });

  const bodyColor = "#8B5CF6";
  const lidColor = "#A78BFA";
  const ribbonColor = "#F472B6";
  const bowColor = "#EC4899";
  const bowKnotColor = "#DB2777";

  const lidW = BOX_W + LID_OVER * 2;
  const lidD = BOX_D + LID_OVER * 2;
  const lidY = BOX_H / 2 + LID_H / 2 + 0.015;
  const bowY = lidY + LID_H / 2 + 0.1;

  return (
    <group
      ref={groupRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* ===== Box body ===== */}
      <RoundedBox args={[BOX_W, BOX_H, BOX_D]} radius={0.08} smoothness={4}>
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.05}
          roughness={0.5}
          emissive="#7C3AED"
          emissiveIntensity={0.04}
        />
      </RoundedBox>

      {/* ===== Ribbon on body — cross strips (thin, on surface) ===== */}
      {/* Front-to-back strip */}
      <RoundedBox
        args={[RIBBON_W, BOX_H + 0.005, BOX_D + 0.02]}
        radius={0.01}
        smoothness={2}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial color={ribbonColor} metalness={0.15} roughness={0.3} />
      </RoundedBox>
      {/* Left-to-right strip */}
      <RoundedBox
        args={[BOX_W + 0.02, BOX_H + 0.005, RIBBON_W]}
        radius={0.01}
        smoothness={2}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial color={ribbonColor} metalness={0.15} roughness={0.3} />
      </RoundedBox>

      {/* ===== Lid ===== */}
      <group ref={lidRef} position={[0, lidY, 0]}>
        <RoundedBox args={[lidW, LID_H, lidD]} radius={0.06} smoothness={4}>
          <meshStandardMaterial
            color={lidColor}
            metalness={0.05}
            roughness={0.45}
          />
        </RoundedBox>

        {/* Ribbon on lid — front-to-back */}
        <RoundedBox
          args={[RIBBON_W, LID_H + 0.005, lidD + 0.01]}
          radius={0.01}
          smoothness={2}
        >
          <meshStandardMaterial color={ribbonColor} metalness={0.15} roughness={0.3} />
        </RoundedBox>
        {/* Ribbon on lid — left-to-right */}
        <RoundedBox
          args={[lidW + 0.01, LID_H + 0.005, RIBBON_W]}
          radius={0.01}
          smoothness={2}
        >
          <meshStandardMaterial color={ribbonColor} metalness={0.15} roughness={0.3} />
        </RoundedBox>
      </group>

      {/* ===== Bow ===== */}
      {/* Left loop */}
      <BowLoop
        position={[-0.2, bowY, 0]}
        rotation={[0, 0, 0.4]}
        color={bowColor}
      />
      {/* Right loop */}
      <BowLoop
        position={[0.2, bowY, 0]}
        rotation={[0, 0, -0.4]}
        color={bowColor}
      />
      {/* Center knot */}
      <Sphere args={[0.09, 16, 16]} position={[0, bowY, 0]}>
        <meshStandardMaterial
          color={bowKnotColor}
          metalness={0.15}
          roughness={0.3}
        />
      </Sphere>
      {/* Ribbon tails */}
      <RoundedBox
        args={[0.07, 0.22, 0.025]}
        radius={0.01}
        smoothness={2}
        position={[-0.09, bowY - 0.18, 0.025]}
        rotation={[0, 0, 0.26]}
      >
        <meshStandardMaterial color={bowColor} metalness={0.15} roughness={0.3} />
      </RoundedBox>
      <RoundedBox
        args={[0.07, 0.2, 0.025]}
        radius={0.01}
        smoothness={2}
        position={[0.09, bowY - 0.16, -0.025]}
        rotation={[0, 0, -0.23]}
      >
        <meshStandardMaterial color={bowColor} metalness={0.15} roughness={0.3} />
      </RoundedBox>

      {/* ===== Orbiting sparkles ===== */}
      {sparkles.map((s, i) => (
        <Sparkle key={i} data={s} />
      ))}
    </group>
  );
}

/* --------- Exported scene --------- */

export default function HeroGiftScene() {
  return (
    <SceneCanvas className="w-full h-full" cameraPosition={[0, 0.8, 5]} cameraFov={42}>
      <GiftBox />
    </SceneCanvas>
  );
}
