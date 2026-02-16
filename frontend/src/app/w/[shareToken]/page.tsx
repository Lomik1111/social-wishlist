"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { createWishlistSocket, type WSMessage } from "@/lib/websocket";
import { formatPrice, formatDate } from "@/lib/utils";
import type { WishlistPublic, ItemPublic } from "@/types";
import {
  Gift, Lock, User, Calendar, ExternalLink,
  CheckCircle, Heart, Loader2, X, ArrowLeft,
} from "lucide-react";

export default function PublicWishlistPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [wishlist, setWishlist] = useState<WishlistPublic | null>(null);
  const [items, setItems] = useState<ItemPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Guest state
  const [guestName, setGuestName] = useState("");
  const [guestId, setGuestId] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "reserve" | "contribute";
    itemId: string;
  } | null>(null);

  // Track which items this guest reserved (itemId -> reservationId)
  const [reservedByMe, setReservedByMe] = useState<Record<string, string>>({});

  // Contribution modal
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contribItemId, setContribItemId] = useState("");
  const [contribAmount, setContribAmount] = useState("");
  const [contribMessage, setContribMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Initialize guest identity
  useEffect(() => {
    const storedName = localStorage.getItem("guest_name");
    const storedId = localStorage.getItem("guest_identifier");
    if (storedName) setGuestName(storedName);
    if (storedId) setGuestId(storedId);
    else {
      const newId = crypto.randomUUID();
      localStorage.setItem("guest_identifier", newId);
      setGuestId(newId);
    }

    // Restore reserved items from localStorage
    try {
      const stored = localStorage.getItem("reserved_items");
      if (stored) setReservedByMe(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Persist reservedByMe to localStorage
  useEffect(() => {
    localStorage.setItem("reserved_items", JSON.stringify(reservedByMe));
  }, [reservedByMe]);

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await api.get(`/wishlists/public/${shareToken}`);
      setWishlist(res.data.wishlist);
      setItems(res.data.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [shareToken]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // WebSocket
  useEffect(() => {
    if (!wishlist) return;
    const socket = createWishlistSocket(wishlist.id, (msg: WSMessage) => {
      switch (msg.type) {
        case "item_reserved":
          setItems((prev) =>
            prev.map((i) =>
              i.id === msg.item_id
                ? { ...i, is_reserved: msg.is_fully_reserved as boolean }
                : i
            )
          );
          break;
        case "item_unreserved":
          setItems((prev) =>
            prev.map((i) =>
              i.id === msg.item_id ? { ...i, is_reserved: false } : i
            )
          );
          break;
        case "contribution_added":
        case "contribution_removed":
          setItems((prev) =>
            prev.map((i) =>
              i.id === msg.item_id
                ? {
                    ...i,
                    contribution_total: String(msg.new_total),
                    contribution_count: msg.contribution_count as number,
                    progress_percentage: msg.progress_percentage as number,
                  }
                : i
            )
          );
          break;
        case "item_added":
          fetchWishlist();
          break;
        case "item_deleted":
          setItems((prev) => prev.filter((i) => i.id !== msg.item_id));
          break;
        case "item_updated":
          fetchWishlist();
          break;
      }
    });

    return () => socket.close();
  }, [wishlist, fetchWishlist]);

  // Guest name flow
  const ensureGuestName = (action: {
    type: "reserve" | "contribute";
    itemId: string;
  }) => {
    if (guestName) return true;
    setPendingAction(action);
    setShowNameModal(true);
    return false;
  };

  const handleNameSubmit = () => {
    if (!guestName.trim()) return;
    localStorage.setItem("guest_name", guestName.trim());
    setShowNameModal(false);
    if (pendingAction) {
      if (pendingAction.type === "reserve") {
        doReserve(pendingAction.itemId);
      } else {
        setContribItemId(pendingAction.itemId);
        setContribAmount("");
        setContribMessage("");
        setShowContributeModal(true);
      }
      setPendingAction(null);
    }
  };

  // Reserve
  const doReserve = async (itemId: string) => {
    setSubmitting(true);
    try {
      const res = await api.post(`/items/${itemId}/reserve`, {
        guest_name: guestName,
        guest_identifier: guestId,
      });
      const reservationId = res.data.id;
      setReservedByMe((prev) => ({ ...prev, [itemId]: reservationId }));
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, is_reserved: true } : i
        )
      );
    } catch {
      // already reserved
    } finally {
      setSubmitting(false);
    }
  };

  const handleReserve = (itemId: string) => {
    if (ensureGuestName({ type: "reserve", itemId })) {
      doReserve(itemId);
    }
  };

  // Unreserve
  const handleUnreserve = async (itemId: string) => {
    const reservationId = reservedByMe[itemId];
    if (!reservationId) return;
    setSubmitting(true);
    try {
      await api.delete(`/reservations/${reservationId}`, {
        data: { guest_identifier: guestId },
      });
      setReservedByMe((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, is_reserved: false } : i
        )
      );
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  // Contribute
  const handleContributeClick = (itemId: string) => {
    if (ensureGuestName({ type: "contribute", itemId })) {
      setContribItemId(itemId);
      setContribAmount("");
      setContribMessage("");
      setShowContributeModal(true);
    }
  };

  const handleContribute = async () => {
    if (!contribAmount || parseFloat(contribAmount) <= 0) return;
    setSubmitting(true);
    try {
      await api.post(`/items/${contribItemId}/contribute`, {
        amount: parseFloat(contribAmount),
        message: contribMessage || null,
        guest_name: guestName,
        guest_identifier: guestId,
      });
      setShowContributeModal(false);
      fetchWishlist();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  // Get the item currently being contributed to
  const contribItem = items.find((i) => i.id === contribItemId);
  const contribRemaining =
    contribItem?.price
      ? Math.max(
          parseFloat(contribItem.price) -
            parseFloat(contribItem.contribution_total || "0"),
          0
        )
      : 0;

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-6xl">
          {/* Header skeleton */}
          <div className="mb-10 flex flex-col items-center gap-4">
            <div className="skeleton h-14 w-14 rounded-2xl" />
            <div className="skeleton h-8 w-64" />
            <div className="skeleton h-4 w-40" />
          </div>
          {/* Cards skeleton */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="overflow-hidden rounded-[20px]">
                <div className="skeleton h-48 w-full" />
                <div className="space-y-3 p-5">
                  <div className="skeleton h-5 w-3/4" />
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- ERROR / NOT FOUND ---
  if (error || !wishlist) {
    return (
      <div className="dot-pattern flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="text-center animate-fade-in">
          <div className="mb-4 text-6xl">😔</div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800">
            Вишлист не найден
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            Возможно, ссылка устарела или список был удалён
          </p>
          <Link
            href="/"
            className="btn-primary inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* ===== HEADER ===== */}
        <div className="relative mb-10 overflow-hidden rounded-3xl bg-white/60 px-6 py-10 text-center backdrop-blur-sm">
          {/* Background blobs */}
          <div className="blob blob-purple absolute -left-20 -top-20 h-64 w-64 opacity-20" />
          <div className="blob blob-pink absolute -bottom-16 -right-16 h-56 w-56 opacity-20" />

          <div className="relative z-10">
            {/* Gift icon */}
            <div className="mb-5 flex justify-center">
              <div className="animate-float rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 p-3 shadow-lg shadow-violet-500/25">
                <Gift className="h-8 w-8 text-white" />
              </div>
            </div>

            {/* Title */}
            <h1 className="mb-2 text-4xl font-extrabold text-gray-900">
              {wishlist.title}
            </h1>

            {/* Owner */}
            {wishlist.owner_name && (
              <p className="mb-3 flex items-center justify-center gap-1.5 text-gray-500">
                <User className="h-4 w-4" />
                {wishlist.owner_name}
              </p>
            )}

            {/* Description */}
            {wishlist.description && (
              <p className="mx-auto mb-3 max-w-lg text-sm text-gray-600">
                {wishlist.description}
              </p>
            )}

            {/* Event date */}
            {wishlist.event_date && (
              <p className="mb-4 flex items-center justify-center gap-1.5 text-sm text-gray-400">
                <Calendar className="h-4 w-4" />
                {formatDate(wishlist.event_date)}
              </p>
            )}

            {/* Privacy notice */}
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-2 backdrop-blur-sm">
              <Lock className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">
                Владелец не видит кто резервирует
              </span>
            </div>
          </div>
        </div>

        {/* ===== ITEMS GRID ===== */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 animate-fade-in">
            <Gift className="h-14 w-14 text-gray-300" />
            <p className="text-gray-500">В этом вишлисте пока нет подарков</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => {
              const isReservedByMe = !!reservedByMe[item.id];
              const progress = item.progress_percentage ?? 0;
              const collected = parseFloat(item.contribution_total || "0");
              const price = item.price ? parseFloat(item.price) : 0;
              const delayClass =
                index % 5 === 0
                  ? "delay-100"
                  : index % 5 === 1
                    ? "delay-200"
                    : index % 5 === 2
                      ? "delay-300"
                      : index % 5 === 3
                        ? "delay-400"
                        : "delay-500";

              return (
                <div
                  key={item.id}
                  className={`card-premium animate-fade-in ${delayClass} relative overflow-hidden`}
                >
                  {/* Reserved ribbon */}
                  {item.is_reserved && !item.is_group_gift && (
                    <div className="reserved-ribbon">Занят</div>
                  )}

                  {/* Image */}
                  {item.image_url ? (
                    <div className="img-zoom h-48 w-full">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-violet-50 to-fuchsia-50">
                      <Gift className="h-12 w-12 text-violet-300" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5">
                    {/* Name */}
                    <h3 className="mb-1.5 text-lg font-bold text-gray-900 line-clamp-2">
                      {item.name}
                    </h3>

                    {/* Description */}
                    {item.description && (
                      <p className="mb-2 text-xs text-gray-500 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Price */}
                    {item.price && (
                      <p className="gradient-text mb-3 text-xl font-extrabold">
                        {formatPrice(item.price)}
                      </p>
                    )}

                    {/* Link */}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-3 flex items-center gap-1 text-xs text-violet-500 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Посмотреть товар
                      </a>
                    )}

                    {/* Group gift progress */}
                    {item.is_group_gift && item.price && (
                      <div className="mb-4">
                        <div className="progress-bar-animated mb-1.5">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(progress, 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Собрано {formatPrice(collected)} из{" "}
                          {formatPrice(item.price)} ({Math.round(progress)}
                          %)
                        </p>
                        {item.contribution_count > 0 && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {item.contribution_count}{" "}
                            {item.contribution_count === 1
                              ? "участник"
                              : "участников"}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    {item.is_group_gift ? (
                      <button
                        onClick={() => handleContributeClick(item.id)}
                        disabled={submitting}
                        className="btn-primary w-full text-sm"
                      >
                        <Heart className="h-4 w-4" />
                        Скинуться
                        {progress > 0 && (
                          <span className="ml-1 opacity-75">
                            ({Math.round(progress)}%)
                          </span>
                        )}
                      </button>
                    ) : isReservedByMe ? (
                      <button
                        onClick={() => handleUnreserve(item.id)}
                        disabled={submitting}
                        className="btn-secondary w-full text-sm"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Отменить
                      </button>
                    ) : item.is_reserved ? (
                      <div className="badge-green badge w-full justify-center py-2.5 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        Зарезервирован
                      </div>
                    ) : (
                      <button
                        onClick={() => handleReserve(item.id)}
                        disabled={submitting}
                        className="btn-primary w-full text-sm"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Gift className="h-4 w-4" />
                        )}
                        Зарезервировать
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== GUEST NAME MODAL ===== */}
      {showNameModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            {/* Gradient header strip */}
            <div className="h-2 bg-gradient-to-r from-violet-600 to-fuchsia-500" />
            <div className="p-8">
              <div className="mb-2 text-4xl">&#128075;</div>
              <h3 className="mb-1 text-xl font-bold text-gray-900">
                Как вас зовут?
              </h3>
              <p className="mb-6 text-sm text-gray-500">
                Чтобы друзья знали от кого подарок
              </p>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ваше имя"
                className="input-premium mb-5"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
              />
              <button
                onClick={handleNameSubmit}
                disabled={!guestName.trim()}
                className="btn-primary w-full text-sm"
              >
                Продолжить
              </button>
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setPendingAction(null);
                }}
                className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONTRIBUTION MODAL ===== */}
      {showContributeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            {/* Gradient header strip */}
            <div className="h-2 bg-gradient-to-r from-violet-600 to-fuchsia-500" />
            <div className="p-8">
              <h3 className="mb-1 text-xl font-bold text-gray-900">
                Внести вклад
              </h3>
              {contribItem && (
                <p className="mb-1 text-sm text-gray-500">{contribItem.name}</p>
              )}
              {contribItem?.price && contribRemaining > 0 && (
                <p className="mb-5 text-xs text-gray-400">
                  Осталось: {formatPrice(contribRemaining)}
                </p>
              )}

              {/* Amount input */}
              <div className="mb-4">
                <input
                  type="number"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  min="1"
                  placeholder="Сумма, ₽"
                  className="input-premium"
                  autoFocus
                />

                {/* Quick amount buttons */}
                <div className="mt-3 flex gap-2">
                  {[100, 500, 1000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setContribAmount(String(v))}
                      className="cursor-pointer rounded-full border border-gray-200 px-4 py-2 text-sm font-medium transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-600"
                    >
                      {v} ₽
                    </button>
                  ))}
                  {contribRemaining > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setContribAmount(String(contribRemaining))
                      }
                      className="cursor-pointer rounded-full border border-gray-200 px-4 py-2 text-sm font-medium transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-600"
                    >
                      Всё
                    </button>
                  )}
                </div>
              </div>

              {/* Message */}
              <div className="mb-5">
                <textarea
                  value={contribMessage}
                  onChange={(e) => setContribMessage(e.target.value)}
                  rows={2}
                  className="input-premium resize-none"
                  placeholder="Сообщение (необязательно)"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleContribute}
                disabled={
                  submitting ||
                  !contribAmount ||
                  parseFloat(contribAmount) <= 0
                }
                className="btn-primary w-full text-sm"
              >
                {submitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Внести {contribAmount ? `${contribAmount} ₽` : ""}
              </button>

              <button
                onClick={() => setShowContributeModal(false)}
                className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
