"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import Header from "@/components/layout/Header";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 animate-fade-in">{children}</main>
    </>
  );
}
