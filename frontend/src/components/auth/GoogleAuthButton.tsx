"use client";

import { useEffect, useRef } from "react";

type GoogleAuthButtonProps = {
  onCredential: (credential: string) => Promise<void> | void;
  text?: "signin_with" | "signup_with" | "continue_with";
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

const SCRIPT_ID = "google-identity-services";

export default function GoogleAuthButton({ onCredential, text = "continue_with" }: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !containerRef.current) return;

    const render = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;

      const width = Math.max(220, Math.min(containerRef.current.clientWidth || 320, 360));

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential?: string }) => {
          if (response.credential) {
            await onCredential(response.credential);
          }
        },
      });

      containerRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        width,
        text,
      });
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      render();
      window.addEventListener("resize", render);
      return () => {
        window.removeEventListener("resize", render);
      };
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);

    window.addEventListener("resize", render);

    return () => {
      window.removeEventListener("resize", render);
    };
  }, [onCredential, text]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  return (
    <div className="google-auth-wrapper mx-auto w-full max-w-[360px]">
      <div ref={containerRef} className="google-auth-button flex justify-center" />
    </div>
  );
}
