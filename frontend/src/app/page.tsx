"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Gift,
  Link as LinkIcon,
  UsersThree,
  Confetti,
  Sparkle,
  ArrowRight,
} from "@phosphor-icons/react";

const features = [
  {
    icon: Gift,
    title: "Создавайте списки",
    description:
      "Добавляйте подарки с фото, ценой и ссылкой. Автозаполнение подтянет всё за вас",
    accent: "bg-[rgba(108,92,231,0.1)]",
    iconColor: "text-[var(--color-primary)]",
    iconBg: "bg-[rgba(108,92,231,0.12)]",
  },
  {
    icon: LinkIcon,
    title: "Делитесь одной ссылкой",
    description:
      "Без регистрации и скачивания. Друзья откроют ваш вишлист прямо в браузере",
    accent: "bg-[rgba(253,121,168,0.1)]",
    iconColor: "text-[var(--color-accent-coral)]",
    iconBg: "bg-[rgba(253,121,168,0.12)]",
  },
  {
    icon: UsersThree,
    title: "Скидывайтесь вместе",
    description:
      "Дорогой подарок? Друзья увидят прогресс-бар и смогут внести любую сумму",
    accent: "bg-[rgba(0,184,148,0.1)]",
    iconColor: "text-[var(--color-success)]",
    iconBg: "bg-[rgba(0,184,148,0.12)]",
  },
  {
    icon: Confetti,
    title: "Сохраняйте сюрприз",
    description:
      "Владелец не видит кто и что зарезервировал. Сюрприз останется сюрпризом",
    accent: "bg-[rgba(253,203,110,0.1)]",
    iconColor: "text-[var(--color-accent-gold)]",
    iconBg: "bg-[rgba(253,203,110,0.15)]",
  },
];

const steps = [
  {
    num: "1",
    title: "Создайте вишлист",
    description: "Придумайте название, выберите повод и дату события",
  },
  {
    num: "2",
    title: "Добавьте подарки",
    description: "Вставьте ссылку — мы подтянем название, фото и цену",
  },
  {
    num: "3",
    title: "Поделитесь",
    description: "Отправьте ссылку друзьям и ждите сюрпризов!",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center px-4">
      {/* ============ HERO ============ */}
      <section className="relative w-full overflow-hidden pb-16 pt-12">
        {/* Decorative blobs */}
        <div className="blob blob-purple absolute -right-20 -top-20 h-72 w-72" />
        <div className="blob blob-coral absolute -bottom-16 -left-20 h-64 w-64" />
        <div className="blob blob-gold absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 -translate-y-1/2 opacity-20" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Pill badge */}
          <div className="animate-fade-in mb-6 flex justify-center">
            <span className="badge-purple inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
              <Sparkle size={16} weight="duotone" />
              Новый способ дарить подарки
            </span>
          </div>

          {/* Heading */}
          <h1 className="animate-fade-in text-5xl font-extrabold tracking-tight md:text-7xl">
            Создавайте вишлисты,
            <br />
            которые{" "}
            <span className="gradient-text-hero">вдохновляют</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-in delay-100 mx-auto mt-6 max-w-2xl text-lg text-[var(--color-text-secondary)]">
            Соберите все желания в одном месте, поделитесь ссылкой с друзьями
            — и каждый подарок будет именно тем, о чём вы мечтали.
          </p>

          {/* Buttons */}
          <div className="animate-fade-in delay-200 mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-primary inline-flex items-center gap-2"
            >
              Создать вишлист
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className="btn-secondary">
              Как это работает
            </a>
          </div>

          {/* Gift illustration */}
          <div className="animate-float mx-auto mt-14 w-[220px]">
            <Image
              src="/illustrations/gift.svg"
              alt="Подарок"
              width={220}
              height={220}
              priority
            />
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="mt-24 w-full">
        <h2 className="text-center text-3xl font-bold text-[var(--color-text-primary)]">
          Всё для идеального подарка
        </h2>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
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
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${f.iconBg}`}
                >
                  <Icon size={26} weight="duotone" className={f.iconColor} />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" className="mt-24 w-full">
        <h2 className="text-center text-3xl font-bold text-[var(--color-text-primary)]">
          Три простых шага
        </h2>

        <div className="mx-auto mt-12 flex max-w-3xl flex-col items-start gap-0 md:flex-row md:items-start">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className="flex flex-1 items-start gap-0 md:flex-col"
            >
              <div
                className={`animate-slide-up text-center ${
                  i === 0
                    ? "delay-100"
                    : i === 1
                      ? "delay-200"
                      : "delay-300"
                } flex w-full flex-col items-center`}
              >
                {/* Gradient numbered circle */}
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-coral)] text-lg font-bold text-white shadow-lg">
                  {s.num}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  {s.description}
                </p>
              </div>

              {/* Dashed connector */}
              {i < steps.length - 1 && (
                <div className="hidden flex-1 md:block">
                  <div className="mt-7 border-t-2 border-dashed border-[var(--color-primary-light)]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ============ CTA BANNER ============ */}
      <section className="mt-24 mb-12 w-full">
        <div className="noise-texture relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary-light)] to-[var(--color-accent-coral)] p-12 text-center text-white">
          {/* Decorative floating circles */}
          <div className="absolute left-10 top-10 h-16 w-16 rounded-full bg-white/10 animate-float" />
          <div className="absolute right-16 top-6 h-10 w-10 rounded-full bg-white/10 animate-float-slow" />
          <div className="absolute bottom-8 left-1/3 h-12 w-12 rounded-full bg-white/10 animate-float" />
          <div className="absolute bottom-6 right-10 h-8 w-8 rounded-full bg-white/10 animate-float-slow" />

          <div className="relative z-10">
            <h2 className="text-3xl font-bold">
              Готовы создать свой вишлист?
            </h2>
            <p className="mt-3 text-lg text-white/80">
              Бесплатно и без ограничений
            </p>
            <Link
              href="/register"
              className="mt-8 inline-block rounded-xl bg-white px-8 py-3 font-semibold text-[var(--color-primary)] transition hover:bg-white/90 hover:shadow-lg"
            >
              Начать бесплатно
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
