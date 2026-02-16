"use client";
import Image from "next/image";

interface EmptyStateProps {
  illustration: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ illustration, title, description, action }: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center gap-5 rounded-2xl border-2 border-dashed border-[var(--color-primary-light)]/20 py-16 px-6 overflow-hidden">
      <div className="dot-pattern absolute inset-0 -z-10 opacity-40" />

      <div className="animate-float w-[160px] h-[160px] relative">
        <Image
          src={illustration}
          alt={title}
          width={160}
          height={160}
          className="w-full h-full"
          priority={false}
        />
      </div>

      <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{title}</h3>
      {description && (
        <p className="max-w-sm text-center text-sm text-[var(--color-text-secondary)]">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
