"use client";
import Link from "next/link";
import { Gift } from "@phosphor-icons/react";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100/80 mt-auto">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <Link href="/" className="flex items-center gap-2">
          <Gift size={20} weight="duotone" className="text-[var(--color-primary)]" />
          <span className="gradient-text text-lg font-bold">Wishly</span>
        </Link>
        <span className="text-sm text-[var(--color-text-tertiary)]">
          2026 Wishly
        </span>
      </div>
    </footer>
  );
}
