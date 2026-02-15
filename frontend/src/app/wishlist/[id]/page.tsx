"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { Wishlist, ItemOwner, AutoFillResult } from "@/types";
import {
  Plus, Share2, Gift, Loader2, Trash2, ExternalLink,
  Link as LinkIcon, Wand2, X, Users, Check,
} from "lucide-react";

export default function WishlistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<ItemOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copied, setCopied] = useState(false);

  // Add item form state
  const [itemName, setItemName] = useState("");
  const [itemUrl, setItemUrl] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [isGroupGift, setIsGroupGift] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchWishlist = async () => {
    try {
      const res = await api.get(`/wishlists/${id}`);
      setWishlist(res.data.wishlist);
      setItems(res.data.items);
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) fetchWishlist();
  }, [user, id]);

  const handleAutoFill = async () => {
    if (!itemUrl) return;
    setAutoFillLoading(true);
    try {
      const res = await api.post<AutoFillResult>("/autofill", { url: itemUrl });
      if (res.data.success) {
        if (res.data.title) setItemName(res.data.title);
        if (res.data.image_url) setItemImageUrl(res.data.image_url);
        if (res.data.price) setItemPrice(String(res.data.price));
        if (res.data.description) setItemDescription(res.data.description);
      }
    } catch {
      // silent
    } finally {
      setAutoFillLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingItem(true);
    try {
      await api.post(`/wishlists/${id}/items`, {
        name: itemName,
        url: itemUrl || null,
        image_url: itemImageUrl || null,
        price: itemPrice ? parseFloat(itemPrice) : null,
        description: itemDescription || null,
        is_group_gift: isGroupGift,
      });
      setItemName("");
      setItemUrl("");
      setItemPrice("");
      setItemImageUrl("");
      setItemDescription("");
      setIsGroupGift(false);
      setShowAddForm(false);
      fetchWishlist();
    } catch {
      // silent
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await api.delete(`/items/${itemId}`);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch {
      // silent
    }
  };

  const copyLink = () => {
    if (!wishlist) return;
    navigator.clipboard.writeText(`${window.location.origin}/w/${wishlist.share_token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!wishlist) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{wishlist.title}</h1>
          {wishlist.description && <p className="mt-1 text-sm text-gray-500">{wishlist.description}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
            {copied ? "Скопировано!" : "Поделиться"}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </button>
        </div>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Новый подарок</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Auto-fill */}
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                value={itemUrl}
                onChange={(e) => setItemUrl(e.target.value)}
                placeholder="Вставьте ссылку на товар"
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <button
              type="button"
              onClick={handleAutoFill}
              disabled={!itemUrl || autoFillLoading}
              className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
            >
              {autoFillLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Заполнить
            </button>
          </div>

          <form onSubmit={handleAddItem}>
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Название</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Цена (₽)</label>
                <input
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">URL картинки</label>
              <input
                type="url"
                value={itemImageUrl}
                onChange={(e) => setItemImageUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Описание</label>
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <label className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={isGroupGift}
                onChange={(e) => setIsGroupGift(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Можно скинуться вместе</span>
            </label>

            <button
              type="submit"
              disabled={addingItem}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {addingItem && <Loader2 className="h-4 w-4 animate-spin" />}
              Добавить подарок
            </button>
          </form>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
            <Gift className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">Вишлист пуст</h3>
          <p className="text-sm text-gray-500">Добавьте первый подарок!</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Добавить подарок
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="group relative rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md overflow-hidden">
              {/* Image */}
              {item.image_url && (
                <div className="h-40 w-full overflow-hidden bg-gray-100">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}

              <div className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{item.name}</h3>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="ml-2 shrink-0 rounded p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {item.price && (
                  <p className="mb-2 text-lg font-bold text-indigo-600">{formatPrice(item.price)}</p>
                )}

                {/* Status badges */}
                <div className="flex flex-wrap gap-1.5">
                  {item.is_reserved && (
                    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Зарезервировано
                    </span>
                  )}
                  {item.is_group_gift && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      <Users className="h-3 w-3" />
                      Совместный подарок
                    </span>
                  )}
                </div>

                {/* Group gift progress */}
                {item.is_group_gift && item.price && parseFloat(item.contribution_total) > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                      <span>Собрано {formatPrice(item.contribution_total)}</span>
                      <span>{Math.round(item.progress_percentage)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${Math.min(item.progress_percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-1 text-xs text-indigo-500 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Перейти к товару
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
