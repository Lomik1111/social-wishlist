"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Wishlist } from "@/types";
import { Plus, Gift, Share2, Calendar, Loader2, ExternalLink } from "lucide-react";

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
      api.get("/wishlists").then((res) => {
        setWishlists(res.data);
      }).catch(() => {}).finally(() => {
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

  const occasionLabels: Record<string, string> = {
    birthday: "День рождения",
    new_year: "Новый год",
    wedding: "Свадьба",
    christmas: "Рождество",
    other: "Другое",
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Мои вишлисты</h1>
          <p className="mt-1 text-sm text-gray-500">
            {wishlists.length > 0
              ? `У вас ${wishlists.length} ${wishlists.length === 1 ? "вишлист" : "вишлистов"}`
              : "Создайте свой первый вишлист"}
          </p>
        </div>
        <Link
          href="/wishlist/create"
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Создать
        </Link>
      </div>

      {wishlists.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
            <Gift className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">Пока нет вишлистов</h3>
          <p className="max-w-sm text-center text-sm text-gray-500">
            Создайте свой первый вишлист и поделитесь им с друзьями
          </p>
          <Link
            href="/wishlist/create"
            className="mt-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Создать вишлист
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((w) => (
            <div
              key={w.id}
              className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <Link href={`/wishlist/${w.id}`} className="block">
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition">
                    {w.title}
                  </h3>
                  <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition" />
                </div>
                {w.occasion && (
                  <span className="mb-2 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
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
              <div className="mt-4 border-t border-gray-50 pt-3">
                <button
                  onClick={() => copyLink(w.share_token, w.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 transition hover:text-indigo-700"
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
