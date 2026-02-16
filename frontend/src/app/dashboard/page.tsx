"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Wishlist } from "@/types";
import { Plus, Gift, Share2, Calendar, Loader2, ExternalLink, Sparkles } from "lucide-react";

const occasionConfig: Record<string, { emoji: string; badge: string }> = {
  birthday: { emoji: "🎂", badge: "badge-pink" },
  new_year: { emoji: "🎄", badge: "badge-blue" },
  wedding: { emoji: "💍", badge: "badge-pink" },
  christmas: { emoji: "🎅", badge: "badge-amber" },
  other: { emoji: "🎁", badge: "badge-purple" },
};

const occasionLabels: Record<string, string> = {
  birthday: "День рождения",
  new_year: "Новый год",
  wedding: "Свадьба",
  christmas: "Рождество",
  other: "Другое",
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      api
        .get("/wishlists")
        .then((res) => {
          setWishlists(res.data);
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user]);

  const copyLink = (shareToken: string, id: string) => {
    const url = `${window.location.origin}/w/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-48 mb-2 rounded-lg" />
            <div className="skeleton h-4 w-32 rounded-lg" />
          </div>
          <div className="skeleton h-10 w-28 rounded-xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-premium p-6">
              <div className="skeleton h-4 w-3/4 mb-3 rounded" />
              <div className="skeleton h-3 w-1/2 mb-6 rounded" />
              <div className="skeleton h-3 w-1/3 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Мои вишлисты</h1>
          <p className="mt-1 text-sm text-gray-500">
            {wishlists.length > 0
              ? `У вас ${wishlists.length} ${wishlists.length === 1 ? "вишлист" : "вишлистов"}`
              : "Создайте свой первый вишлист"}
          </p>
        </div>
        <Link href="/wishlist/create" className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Создать
          <Sparkles className="h-4 w-4" />
        </Link>
      </div>

      {wishlists.length === 0 ? (
        <div className="relative flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-gray-200 py-20 overflow-hidden">
          {/* Dot pattern background */}
          <div
            className="absolute inset-0 -z-10 opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle, #c4b5fd 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Decorative SVG: stylized empty gift box with question mark */}
          <div className="animate-float">
            <svg
              width="150"
              height="150"
              viewBox="0 0 150 150"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Box body */}
              <rect x="25" y="65" width="100" height="65" rx="8" fill="url(#giftGrad)" opacity="0.15" />
              <rect x="25" y="65" width="100" height="65" rx="8" stroke="#667eea" strokeWidth="2.5" />
              {/* Box lid */}
              <rect x="20" y="50" width="110" height="20" rx="6" fill="url(#giftGrad)" opacity="0.25" />
              <rect x="20" y="50" width="110" height="20" rx="6" stroke="#667eea" strokeWidth="2.5" />
              {/* Ribbon vertical */}
              <rect x="70" y="50" width="10" height="80" fill="#f093fb" opacity="0.4" />
              <line x1="75" y1="50" x2="75" y2="130" stroke="#f093fb" strokeWidth="2" />
              {/* Ribbon horizontal */}
              <rect x="20" y="55" width="110" height="10" fill="#f093fb" opacity="0.2" />
              {/* Bow left */}
              <ellipse cx="62" cy="46" rx="14" ry="10" fill="none" stroke="#f093fb" strokeWidth="2.5" />
              {/* Bow right */}
              <ellipse cx="88" cy="46" rx="14" ry="10" fill="none" stroke="#f093fb" strokeWidth="2.5" />
              {/* Bow knot */}
              <circle cx="75" cy="48" r="5" fill="#f093fb" />
              {/* Question mark */}
              <text
                x="75"
                y="108"
                textAnchor="middle"
                fontSize="32"
                fontWeight="bold"
                fill="#667eea"
                opacity="0.6"
              >
                ?
              </text>
              <defs>
                <linearGradient id="giftGrad" x1="25" y1="50" x2="125" y2="130" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#667eea" />
                  <stop offset="1" stopColor="#f093fb" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h3 className="text-xl font-bold text-gray-800">Пока пусто</h3>
          <p className="max-w-sm text-center text-sm text-gray-500">
            Создайте свой первый вишлист и поделитесь им с близкими
          </p>
          <Link href="/wishlist/create" className="btn-primary">
            Создать вишлист
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((w, index) => (
            <div
              key={w.id}
              className="group card-premium p-6 animate-fade-in relative"
              style={{ animationDelay: `${(index % 6) * 100}ms` }}
            >
              <Link href={`/wishlist/${w.id}`} className="block">
                <div className="mb-3 flex items-start justify-between">
                  <h3 className={`text-lg font-semibold text-gray-900 transition group-hover:gradient-text`}>
                    {w.title}
                  </h3>
                  <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-violet-400 transition shrink-0 ml-2" />
                </div>

                {w.occasion && occasionConfig[w.occasion] && (
                  <span className={`${occasionConfig[w.occasion].badge} mb-2 inline-flex items-center gap-1`}>
                    <span>{occasionConfig[w.occasion].emoji}</span>
                    {occasionLabels[w.occasion] || w.occasion}
                  </span>
                )}

                {w.description && (
                  <p className="mb-3 text-sm text-gray-500 line-clamp-2">{w.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Gift className="h-3.5 w-3.5" />
                    {w.item_count} {w.item_count === 1 ? "подарок" : "подарков"}
                  </span>
                  {w.event_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(w.event_date)}
                    </span>
                  )}
                </div>
              </Link>

              <div className="mt-4 border-t border-gray-100 pt-3">
                <button
                  onClick={() => copyLink(w.share_token, w.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-600 transition hover:text-violet-700"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {copiedId === w.id ? "Скопировано!" : "Скопировать ссылку"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
