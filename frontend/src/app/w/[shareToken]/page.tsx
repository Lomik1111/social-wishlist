"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import api from "@/lib/api";
import { createWishlistSocket, type WSMessage } from "@/lib/websocket";
import { formatPrice, formatDate, pluralize, countdownText, countdownUrgency } from "@/lib/utils";
import { useConfetti } from "@/components/animations/Confetti";
import EmptyState from "@/components/ui/EmptyState";
import { toast } from "sonner";
import type { WishlistPublic, ItemPublic } from "@/types";
import {
  Gift, Lock, User, Calendar, ArrowSquareOut,
  CheckCircle, Heart, SpinnerGap, X, ArrowLeft,
  Funnel, Users,
} from "@phosphor-icons/react";

type FilterType = "all" | "available" | "reserved" | "group";

export default function PublicWishlistPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [wishlist, setWishlist] = useState<WishlistPublic | null>(null);
  const [items, setItems] = useState<ItemPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  // Per-item submitting state
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

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

  // Image error tracking
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const fireConfetti = useConfetti();
  const prevProgressRef = useRef<Record<string, number>>({});

  // --- Helpers ---
  const setItemSubmitting = (itemId: string, value: boolean) => {
    setSubmitting((prev) => ({ ...prev, [itemId]: value }));
  };

  // --- Filter logic ---
  const filteredItems = items.filter((item) => {
    if (filter === "available") return !item.is_reserved && !item.is_group_gift;
    if (filter === "reserved") return item.is_reserved;
    if (filter === "group") return item.is_group_gift;
    return true;
  });

  // --- Stats ---
  const totalItems = items.length;
  const reservedCount = items.filter((i) => i.is_reserved).length;
  const contributorCount = items.reduce((sum, i) => sum + i.contribution_count, 0);

  // --- Countdown ---
  const countdown = countdownText(wishlist?.event_date);
  const urgency = countdownUrgency(wishlist?.event_date);

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
      // ignore corrupt data
    }
  }, []);

  // Persist reservedByMe to localStorage
  useEffect(() => {
    localStorage.setItem("reserved_items", JSON.stringify(reservedByMe));
  }, [reservedByMe]);

  // Track progress for confetti on 100%
  useEffect(() => {
    items.forEach((item) => {
      if (item.is_group_gift) {
        const prevProgress = prevProgressRef.current[item.id] ?? 0;
        const curProgress = item.progress_percentage ?? 0;
        if (prevProgress < 100 && curProgress >= 100) {
          fireConfetti();
          toast.success("Подарок полностью собран!");
        }
        prevProgressRef.current[item.id] = curProgress;
      }
    });
  }, [items, fireConfetti]);

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await api.get(`/wishlists/public/${shareToken}`);
      setWishlist(res.data.wishlist);
      setItems(res.data.items);
    } catch {
      setError(true);
      toast.error("Не удалось загрузить вишлист");
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

  // --- Guest name flow ---
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

  // --- Reserve ---
  const doReserve = async (itemId: string) => {
    setItemSubmitting(itemId, true);
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
      toast.success("Подарок зарезервирован!");
      fireConfetti();
    } catch {
      toast.error("Не удалось зарезервировать. Возможно, кто-то уже успел.");
    } finally {
      setItemSubmitting(itemId, false);
    }
  };

  const handleReserve = (itemId: string) => {
    if (ensureGuestName({ type: "reserve", itemId })) {
      doReserve(itemId);
    }
  };

  // --- Unreserve ---
  const handleUnreserve = async (itemId: string) => {
    const reservationId = reservedByMe[itemId];
    if (!reservationId) return;
    setItemSubmitting(itemId, true);
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
      toast("Бронирование снято");
    } catch {
      toast.error("Не удалось отменить бронирование");
    } finally {
      setItemSubmitting(itemId, false);
    }
  };

  // --- Contribute ---
  const handleContributeClick = (itemId: string) => {
    if (ensureGuestName({ type: "contribute", itemId })) {
      setContribItemId(itemId);
      setContribAmount("");
      setContribMessage("");
      setShowContributeModal(true);
    }
  };

  const contribItem = items.find((i) => i.id === contribItemId);
  const contribRemaining =
    contribItem?.price
      ? Math.max(
          parseFloat(contribItem.price) -
            parseFloat(contribItem.contribution_total || "0"),
          0
        )
      : 0;

  const handleContribute = async () => {
    if (!contribAmount || parseFloat(contribAmount) <= 0) return;

    // Cap amount at remaining price
    let amount = parseFloat(contribAmount);
    if (contribRemaining > 0 && amount > contribRemaining) {
      amount = contribRemaining;
    }

    setItemSubmitting(contribItemId, true);
    try {
      await api.post(`/items/${contribItemId}/contribute`, {
        amount,
        message: contribMessage || null,
        guest_name: guestName,
        guest_identifier: guestId,
      });
      setShowContributeModal(false);
      toast.success(`Вклад ${formatPrice(amount)} внесён!`);
      fetchWishlist();
    } catch {
      toast.error("Не удалось внести вклад. Попробуйте ещё раз.");
    } finally {
      setItemSubmitting(contribItemId, false);
    }
  };

  const contribExceedsRemaining =
    contribRemaining > 0 &&
    !!contribAmount &&
    parseFloat(contribAmount) > contribRemaining;

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
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-md animate-fade-in">
          <EmptyState
            illustration="/illustrations/not-found.svg"
            title="Вишлист не найден"
            description="Возможно, ссылка устарела или список был удалён"
            action={
              <Link
                href="/"
                className="btn-primary inline-flex items-center gap-2"
              >
                <ArrowLeft size={18} weight="duotone" />
                На главную
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  // --- Filter chips data ---
  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "available", label: "Доступные" },
    { key: "reserved", label: "Зарезервированные" },
    { key: "group", label: "Групповые" },
  ];

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* ===== HEADER ===== */}
        <div className="glass noise-texture relative mb-10 overflow-hidden rounded-3xl px-6 py-10 text-center">
          {/* Background blobs */}
          <div className="blob blob-purple absolute -left-20 -top-20 h-64 w-64 opacity-20" />
          <div className="blob blob-pink absolute -bottom-16 -right-16 h-56 w-56 opacity-20" />

          <div className="relative z-10">
            {/* Gift icon */}
            <div className="mb-5 flex justify-center">
              <div className="animate-float rounded-2xl p-3 shadow-lg"
                style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent-coral))" }}>
                <Gift size={32} weight="duotone" className="text-white" />
              </div>
            </div>

            {/* Title */}
            <h1 className="mb-2 text-4xl font-extrabold text-gray-900">
              {wishlist.title}
            </h1>

            {/* Owner */}
            {wishlist.owner_name && (
              <p className="mb-3 flex items-center justify-center gap-1.5 text-gray-500">
                <User size={16} weight="duotone" />
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
              <p className="mb-3 flex items-center justify-center gap-1.5 text-sm text-gray-400">
                <Calendar size={16} weight="duotone" />
                {formatDate(wishlist.event_date)}
              </p>
            )}

            {/* Countdown badge */}
            {countdown && (
              <div className="mb-4 flex justify-center">
                <span
                  className={`countdown-badge ${
                    urgency === "urgent"
                      ? "badge-coral"
                      : urgency === "soon"
                        ? "badge-gold"
                        : urgency === "past"
                          ? "badge-gray"
                          : "badge-primary"
                  }`}
                >
                  <Calendar size={14} weight="duotone" />
                  {countdown}
                </span>
              </div>
            )}

            {/* Privacy notice */}
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-2 backdrop-blur-sm">
              <Lock size={14} weight="duotone" className="text-gray-400" />
              <span className="text-xs text-gray-500">
                Владелец не видит кто резервирует
              </span>
            </div>
          </div>
        </div>

        {/* ===== STATS BAR ===== */}
        {totalItems > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <Gift size={16} weight="duotone" style={{ color: "var(--color-primary)" }} />
              <strong>{totalItems}</strong>{" "}
              {pluralize(totalItems, "подарок", "подарка", "подарков")}
            </span>
            <span className="text-gray-300">|</span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle size={16} weight="duotone" style={{ color: "var(--color-success)" }} />
              <strong>{reservedCount}</strong>{" "}
              {pluralize(reservedCount, "зарезервирован", "зарезервировано", "зарезервировано")}
            </span>
            {contributorCount > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="inline-flex items-center gap-1.5">
                  <Users size={16} weight="duotone" style={{ color: "var(--color-accent-coral)" }} />
                  <strong>{contributorCount}</strong>{" "}
                  {pluralize(contributorCount, "участник", "участника", "участников")}
                </span>
              </>
            )}
          </div>
        )}

        {/* ===== FILTER CHIPS ===== */}
        {totalItems > 0 && (
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            <Funnel size={18} weight="duotone" className="text-gray-400 mr-1" />
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`filter-chip ${filter === f.key ? "active" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* ===== ITEMS GRID ===== */}
        {items.length === 0 ? (
          <EmptyState
            illustration="/illustrations/empty-wishlist.svg"
            title="В этом вишлисте пока нет подарков"
            description="Загляните позже -- возможно, хозяин ещё добавит идеи"
          />
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center animate-fade-in">
            <Funnel size={48} weight="duotone" className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Нет подарков в этой категории</p>
            <button
              onClick={() => setFilter("all")}
              className="btn-secondary mt-4 text-sm"
            >
              Показать все
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item, index) => {
              const isReservedByMe = !!reservedByMe[item.id];
              const isSubmitting = !!submitting[item.id];
              const progress = item.progress_percentage ?? 0;
              const collected = parseFloat(item.contribution_total || "0");
              const price = item.price ? parseFloat(item.price) : 0;
              const hasImageError = !!imgErrors[item.id];
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
                  {/* Reserved overlay */}
                  {item.is_reserved && !item.is_group_gift && (
                    <div className="reserved-overlay">
                      <CheckCircle size={20} weight="duotone" />
                      Зарезервирован
                    </div>
                  )}

                  {/* Image */}
                  {item.image_url && !hasImageError ? (
                    <div className="img-zoom h-48 w-full">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={() =>
                          setImgErrors((prev) => ({ ...prev, [item.id]: true }))
                        }
                      />
                    </div>
                  ) : (
                    <div
                      className="flex h-48 w-full items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--color-primary), var(--color-accent-coral))",
                        opacity: 0.15,
                      }}
                    >
                      <Gift size={48} weight="duotone" className="text-gray-600 opacity-60" />
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
                        className="mb-3 flex items-center gap-1 text-xs hover:underline"
                        style={{ color: "var(--color-primary)" }}
                      >
                        <ArrowSquareOut size={14} weight="duotone" />
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
                          {formatPrice(item.price)} ({Math.round(progress)}%)
                        </p>
                        {item.contribution_count > 0 && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                            <Users size={12} weight="duotone" />
                            {item.contribution_count}{" "}
                            {pluralize(
                              item.contribution_count,
                              "участник",
                              "участника",
                              "участников"
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    {item.is_group_gift ? (
                      progress >= 100 ? (
                        <div className="badge-green badge w-full justify-center py-2.5 text-sm">
                          <CheckCircle size={18} weight="duotone" />
                          Собрано!
                        </div>
                      ) : (
                        <button
                          onClick={() => handleContributeClick(item.id)}
                          disabled={isSubmitting}
                          className="btn-coral w-full text-sm"
                        >
                          {isSubmitting ? (
                            <SpinnerGap size={18} weight="duotone" className="animate-spin" />
                          ) : (
                            <Heart size={18} weight="duotone" />
                          )}
                          Скинуться
                          {progress > 0 && progress < 100 && (
                            <span className="ml-1 opacity-75">
                              ({Math.round(progress)}%)
                            </span>
                          )}
                        </button>
                      )
                    ) : isReservedByMe ? (
                      <button
                        onClick={() => handleUnreserve(item.id)}
                        disabled={isSubmitting}
                        className="btn-secondary w-full text-sm"
                      >
                        {isSubmitting ? (
                          <SpinnerGap size={18} weight="duotone" className="animate-spin" />
                        ) : (
                          <X size={18} weight="duotone" />
                        )}
                        Отменить бронь
                      </button>
                    ) : item.is_reserved ? (
                      <div className="badge-green badge w-full justify-center py-2.5 text-sm">
                        <CheckCircle size={18} weight="duotone" />
                        Зарезервирован
                      </div>
                    ) : (
                      <button
                        onClick={() => handleReserve(item.id)}
                        disabled={isSubmitting}
                        className="btn-primary w-full text-sm"
                      >
                        {isSubmitting ? (
                          <SpinnerGap size={18} weight="duotone" className="animate-spin" />
                        ) : (
                          <Gift size={18} weight="duotone" />
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
            <div
              className="h-2 rounded-t-2xl"
              style={{ background: "linear-gradient(90deg, var(--color-primary), var(--color-accent-coral))" }}
            />
            <div className="p-8">
              <div className="mb-4 flex justify-center">
                <div
                  className="rounded-2xl p-3"
                  style={{ background: "var(--color-primary)", opacity: 0.1 }}
                >
                  <User size={32} weight="duotone" style={{ color: "var(--color-primary)" }} />
                </div>
              </div>
              <h3 className="mb-1 text-center text-xl font-bold text-gray-900">
                Как вас зовут?
              </h3>
              <p className="mb-6 text-center text-sm text-gray-500">
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
                className="mt-3 w-full text-center text-sm text-gray-400 transition hover:text-gray-600"
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
            <div
              className="h-2 rounded-t-2xl"
              style={{ background: "linear-gradient(90deg, var(--color-primary), var(--color-accent-gold))" }}
            />
            <div className="p-8">
              <div className="mb-4 flex justify-center">
                <div
                  className="rounded-2xl p-3"
                  style={{ background: "var(--color-accent-coral)", opacity: 0.15 }}
                >
                  <Heart size={32} weight="duotone" style={{ color: "var(--color-accent-coral)" }} />
                </div>
              </div>
              <h3 className="mb-1 text-center text-xl font-bold text-gray-900">
                Внести вклад
              </h3>
              {contribItem && (
                <p className="mb-1 text-center text-sm text-gray-500">
                  {contribItem.name}
                </p>
              )}
              {contribItem?.price && contribRemaining > 0 && (
                <p className="mb-5 text-center text-xs text-gray-400">
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
                  placeholder="Сумма, \u20BD"
                  className="input-premium"
                  autoFocus
                />

                {/* Warning if exceeds remaining */}
                {contribExceedsRemaining && (
                  <p className="mt-2 text-xs" style={{ color: "var(--color-accent-coral)" }}>
                    Сумма превышает остаток. Будет ограничена до{" "}
                    {formatPrice(contribRemaining)}
                  </p>
                )}

                {/* Quick amount buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {[100, 500, 1000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setContribAmount(String(v))}
                      className="filter-chip"
                    >
                      {v} \u20BD
                    </button>
                  ))}
                  {contribRemaining > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setContribAmount(String(contribRemaining))
                      }
                      className="filter-chip"
                    >
                      Всё ({formatPrice(contribRemaining)})
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
                  !!submitting[contribItemId] ||
                  !contribAmount ||
                  parseFloat(contribAmount) <= 0
                }
                className="btn-primary w-full text-sm"
              >
                {submitting[contribItemId] ? (
                  <SpinnerGap size={18} weight="duotone" className="animate-spin" />
                ) : (
                  <Heart size={18} weight="duotone" />
                )}
                Внести{" "}
                {contribAmount
                  ? formatPrice(
                      contribExceedsRemaining
                        ? contribRemaining
                        : parseFloat(contribAmount)
                    )
                  : ""}
              </button>

              <button
                onClick={() => setShowContributeModal(false)}
                className="mt-3 w-full text-center text-sm text-gray-400 transition hover:text-gray-600"
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
