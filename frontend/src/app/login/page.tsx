"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import { Gift, SpinnerGap, EnvelopeSimple, Lock } from "@phosphor-icons/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (credential: string) => {
    setError("");
    setLoading(true);
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
    <div className="min-h-[85vh] flex items-center justify-center relative">
      {/* Decorative blobs */}
      <div className="blob blob-purple w-96 h-96 absolute -top-20 -right-20 -z-10" />
      <div className="blob blob-coral w-80 h-80 absolute -bottom-20 -left-20 -z-10" />

      <div className="w-full max-w-5xl mx-auto grid md:grid-cols-2 gap-0 overflow-hidden rounded-3xl shadow-2xl border border-[rgba(162,155,254,0.15)]">
        {/* LEFT — Form */}
        <div className="bg-white p-8 md:p-12">
          <div className="mb-8 flex flex-col items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] shadow-lg">
              <Gift size={28} weight="duotone" className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">С возвращением!</h1>
            <p className="text-[var(--color-text-secondary)]">Войдите в аккаунт Wishly</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="animate-fade-in rounded-[var(--radius-md)] bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 px-4 py-2.5 text-sm text-[var(--color-danger)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--color-danger)] shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">Email</label>
              <div className="relative">
                <EnvelopeSimple size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-premium input-with-icon w-full"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">Пароль</label>
              <div className="relative">
                <Lock size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-premium input-with-icon w-full"
                  placeholder="Минимум 8 символов"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <SpinnerGap size={18} className="animate-spin" />}
              Войти
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-[var(--color-text-tertiary)]">или</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <GoogleAuthButton onCredential={handleGoogleLogin} text="signin_with" />

            <p className="text-center text-sm text-[var(--color-text-secondary)]">
              Нет аккаунта?{" "}
              <Link href="/register" className="font-medium text-[var(--color-primary)] hover:underline">
                Создать
              </Link>
            </p>
          </form>
        </div>

        {/* RIGHT — Decorative */}
        <div className="hidden md:flex bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary-light)] to-[var(--color-accent-coral)] flex-col items-center justify-center p-12 relative overflow-hidden">
          {/* Floating circles */}
          <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white/10 animate-float" />
          <div className="absolute top-1/3 right-8 w-32 h-32 rounded-full bg-white/10 animate-float [animation-delay:1s]" />
          <div className="absolute bottom-16 left-16 w-40 h-40 rounded-full bg-white/10 animate-float [animation-delay:2s]" />
          <div className="absolute bottom-8 right-20 w-24 h-24 rounded-full bg-white/10 animate-float [animation-delay:3s]" />

          {/* Illustration */}
          <div className="relative z-10 mb-8 animate-float">
            <Image
              src="/illustrations/share.svg"
              alt="Поделитесь желаниями"
              width={220}
              height={165}
              className="drop-shadow-lg"
            />
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-3 relative z-10">
            Делитесь желаниями, получайте подарки мечты
          </h2>
          <p className="text-white/80 text-center text-sm relative z-10 max-w-xs">
            Создайте вишлист и отправьте ссылку друзьям
          </p>
        </div>
      </div>
    </div>
  );
}
