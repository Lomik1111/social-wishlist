"use client";
import { useCallback } from "react";
import confetti from "canvas-confetti";

export function useConfetti() {
  const fire = useCallback(() => {
    const defaults = { startVelocity: 25, spread: 360, ticks: 60, zIndex: 100 };
    confetti({ ...defaults, particleCount: 40, origin: { x: 0.3, y: 0.6 } });
    confetti({ ...defaults, particleCount: 40, origin: { x: 0.7, y: 0.6 } });
    setTimeout(() => {
      confetti({ ...defaults, particleCount: 30, origin: { x: 0.5, y: 0.4 } });
    }, 150);
  }, []);

  return fire;
}
