"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import { useConfetti } from "@/components/animations/Confetti";
import {
  SpinnerGap, ArrowLeft, Cake, Tree, Diamond, Snowflake, Gift,
} from "@phosphor-icons/react";

const occasions = [
  { value: "birthday", icon: Cake, label: "День рождения", color: "from-[var(--color-accent-coral)] to-[var(--color-accent-gold)]" },
  { value: "new_year", icon: Tree, label: "Новый год", color: "from-[var(--color-success)] to-[var(--color-success-light)]" },
  { value: "wedding", icon: Diamond, label: "Свадьба", color: "from-[var(--color-accent-gold)] to-[var(--color-accent-coral)]" },
  { value: "christmas", icon: Snowflake, label: "Рождество", color: "from-[var(--color-primary-light)] to-[var(--color-primary)]" },
  { value: "other", icon: Gift, label: "Другое", color: "from-[var(--color-primary)] to-[var(--color-accent-coral)]" },
];

export default function CreateWishlistPage() {
  const router = useRouter();
  const fireConfetti = useConfetti();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [occasion, setOccasion] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/wishlists", {
        title,
        description: description || null,
        occasion: occasion || null,
        event_date: eventDate || null,
      });
      fireConfetti();
      toast.success("Вишлист создан!");
      setTimeout(() => router.push(`/wishlist/${res.data.id}`), 600);
    } catch {
      toast.error("Не удалось создать вишлист");
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-lg">
      {/* Background blob */}
      <div className="blob blob-purple absolute -top-20 -right-20 -z-10 w-72 h-72 opacity-30" />
      <div className="blob blob-coral absolute -bottom-20 -left-20 -z-10 w-64 h-64 opacity-20" />

      {/* Back button */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)]"
      >
        <ArrowLeft size={18} />
        Назад
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text tracking-tight">Новый вишлист</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Создайте список желаний для любого повода
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-premium p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
            Название
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="input-premium w-full"
            placeholder="Мой день рождения 2026"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
            Описание
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
            className="input-premium w-full resize-none"
            placeholder="Пожелания, предпочтения, размеры..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
            Повод
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {occasions.map((o) => {
              const Icon = o.icon;
              const isSelected = occasion === o.value;
              return (
                <div
                  key={o.value}
                  onClick={() => setOccasion(isSelected ? "" : o.value)}
                  className={`cursor-pointer rounded-xl p-4 text-center transition-all ${
                    isSelected
                      ? "border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-2 ring-[var(--color-primary)]/10"
                      : "border-2 border-transparent bg-[var(--color-surface)] hover:bg-[var(--color-primary)]/5"
                  }`}
                >
                  <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${o.color} text-white`}>
                    <Icon size={20} weight="duotone" />
                  </div>
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">{o.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
            Дата события
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="input-premium w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading && <SpinnerGap size={18} className="animate-spin" />}
          Создать вишлист
        </button>
      </form>
    </div>
  );
}
