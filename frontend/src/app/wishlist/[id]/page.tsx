"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { Wishlist, ItemOwner, AutoFillResult } from "@/types";
import {
  Plus, Share2, Gift, Loader2, Trash2, ExternalLink,
  Link as LinkIcon, Wand2, ImageIcon,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* ── Loading state ── */
  if (authLoading || loading) {
    return (
      <div className="relative min-h-[60vh] overflow-hidden">
        <div className="dot-pattern absolute inset-0" />
        <div className="relative grid grid-cols-1 gap-6 pt-16 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-premium overflow-hidden">
              <div className="skeleton h-48 w-full rounded-none" />
              <div className="space-y-3 p-5">
                <div className="skeleton h-5 w-3/4 rounded-lg" />
                <div className="skeleton h-4 w-1/3 rounded-lg" />
                <div className="skeleton h-3 w-1/2 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!wishlist) return null;

  return (
    <div className="animate-fade-in relative">
      {/* ── Decorative blobs ── */}
      <div className="blob blob-purple -right-40 -top-40 opacity-20" />

      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="gradient-text text-3xl font-bold">{wishlist.title}</h1>
          {wishlist.description && (
            <p className="mt-2 max-w-lg text-gray-500">{wishlist.description}</p>
          )}
        </div>

        <div className="flex shrink-0 gap-3">
          <button onClick={copyLink} className="btn-secondary flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            {copied ? "Скопировано!" : "Поделиться"}
          </button>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Добавить подарок
          </button>
        </div>
      </div>

      {/* ── Add Item Form ── */}
      {showAddForm && (
        <div className="animate-slide-up card-premium mb-8 p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-900">Новый подарок</h3>

          {/* Auto-fill section */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-500">Автозаполнение по ссылке</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={itemUrl}
                  onChange={(e) => setItemUrl(e.target.value)}
                  placeholder="https://example.com/product"
                  className="input-premium w-full pl-10"
                />
              </div>
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={!itemUrl || autoFillLoading}
                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
              >
                {autoFillLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Заполнить
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="border-t border-gray-200 flex-1" />
            <span className="text-sm text-gray-400">или</span>
            <div className="border-t border-gray-200 flex-1" />
          </div>

          {/* Manual fields */}
          <form onSubmit={handleAddItem}>
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Название <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  placeholder="Что хотите получить?"
                  className="input-premium w-full"
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
                  placeholder="0"
                  className="input-premium w-full"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">URL картинки</label>
              <div className="flex items-center gap-3">
                <input
                  type="url"
                  value={itemImageUrl}
                  onChange={(e) => setItemImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="input-premium w-full"
                />
                {itemImageUrl && (
                  <img
                    src={itemImageUrl}
                    alt="Превью"
                    className="h-20 w-20 shrink-0 rounded-xl object-cover ring-1 ring-gray-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Описание</label>
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={2}
                placeholder="Размер, цвет, любые подробности..."
                className="input-premium w-full resize-none"
              />
            </div>

            {/* Group gift toggle */}
            <label className="mb-5 flex cursor-pointer items-center gap-3">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isGroupGift}
                  onChange={(e) => setIsGroupGift(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-200 transition peer-checked:bg-violet-500" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </div>
              <span className="text-sm text-gray-700">Групповой подарок</span>
            </label>

            <button
              type="submit"
              disabled={addingItem || !itemName.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {addingItem && <Loader2 className="h-4 w-4 animate-spin" />}
              Добавить
            </button>
          </form>
        </div>
      )}

      {/* ── Items Grid ── */}
      {items.length === 0 ? (
        /* Empty state */
        <div className="dot-pattern relative flex flex-col items-center justify-center rounded-3xl py-20">
          <svg
            className="mb-6 h-24 w-24 text-violet-400"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="20" y="40" width="60" height="45" rx="4" />
            <path d="M20 55h60" />
            <path d="M50 40v45" />
            <path d="M50 40c-5-15-25-15-20 0" />
            <path d="M50 40c5-15 25-15 20 0" />
            <circle cx="50" cy="30" r="3" fill="currentColor" />
          </svg>
          <h3 className="mb-2 text-xl font-semibold text-gray-700">Вишлист пуст</h3>
          <p className="mb-6 text-gray-500">Добавьте первый подарок</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Добавить подарок
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, idx) => {
            const delayClass =
              idx % 5 === 0
                ? "delay-100"
                : idx % 5 === 1
                ? "delay-200"
                : idx % 5 === 2
                ? "delay-300"
                : idx % 5 === 3
                ? "delay-400"
                : "delay-500";

            return (
              <div
                key={item.id}
                className={`card-premium animate-fade-in ${delayClass} group relative overflow-hidden`}
              >
                {/* Image area */}
                <div className="relative h-48 w-full overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="img-zoom h-full w-full rounded-t-[20px] object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-t-[20px] bg-gradient-to-br from-violet-100 to-purple-100">
                      <Gift className="h-12 w-12 text-violet-300" />
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="absolute right-3 top-3 rounded-full bg-white/80 p-2 opacity-0 backdrop-blur transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="mb-1 font-semibold text-lg text-gray-900 line-clamp-2">
                    {item.name}
                  </h3>

                  {item.price && (
                    <p className="gradient-text mb-2 text-lg font-bold">
                      {formatPrice(item.price)}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.is_reserved && (
                      <span className="badge-green">Зарезервирован</span>
                    )}
                    {item.is_group_gift && (
                      <span className="badge-purple">Групповой подарок</span>
                    )}
                  </div>

                  {/* Group gift progress */}
                  {item.is_group_gift && item.price && parseFloat(item.contribution_total) > 0 && (
                    <div className="mb-3">
                      <div className="mb-1 flex justify-between text-xs text-gray-500">
                        <span>Собрано {formatPrice(item.contribution_total)}</span>
                        <span>{Math.round(item.progress_percentage)}%</span>
                      </div>
                      <div className="progress-bar-animated">
                        <div
                          style={{ width: `${Math.min(item.progress_percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* External link */}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Перейти к товару
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
