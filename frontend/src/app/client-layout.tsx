"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { Toaster } from "sonner";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <div className="flex min-h-screen flex-col">
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-jakarta), system-ui, sans-serif",
          },
        }}
      />
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 animate-fade-in">{children}</main>
      <Footer />
    </div>
  );
}
