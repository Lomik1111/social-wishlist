"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  Gift,
  Link as LinkIcon,
  UsersThree,
  Confetti,
  Sparkle,
  ArrowRight,
} from "@phosphor-icons/react";
import AnimatedSection from "@/components/landing/AnimatedSection";
import type { ComponentType } from "react";

/* -------- Dynamic 3D scene import (SSR disabled) — hero only -------- */

const HeroGiftScene = dynamic(
  () => import("@/components/three/HeroGiftScene"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full animate-float">
        <Image
          src="/illustrations/gift.svg"
          alt="Подарок"
          width={220}
          height={220}
          priority
        />
      </div>
    ),
  }
);

/* -------- Data -------- */

interface FeatureData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: ComponentType<any>;
  title: string;
  description: string;
  gradientBg: string;
}

const features: FeatureData[] = [
  {
    icon: Gift,
    title: "Создавайте списки",
    description:
      "Добавляйте подарки с фото, ценой и ссылкой. Автозаполнение подтянет всё за вас",
    gradientBg: "bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE]",
  },
  {
    icon: LinkIcon,
    title: "Делитесь одной ссылкой",
    description:
      "Без регистрации и скачивания. Друзья откроют ваш вишлист прямо в браузере",
    gradientBg: "bg-gradient-to-br from-[#FD79A8] to-[#FDCB6E]",
  },
  {
    icon: UsersThree,
    title: "Скидывайтесь вместе",
    description:
      "Дорогой подарок? Друзья увидят прогресс-бар и смогут внести любую сумму",
    gradientBg: "bg-gradient-to-br from-[#00B894] to-[#55EFC4]",
  },
  {
    icon: Confetti,
    title: "Сохраняйте сюрприз",
    description:
      "Владелец не видит кто и что зарезервировал. Сюрприз останется сюрпризом",
    gradientBg: "bg-gradient-to-br from-[#FDCB6E] to-[#FD79A8]",
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
          <AnimatedSection delay={0}>
            <div className="mb-6 flex justify-center">
              <span className="badge-purple inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
                <Sparkle size={16} weight="duotone" />
                Новый способ дарить подарки
              </span>
            </div>
          </AnimatedSection>

          {/* Heading */}
          <AnimatedSection delay={0.1}>
            <h1 className="text-5xl font-extrabold tracking-tight md:text-7xl">
              Создавайте вишлисты,
              <br />
              которые{" "}
              <span className="gradient-text-hero">вдохновляют</span>
            </h1>
          </AnimatedSection>

          {/* Subtitle */}
          <AnimatedSection delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-text-secondary)]">
              Соберите все желания в одном месте, поделитесь ссылкой с друзьями
              — и каждый подарок будет именно тем, о чём вы мечтали.
            </p>
          </AnimatedSection>

          {/* Buttons */}
          <AnimatedSection delay={0.3}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
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
          </AnimatedSection>

          {/* 3D Gift illustration */}
          <AnimatedSection delay={0.4} direction="none">
            <div className="mx-auto mt-14">
              {/* Desktop: 3D WebGL scene */}
              <div className="hidden md:block mx-auto w-[280px] h-[280px]">
                <HeroGiftScene />
              </div>
              {/* Mobile: Static SVG with CSS float animation */}
              <div className="block md:hidden mx-auto w-[200px] animate-float">
                <Image
                  src="/illustrations/gift.svg"
                  alt="Подарок"
                  width={200}
                  height={200}
                  priority
                />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="mt-24 w-full">
        <AnimatedSection>
          <h2 className="text-center text-3xl font-bold text-[var(--color-text-primary)]">
            Всё для идеального подарка
          </h2>
        </AnimatedSection>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <AnimatedSection key={f.title} delay={0.1 * i} direction="up">
                <div className="card-premium p-8">
                  <div
                    className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${f.gradientBg} shadow-lg`}
                  >
                    <Icon
                      size={28}
                      weight="duotone"
                      className="text-white"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    {f.description}
                  </p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" className="mt-24 w-full">
        <AnimatedSection>
          <h2 className="text-center text-3xl font-bold text-[var(--color-text-primary)]">
            Три простых шага
          </h2>
        </AnimatedSection>

        <div className="mx-auto mt-12 flex max-w-3xl flex-col items-start gap-0 md:flex-row md:items-start">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className="flex flex-1 items-start gap-0 md:flex-col"
            >
              <AnimatedSection delay={0.15 * i} direction="up" className="flex w-full flex-col items-center text-center">
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
              </AnimatedSection>

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
      <AnimatedSection direction="up" className="mt-24 mb-12 w-full">
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
      </AnimatedSection>
    </div>
  );
}
