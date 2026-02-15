"use client";
import Link from "next/link";
import { Gift, Share2, Users, Eye } from "lucide-react";

const features = [
  {
    icon: Gift,
    title: "Создавайте вишлисты",
    description: "Добавляйте подарки с ссылками, ценами и картинками. Создавайте списки на любой повод.",
  },
  {
    icon: Share2,
    title: "Делитесь с друзьями",
    description: "Отправьте ссылку — друзья смогут выбрать подарок без регистрации.",
  },
  {
    icon: Users,
    title: "Скидывайтесь вместе",
    description: "На дорогие подарки можно скинуться. Прогресс-бар покажет, сколько собрано.",
  },
  {
    icon: Eye,
    title: "Сюрприз сохранён",
    description: "Вы не увидите, кто что зарезервировал. Подарок останется неожиданным.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 pb-16 pt-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-100">
          <Gift className="h-10 w-10 text-indigo-600" />
        </div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Подарки, которые{" "}
          <span className="text-indigo-600">действительно хотят</span>
        </h1>
        <p className="max-w-lg text-lg text-gray-600">
          Создайте вишлист, поделитесь с друзьями — и забудьте о ненужных подарках и дублях навсегда.
        </p>
        <div className="flex gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
          >
            Создать вишлист
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Войти
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid w-full max-w-4xl gap-6 pb-16 sm:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
              <f.icon className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
            <p className="text-sm leading-relaxed text-gray-600">{f.description}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="w-full max-w-3xl pb-16">
        <h2 className="mb-8 text-center text-2xl font-bold">Как это работает</h2>
        <div className="flex flex-col gap-6 sm:flex-row">
          {[
            { step: "1", text: "Зарегистрируйтесь и создайте вишлист" },
            { step: "2", text: "Добавьте подарки — вручную или по ссылке" },
            { step: "3", text: "Отправьте ссылку друзьям и ждите сюрпризов" },
          ].map((s) => (
            <div key={s.step} className="flex flex-1 flex-col items-center gap-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                {s.step}
              </div>
              <p className="text-sm text-gray-700">{s.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
