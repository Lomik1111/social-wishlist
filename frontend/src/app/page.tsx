"use client";
import Link from "next/link";
import { ArrowRight, Sparkles, Gift } from "lucide-react";

const features = [
  {
    icon: "\u{1F381}",
    title: "\u0421\u043E\u0437\u0434\u0430\u0432\u0430\u0439\u0442\u0435 \u0441\u043F\u0438\u0441\u043A\u0438",
    description:
      "\u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u043F\u043E\u0434\u0430\u0440\u043A\u0438 \u0441 \u0444\u043E\u0442\u043E, \u0446\u0435\u043D\u043E\u0439 \u0438 \u0441\u0441\u044B\u043B\u043A\u043E\u0439. \u0410\u0432\u0442\u043E\u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u043F\u043E\u0434\u0442\u044F\u043D\u0435\u0442 \u0432\u0441\u0451 \u0437\u0430 \u0432\u0430\u0441",
  },
  {
    icon: "\u{1F517}",
    title: "\u0414\u0435\u043B\u0438\u0442\u0435\u0441\u044C \u043E\u0434\u043D\u043E\u0439 \u0441\u0441\u044B\u043B\u043A\u043E\u0439",
    description:
      "\u0411\u0435\u0437 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u0438 \u0441\u043A\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u044F. \u0414\u0440\u0443\u0437\u044C\u044F \u043E\u0442\u043A\u0440\u043E\u044E\u0442 \u0432\u0430\u0448 \u0432\u0438\u0448\u043B\u0438\u0441\u0442 \u043F\u0440\u044F\u043C\u043E \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435",
  },
  {
    icon: "\u{1F465}",
    title: "\u0421\u043A\u0438\u0434\u044B\u0432\u0430\u0439\u0442\u0435\u0441\u044C \u0432\u043C\u0435\u0441\u0442\u0435",
    description:
      "\u0414\u043E\u0440\u043E\u0433\u043E\u0439 \u043F\u043E\u0434\u0430\u0440\u043E\u043A? \u0414\u0440\u0443\u0437\u044C\u044F \u0443\u0432\u0438\u0434\u044F\u0442 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441-\u0431\u0430\u0440 \u0438 \u0441\u043C\u043E\u0433\u0443\u0442 \u0432\u043D\u0435\u0441\u0442\u0438 \u043B\u044E\u0431\u0443\u044E \u0441\u0443\u043C\u043C\u0443",
  },
  {
    icon: "\u{1F389}",
    title: "\u0421\u043E\u0445\u0440\u0430\u043D\u044F\u0439\u0442\u0435 \u0441\u044E\u0440\u043F\u0440\u0438\u0437",
    description:
      "\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u043D\u0435 \u0432\u0438\u0434\u0438\u0442 \u043A\u0442\u043E \u0438 \u0447\u0442\u043E \u0437\u0430\u0440\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043B. \u0421\u044E\u0440\u043F\u0440\u0438\u0437 \u043E\u0441\u0442\u0430\u043D\u0435\u0442\u0441\u044F \u0441\u044E\u0440\u043F\u0440\u0438\u0437\u043E\u043C",
  },
];

const steps = [
  {
    num: "1",
    title: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0432\u0438\u0448\u043B\u0438\u0441\u0442",
    description:
      "\u041F\u0440\u0438\u0434\u0443\u043C\u0430\u0439\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043E\u0432\u043E\u0434 \u0438 \u0434\u0430\u0442\u0443 \u0441\u043E\u0431\u044B\u0442\u0438\u044F",
  },
  {
    num: "2",
    title: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u043E\u0434\u0430\u0440\u043A\u0438",
    description:
      "\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u2014 \u043C\u044B \u043F\u043E\u0434\u0442\u044F\u043D\u0435\u043C \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0444\u043E\u0442\u043E \u0438 \u0446\u0435\u043D\u0443",
  },
  {
    num: "3",
    title: "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u0435\u0441\u044C",
    description:
      "\u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0434\u0440\u0443\u0437\u044C\u044F\u043C \u0438 \u0436\u0434\u0438\u0442\u0435 \u0441\u044E\u0440\u043F\u0440\u0438\u0437\u043E\u0432!",
  },
];

const avatarColors = ["bg-violet-500", "bg-fuchsia-500", "bg-pink-500", "bg-purple-500"];
const avatarInitials = ["\u0410", "\u041C", "\u0414", "\u041A"];

