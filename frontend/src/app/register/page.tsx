"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { Gift, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, fullName);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center relative">
      {/* Decorative blobs */}
      <div className="blob blob-purple w-96 h-96 absolute -top-20 -right-20 -z-10" />
      <div className="blob blob-pink w-80 h-80 absolute -bottom-20 -left-20 -z-10" />

      <div className="w-full max-w-5xl mx-auto grid md:grid-cols-2 gap-0 overflow-hidden rounded-3xl shadow-2xl">
        {/* LEFT — Form */}
        <div className="bg-white p-8 md:p-12">
          <div className="mb-8 flex flex-col items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Создайте аккаунт</h1>
            <p className="text-gray-500">Бесплатно и навсегда</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="animate-fade-in rounded-full bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600 inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Имя</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="input-premium w-full"
                placeholder="Как вас зовут"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-premium w-full"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input-premium w-full"
                placeholder="Минимум 6 символов"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Создать аккаунт
            </button>

            <p className="text-center text-sm text-gray-500">
              Уже есть аккаунт?{" "}
              <Link href="/login" className="font-medium text-violet-600 hover:underline">
                Войти
              </Link>
            </p>
          </form>
        </div>

        {/* RIGHT — Decorative */}
        <div className="hidden md:flex bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 flex-col items-center justify-center p-12 relative overflow-hidden">
          {/* Floating circles */}
          <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white/10 animate-float" />
          <div className="absolute top-1/3 right-8 w-32 h-32 rounded-full bg-white/10 animate-float [animation-delay:1s]" />
          <div className="absolute bottom-16 left-16 w-40 h-40 rounded-full bg-white/10 animate-float [animation-delay:2s]" />
          <div className="absolute bottom-8 right-20 w-24 h-24 rounded-full bg-white/10 animate-float [animation-delay:3s]" />

          {/* Large SVG gift icon */}
          <svg
            className="w-32 h-32 text-white opacity-20 animate-float [animation-delay:1.5s] mb-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v8m-4-4h8M20 12h1m-1-4V4m0 0h-4m4 0l-5 5"
            />
          </svg>

          <h2 className="text-2xl font-bold text-white text-center mb-3 relative z-10">
            Создайте вишлист за 2 минуты и поделитесь с друзьями
          </h2>
          <p className="text-purple-200 text-center text-sm relative z-10">
            Без ограничений и скрытых платежей
          </p>
        </div>
      </div>
    </div>
  );
}
