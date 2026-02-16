"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import {
  formatPrice,
  formatDate,
  pluralize,
  countdownText,
  countdownUrgency,
} from "@/lib/utils";
import type { Wishlist, ItemOwner, AutoFillResult } from "@/types";
import { toast } from "sonner";
import {
  Plus,
  ShareNetwork,
  Gift,
  SpinnerGap,
  Trash,
  ArrowSquareOut,
  Link as LinkIcon,
  MagicWand,
  Image as ImageIcon,
  Eye,
  ArrowLeft,
} from "@phosphor-icons/react";
import EmptyState from "@/components/ui/EmptyState";
import ShareModal from "@/components/ui/ShareModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function WishlistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();

  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<ItemOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Share modal
  const [shareOpen, setShareOpen] = useState(false);

  // Confirm dialog for delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Image error tracking
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // Add item form state
  const [itemName, setItemName] = useState("");
  const [itemUrl, setItemUrl] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [isGroupGift, setIsGroupGift] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  /* ── Fetch wishlist ── */
  const fetchWishlist = async () => {
    try {
      const res = await api.get(`/wishlists/${id}`);
      setWishlist(res.data.wishlist);
      setItems(res.data.items);
    } catch {
      toast.error("Не удалось загрузить вишлист");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) fetchWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  /* ── Auto-fill ── */
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
        toast.success("Данные заполнены автоматически");
      } else {
        toast.error("Не удалось извлечь данные со страницы");
      }
    } catch {
      toast.error("Ошибка автозаполнения. Проверьте ссылку.");
    } finally {
      setAutoFillLoading(false);
    }
  };

  /* ── Add item ── */
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
      toast.success("Подарок добавлен");
      fetchWishlist();
    } catch {
      toast.error("Не удалось добавить подарок");
    } finally {
      setAddingItem(false);
    }
  };

  /* ── Delete item ── */
  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/items/${deleteTarget}`);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget));
      toast.success("Подарок удалён");
    } catch {
      toast.error("Не удалось удалить подарок");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  /* ── Guest preview ── */
  const openGuestPreview = () => {
    if (!wishlist) return;
    window.open(`${window.location.origin}/w/${wishlist.share_token}`, "_blank");
  };

  /* ── Share URL ── */
  const shareUrl = wishlist
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/w/${wishlist.share_token}`
    : "";

  /* ── Stats ── */
  const totalItems = items.length;
  const reservedItems = items.filter((i) => i.is_reserved).length;

  /* ── Countdown ── */
  const countdown = wishlist ? countdownText(wishlist.event_date) : null;
  const urgency = wishlist ? countdownUrgency(wishlist.event_date) : "normal";

  /* ── Loading skeleton ── */
  if (authLoading || loading) {
    return (
      <div className="relative min-h-[60vh] overflow-hidden">
        <div className="dot-pattern absolute inset-0" />

        {/* Header skeleton */}
        <div className="relative mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="skeleton h-8 w-64 rounded-lg" />
            <div className="skeleton h-4 w-40 rounded-lg" />
          </div>
          <div className="flex gap-3">
            <div className="skeleton h-11 w-32 rounded-[var(--radius-md)]" />
            <div className="skeleton h-11 w-44 rounded-[var(--radius-md)]" />
          </div>
        </div>

        {/* Cards skeleton */}
        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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

      {/* ── Back button ── */}
      <button
        onClick={() => router.push("/dashboard")}
        className="btn-ghost mb-4 gap-1.5 !px-3 !py-2 text-sm"
      >
        <ArrowLeft size={18} weight="duotone" />
        К моим вишлистам
      </button>

      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="gradient-text text-3xl font-bold">{wishlist.title}</h1>

            {/* Countdown badge */}
            {countdown && (
              <span
                className={`countdown-badge ${
                  urgency === "urgent" ? "urgent" : urgency === "soon" ? "soon" : ""
                }`}
              >
                {countdown}
              </span>
            )}
          </div>

          {wishlist.description && (
            <p className="mt-2 max-w-lg text-[var(--color-text-secondary)]">
              {wishlist.description}
            </p>
          )}

          {/* Stats */}
          {totalItems > 0 && (
            <div className="mt-3 flex items-center gap-4 text-sm text-[var(--color-text-tertiary)]">
              <span>
                {totalItems}{" "}
                {pluralize(totalItems, "подарок", "подарка", "подарков")}
              </span>
              {reservedItems > 0 && (
                <span className="flex items-center gap-1 text-[var(--color-success)]">
                  <Gift size={14} weight="duotone" />
                  {reservedItems}{" "}
                  {pluralize(
                    reservedItems,
                    "зарезервирован",
                    "зарезервировано",
                    "зарезервировано",
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          {/* Guest preview */}
          <button onClick={openGuestPreview} className="btn-ghost gap-1.5 text-sm">
            <Eye size={18} weight="duotone" />
            Предпросмотр гостя
          </button>

          {/* Share */}
          <button
            onClick={() => setShareOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <ShareNetwork size={18} weight="duotone" />
            Поделиться
          </button>

          {/* Add item */}
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} weight="bold" />
            Добавить подарок
          </button>
        </div>
      </div>

      {/* ── Add Item Form ── */}
      {showAddForm && (
        <div className="animate-slide-up card-premium mb-8 p-6">
          <h3 className="mb-5 text-lg font-semibold text-[var(--color-text-primary)]">
            Новый подарок
          </h3>

          {/* Auto-fill section */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
              Автозаполнение по ссылке
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon
                  size={18}
                  weight="duotone"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
                />
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
                  <SpinnerGap size={18} className="animate-spin" />
                ) : (
                  <MagicWand size={18} weight="duotone" />
                )}
                Заполнить
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-sm text-[var(--color-text-tertiary)]">или</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Manual fields */}
          <form onSubmit={handleAddItem}>
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                  Название <span className="text-[var(--color-accent-coral)]">*</span>
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
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                  Цена (₽)
                </label>
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
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                URL картинки
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <ImageIcon
                    size={18}
                    weight="duotone"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
                  />
                  <input
                    type="url"
                    value={itemImageUrl}
                    onChange={(e) => setItemImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="input-premium w-full pl-10"
                  />
                </div>
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
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                Описание
              </label>
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
                <div className="h-6 w-11 rounded-full bg-gray-200 transition peer-checked:bg-[var(--color-primary)]" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </div>
              <span className="text-sm text-[var(--color-text-secondary)]">
                Групповой подарок
              </span>
            </label>

            <button
              type="submit"
              disabled={addingItem || !itemName.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {addingItem && <SpinnerGap size={18} className="animate-spin" />}
              Добавить
            </button>
          </form>
        </div>
      )}

      {/* ── Items Grid ── */}
      {items.length === 0 ? (
        <EmptyState
          illustration="/illustrations/empty-wishlist.svg"
          title="Вишлист пуст"
          description="Добавьте первый подарок, чтобы ваши друзья знали, что вам подарить"
          action={
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} weight="bold" />
              Добавить подарок
            </button>
          }
        />
      ) : (
        <div className="stagger-children grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const imgBroken = brokenImages.has(item.id);

            return (
              <div
                key={item.id}
                className="card-premium group relative overflow-hidden"
              >
                {/* Image area */}
                <div className="img-zoom relative h-48 w-full overflow-hidden">
                  {item.image_url && !imgBroken ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      onError={() =>
                        setBrokenImages((prev) => new Set(prev).add(item.id))
                      }
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--color-primary-light)]/20 to-[var(--color-accent-coral)]/10">
                      <Gift
                        size={48}
                        weight="duotone"
                        className="text-[var(--color-primary-light)]"
                      />
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => setDeleteTarget(item.id)}
                    className="absolute right-3 top-3 rounded-full bg-white/80 p-2 opacity-0 backdrop-blur transition hover:bg-red-50 hover:text-[var(--color-danger)] group-hover:opacity-100"
                    title="Удалить"
                  >
                    <Trash size={16} weight="duotone" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="mb-1 line-clamp-2 text-lg font-semibold text-[var(--color-text-primary)]">
                    {item.name}
                  </h3>

                  {item.price && (
                    <p className="gradient-text mb-2 text-lg font-bold">
                      {formatPrice(item.price)}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {item.is_reserved && (
                      <span className="badge badge-green">Зарезервирован</span>
                    )}
                    {item.is_group_gift && (
                      <span className="badge badge-purple">Групповой подарок</span>
                    )}
                  </div>

                  {/* Group gift progress */}
                  {item.is_group_gift &&
                    item.price &&
                    parseFloat(item.contribution_total) > 0 && (
                      <div className="mb-3">
                        <div className="mb-1 flex justify-between text-xs text-[var(--color-text-tertiary)]">
                          <span>Собрано {formatPrice(item.contribution_total)}</span>
                          <span>{Math.round(item.progress_percentage)}%</span>
                        </div>
                        <div className="progress-bar-animated">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(item.progress_percentage, 100)}%`,
                            }}
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
                      className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)]"
                    >
                      <ArrowSquareOut size={14} weight="duotone" />
                      Перейти к товару
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Share Modal ── */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        title={wishlist.title}
      />

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteItem}
        title="Удалить подарок?"
        description="Это действие нельзя отменить. Подарок будет удалён из вишлиста."
        confirmText="Удалить"
        loading={deleting}
      />
    </div>
  );
}
