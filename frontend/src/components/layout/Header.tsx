"use client";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { Gift, LogOut, User, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
          <Gift className="h-6 w-6" />
          <span>Wishly</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 md:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Мои вишлисты
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-sm text-gray-600">{user.full_name || user.email}</span>
                <button
                  onClick={logout}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100">
                Войти
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Регистрация
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          {user ? (
            <div className="flex flex-col gap-3">
              <span className="text-sm text-gray-600">{user.full_name || user.email}</span>
              <Link href="/dashboard" className="text-sm font-medium text-gray-700" onClick={() => setMenuOpen(false)}>
                Мои вишлисты
              </Link>
              <button onClick={() => { logout(); setMenuOpen(false); }} className="text-left text-sm text-red-500">
                Выйти
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Link href="/login" className="text-sm font-medium text-gray-700" onClick={() => setMenuOpen(false)}>
                Войти
              </Link>
              <Link href="/register" className="text-sm font-medium text-indigo-600" onClick={() => setMenuOpen(false)}>
                Регистрация
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
