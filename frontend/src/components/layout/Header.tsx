"use client";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { Gift, LogOut, User, Menu, X, Sparkles } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/40">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-2 rounded-xl">
            <Gift className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold gradient-text">Wishly</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-violet-700 hover:bg-violet-50/60"
              >
                Мои вишлисты
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user.full_name || user.email}
                </span>
                <button
                  onClick={logout}
                  title="Выйти"
                  className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-violet-700 hover:bg-violet-50/60"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="btn-primary !py-2 !px-5 !text-sm !rounded-xl"
              >
                <Sparkles className="h-4 w-4" />
                Начать
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="rounded-xl p-2 text-gray-600 transition-colors hover:bg-violet-50 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden transition-all duration-300 md:hidden ${
          menuOpen ? "max-h-[300px] border-t border-white/40" : "max-h-0"
        }`}
      >
        <div className="px-4 py-4">
          {user ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 pb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user.full_name || user.email}
                </span>
              </div>
              <Link
                href="/dashboard"
                className="rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-violet-50/60 hover:text-violet-700"
                onClick={() => setMenuOpen(false)}
              >
                Мои вишлисты
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-violet-50/60 hover:text-violet-700"
                onClick={() => setMenuOpen(false)}
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="btn-primary !py-2.5 !text-sm !rounded-xl text-center"
                onClick={() => setMenuOpen(false)}
              >
                <Sparkles className="h-4 w-4" />
                Начать
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
