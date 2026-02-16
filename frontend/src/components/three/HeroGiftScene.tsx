"use client";

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Sphere, Torus, Octahedron } from "@react-three/drei";
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
    radius: 2.0 + Math.random() * 0.5,
    speed: 0.35 + Math.random() * 0.25,
    offset: (i / count) * Math.PI * 2,
    yOffset: (Math.random() - 0.5) * 1.4,
    scale: 0.06 + Math.random() * 0.05,
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
    ref.current.position.y = data.yOffset + Math.sin(t * 2) * 0.15;
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
          emissiveIntensity={0.2}
        />
      </Octahedron>
    </group>
  );
}

/* --------- Gift Box --------- */

const BOX_W = 1.8;
const BOX_H = 1.3;
const BOX_D = 1.8;
const LID_H = 0.25;
const LID_OVERHANG = 0.08;
const RIBBON_W = 0.22;

function GiftBox() {
  const groupRef = useRef<Group>(null);
  const lidRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const sparkles = useMemo(() => generateSparkles(6), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const speed = hovered ? 0.005 : 0.003;
    groupRef.current.rotation.y += speed;

    // Lid gentle breathing
    if (lidRef.current) {
      lidRef.current.position.y =
        BOX_H / 2 + LID_H / 2 + 0.01 + Math.sin(clock.elapsedTime * 1.5) * 0.035;
    }
  });

  const boxTop = BOX_H / 2; // top surface of box body
  const lidY = boxTop + LID_H / 2 + 0.01; // lid rests just above body
  const bowY = lidY + LID_H / 2 + 0.1; // bow sits on top of lid

  return (
    <group
      ref={groupRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* ---- Box body ---- */}
      <RoundedBox args={[BOX_W, BOX_H, BOX_D]} radius={0.06} smoothness={4}>
        <meshStandardMaterial
          color="#8B5CF6"
          metalness={0.08}
          roughness={0.45}
          emissive="#7C3AED"
          emissiveIntensity={0.06}
        />
      </RoundedBox>

      {/* ---- Lid ---- */}
      <group ref={lidRef} position={[0, lidY, 0]}>
        <RoundedBox
          args={[BOX_W + LID_OVERHANG * 2, LID_H, BOX_D + LID_OVERHANG * 2]}
          radius={0.05}
          smoothness={4}
        >
          <meshStandardMaterial
            color="#A78BFA"
            metalness={0.08}
            roughness={0.4}
          />
        </RoundedBox>

        {/* Ribbon on lid — horizontal strip (X direction) */}
        <RoundedBox
          args={[BOX_W + LID_OVERHANG * 2 + 0.01, LID_H + 0.02, RIBBON_W]}
          radius={0.02}
          smoothness={2}
        >
          <meshStandardMaterial
            color="#FB7185"
            metalness={0.25}
            roughness={0.2}
          />
        </RoundedBox>

        {/* Ribbon on lid — horizontal strip (Z direction) */}
        <RoundedBox
          args={[RIBBON_W, LID_H + 0.02, BOX_D + LID_OVERHANG * 2 + 0.01]}
          radius={0.02}
          smoothness={2}
        >
          <meshStandardMaterial
            color="#FB7185"
            metalness={0.25}
            roughness={0.2}
          />
        </RoundedBox>
      </group>

      {/* ---- Ribbon on box body — vertical strip (front, X direction) ---- */}
      <RoundedBox
        args={[BOX_W + 0.01, BOX_H + 0.01, RIBBON_W]}
        radius={0.02}
        smoothness={2}
      >
        <meshStandardMaterial
          color="#FB7185"
          metalness={0.25}
          roughness={0.2}
        />
      </RoundedBox>

      {/* ---- Ribbon on box body — vertical strip (side, Z direction) ---- */}
      <RoundedBox
        args={[RIBBON_W, BOX_H + 0.01, BOX_D + 0.01]}
        radius={0.02}
        smoothness={2}
      >
        <meshStandardMaterial
          color="#FB7185"
          metalness={0.25}
          roughness={0.2}
        />
      </RoundedBox>

      {/* ---- Bow — left loop ---- */}
      <Torus
        args={[0.28, 0.08, 16, 32]}
        position={[-0.25, bowY, 0]}
        rotation={[Math.PI / 2, 0.6, 0]}
      >
        <meshStandardMaterial
          color="#FB7185"
          metalness={0.35}
          roughness={0.15}
        />
      </Torus>

      {/* ---- Bow — right loop ---- */}
      <Torus
        args={[0.28, 0.08, 16, 32]}
        position={[0.25, bowY, 0]}
        rotation={[Math.PI / 2, -0.6, 0]}
      >
        <meshStandardMaterial
          color="#FB7185"
          metalness={0.35}
          roughness={0.15}
        />
      </Torus>

      {/* ---- Bow — front loop ---- */}
      <Torus
        args={[0.22, 0.07, 16, 32]}
        position={[0, bowY - 0.02, 0.2]}
        rotation={[0.3, 0, 0]}
      >
        <meshStandardMaterial
          color="#F472B6"
          metalness={0.35}
          roughness={0.15}
        />
      </Torus>

      {/* ---- Bow — knot center ---- */}
      <Sphere args={[0.12, 16, 16]} position={[0, bowY, 0]}>
        <meshStandardMaterial
          color="#E11D48"
          metalness={0.2}
          roughness={0.3}
        />
      </Sphere>

      {/* ---- Orbiting sparkles ---- */}
      {sparkles.map((s, i) => (
        <Sparkle key={i} data={s} />
      ))}
    </group>
  );
}

/* --------- Exported scene --------- */

export default function HeroGiftScene() {
  return (
    <SceneCanvas className="w-full h-full" cameraPosition={[0, 1, 5.5]} cameraFov={42}>
      <GiftBox />
    </SceneCanvas>
  );
}
