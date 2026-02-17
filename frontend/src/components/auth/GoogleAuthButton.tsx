"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleAuthButtonProps {
  className?: string;
}

export default function GoogleAuthButton({ className }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const router = useRouter();

  const handleClick = async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google OAuth не настроен: отсутствует NEXT_PUBLIC_GOOGLE_CLIENT_ID");
      return;
    }

    const credential = window.prompt("Вставьте Google credential (ID token)");
    if (!credential) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await loginWithGoogle(credential);
      router.push("/dashboard");
    } catch {
      setError("Не удалось войти через Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] shadow-sm transition hover:bg-[var(--color-surface)] disabled:opacity-60 ${className ?? ""}`}
      >
        {loading ? "Подключение..." : "Продолжить с Google"}
      </button>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
