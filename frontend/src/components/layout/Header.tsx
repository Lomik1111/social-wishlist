"use client";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { Gift, SignOut, User, List, X, Sparkle } from "@phosphor-icons/react";
import { useState } from "react";

export default function Header() {
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/30">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] p-2 text-white shadow-sm transition group-hover:shadow-[var(--shadow-glow-purple)]">
            <Gift size={20} weight="duotone" />
          </div>
          <span className="text-xl font-bold gradient-text tracking-tight">Wishly</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
              >
                Мои вишлисты
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-coral)] text-white shadow-sm">
                  <User size={16} weight="bold" />
                </div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {user.full_name || user.email}
                </span>
                <button
                  onClick={logout}
                  title="Выйти"
                  className="rounded-xl p-2 text-[var(--color-text-tertiary)] transition-colors hover:bg-red-50 hover:text-[var(--color-danger)]"
                >
                  <SignOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="btn-primary !py-2 !px-5 !text-sm !rounded-xl"
              >
                <Sparkle size={16} weight="fill" />
                Начать
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="rounded-xl p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-primary)]/5 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
        >
          {menuOpen ? <X size={22} /> : <List size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden transition-all duration-300 md:hidden ${
          menuOpen ? "max-h-[300px] border-t border-white/30" : "max-h-0"
        }`}
      >
        <div className="px-4 py-4">
          {user ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 pb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-coral)] text-white">
                  <User size={16} weight="bold" />
                </div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {user.full_name || user.email}
                </span>
              </div>
              <Link
                href="/dashboard"
                className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]"
                onClick={() => setMenuOpen(false)}
              >
                Мои вишлисты
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--color-danger)] transition-colors hover:bg-red-50"
              >
                <SignOut size={16} />
                Выйти
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]"
                onClick={() => setMenuOpen(false)}
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="btn-primary !py-2.5 !text-sm !rounded-xl text-center"
                onClick={() => setMenuOpen(false)}
              >
                <Sparkle size={16} weight="fill" />
                Начать
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