export default function Home() {
  return (
    <div className="flex flex-col items-center px-4">
      {/* ============ HERO ============ */}
      <section className="relative w-full overflow-hidden pb-16 pt-12">
        {/* Decorative blobs */}
        <div className="blob blob-purple absolute -right-20 -top-20 h-72 w-72" />
        <div className="blob blob-pink absolute -bottom-16 -left-20 h-64 w-64" />
        <div className="blob blob-blue absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Pill badge */}
          <div className="animate-fade-in mb-6 flex justify-center">
            <span className="badge-purple inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Новый способ дарить подарки
            </span>
          </div>

          {/* Heading */}
          <h1 className="animate-fade-in text-5xl font-extrabold tracking-tight md:text-7xl">
            Создавайте вишлисты,
            <br />
            которые{" "}
            <span className="gradient-text">вдохновляют</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-in delay-100 mx-auto mt-6 max-w-2xl text-lg text-gray-500">
            Соберите все желания в одном месте, поделитесь ссылкой с друзьями — и каждый подарок будет именно тем, о чём вы мечтали.
          </p>

          {/* Buttons */}
          <div className="animate-fade-in delay-200 mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register" className="btn-primary inline-flex items-center gap-2">
              Создать вишлист
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className="btn-secondary">
              Как это работает
            </a>
          </div>

          {/* Social proof */}
          <div className="animate-fade-in delay-300 mt-10 flex items-center justify-center gap-3">
            <div className="flex items-center">
              {avatarColors.map((color, i) => (
                <div
                  key={i}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white ${color} ${i > 0 ? "-ml-2" : ""}`}
                >
                  {avatarInitials[i]}
                </div>
              ))}
            </div>
            <span className="text-sm text-gray-500">1,200+ вишлистов создано</span>
          </div>

          {/* Gift illustration */}
          <div className="animate-float mx-auto mt-12 w-[200px]">
            <svg
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-[200px] w-[200px]"
            >
              {/* Box body */}
              <rect x="30" y="100" width="140" height="80" rx="8" fill="#667eea" />
              {/* Box lid */}
              <rect x="22" y="80" width="156" height="28" rx="6" fill="#7c8cf0" />
              {/* Vertical ribbon */}
              <rect x="90" y="80" width="20" height="100" rx="2" fill="#f093fb" />
              {/* Horizontal ribbon */}
              <rect x="22" y="86" width="156" height="16" rx="2" fill="#f093fb" />
              {/* Bow left */}
              <ellipse cx="82" cy="72" rx="20" ry="16" fill="#f093fb" />
              {/* Bow right */}
              <ellipse cx="118" cy="72" rx="20" ry="16" fill="#f093fb" />
              {/* Bow knot */}
              <circle cx="100" cy="76" r="8" fill="#e07cee" />
            </svg>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="mt-24 w-full">
        <h2 className="text-center text-3xl font-bold">Всё для идеального подарка</h2>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`card-premium animate-fade-in p-8 ${
                i === 0
                  ? "delay-100"
                  : i === 1
                    ? "delay-200"
                    : i === 2
                      ? "delay-300"
                      : "delay-400"
              }`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-2xl">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" className="mt-24 w-full">
        <h2 className="text-center text-3xl font-bold">Три простых шага</h2>

        <div className="mx-auto mt-12 flex max-w-3xl flex-col items-start gap-8 md:flex-row">
          {steps.map((s, i) => (
            <div key={s.num} className="flex flex-1 items-start gap-0 md:flex-col">
              <div
                className={`animate-slide-up text-center ${
                  i === 0 ? "delay-100" : i === 1 ? "delay-200" : "delay-300"
                } flex w-full flex-col items-center`}
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-purple-600 font-bold text-white">
                  {s.num}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{s.description}</p>
              </div>

              {/* Dashed connector */}
              {i < steps.length - 1 && (
                <div className="hidden flex-1 md:block">
                  <div className="mt-6 border-t-2 border-dashed border-purple-200" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ============ CTA BANNER ============ */}
      <section className="mt-24 mb-12 w-full">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 p-12 text-center text-white">
          {/* Decorative floating circles */}
          <div className="absolute left-10 top-10 h-16 w-16 rounded-full bg-white/10 animate-float" />
          <div className="absolute right-16 top-6 h-10 w-10 rounded-full bg-white/10 animate-float-slow" />
          <div className="absolute bottom-8 left-1/3 h-12 w-12 rounded-full bg-white/10 animate-float" />
          <div className="absolute bottom-6 right-10 h-8 w-8 rounded-full bg-white/10 animate-float-slow" />

          <div className="relative z-10">
            <h2 className="text-3xl font-bold">Готовы создать свой вишлист?</h2>
            <p className="mt-3 text-lg text-white/80">Бесплатно и без ограничений</p>
            <Link
              href="/register"
              className="mt-8 inline-block rounded-xl bg-white px-8 py-3 font-semibold text-purple-700 transition hover:bg-purple-50"
            >
              Начать бесплатно
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="mt-0 w-full border-t border-gray-100 py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            <span className="gradient-text text-lg font-bold">Wishly</span>
          </div>
          <span className="text-sm text-gray-400">
            2026 Wishly. Сделано с ❤️
          </span>
        </div>
      </footer>
    </div>
  );
}
