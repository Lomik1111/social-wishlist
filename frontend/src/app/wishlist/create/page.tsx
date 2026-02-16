"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

const occasions = [
  { value: "birthday", emoji: "🎂", label: "День рождения" },
  { value: "new_year", emoji: "🎄", label: "Новый год" },
  { value: "wedding", emoji: "💍", label: "Свадьба" },
  { value: "christmas", emoji: "🎅", label: "Рождество" },
  { value: "other", emoji: "🎁", label: "Другое" },
];

export default function CreateWishlistPage() {
  const router = useRouter();
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
      router.push(`/wishlist/${res.data.id}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-lg">
      {/* Background blob */}
      <div className="blob blob-purple absolute -top-20 -right-20 -z-10 w-72 h-72 opacity-30" />

      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Новый вишлист</h1>
        <p className="mt-2 text-sm text-gray-500">
          Создайте список желаний для любого повода
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-premium p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Название
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="input-premium w-full"
            placeholder="Мой день рождения 2026"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Описание
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input-premium w-full"
            placeholder="Пожелания, предпочтения, размеры..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Повод
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {occasions.map((o) => (
              <div
                key={o.value}
                onClick={() => setOccasion(occasion === o.value ? "" : o.value)}
                className={`cursor-pointer rounded-xl p-4 text-center transition-all ${
                  occasion === o.value
                    ? "border-2 border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                    : "border-2 border-transparent bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="text-2xl mb-1">{o.emoji}</div>
                <div className="text-sm font-medium">{o.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
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
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Создать вишлист
        </button>
      </form>
    </div>
  );
}
