"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleAuthButtonProps {
  className?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function GoogleAuthButton({ className }: GoogleAuthButtonProps) {
  const [error, setError] = useState("");
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !containerRef.current) {
        return;
      }

      containerRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          if (!credential) {
            setError("Google не вернул credential");
            return;
          }
          setError("");
          try {
            await loginWithGoogle(credential);
            router.push("/dashboard");
          } catch {
            setError("Не удалось войти через Google");
          }
        },
      });

      window.google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        shape: "pill",
        theme: "outline",
        text: "continue_with",
        width: "320",
        size: "large",
      });
    };

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    script.onerror = () => setError("Не удалось загрузить Google Sign-In SDK");
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [loginWithGoogle, router]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className={`space-y-2 ${className ?? ""}`}>
        <p className="text-center text-xs text-[var(--color-danger)]">
          Google OAuth не настроен: отсутствует NEXT_PUBLIC_GOOGLE_CLIENT_ID
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="flex justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-2">
        <div ref={containerRef} aria-label="Продолжить с Google" />
      </div>
      <p className="text-center text-xs text-[var(--color-text-secondary)]">Продолжить с Google</p>
      {error && <p className="text-center text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
