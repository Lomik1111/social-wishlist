"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { createWishlistSocket, type WSMessage } from "@/lib/websocket";
import { formatPrice, formatDate } from "@/lib/utils";
import type { WishlistPublic, ItemPublic } from "@/types";
import {
  Gift, Calendar, Loader2, ExternalLink, Check,
  Users, Lock, X, Banknote,
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
  const [pendingAction, setPendingAction] = useState<{ type: "reserve" | "contribute"; itemId: string } | null>(null);

  // Contribution modal
  const [showContribModal, setShowContribModal] = useState(false);
  const [contribItemId, setContribItemId] = useState("");
  const [contribAmount, setContribAmount] = useState("");
  const [contribMessage, setContribMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
  }, []);

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
              i.id === msg.item_id ? { ...i, is_reserved: msg.is_fully_reserved as boolean } : i
            )
          );
          break;
        case "item_unreserved":
          setItems((prev) =>
            prev.map((i) => (i.id === msg.item_id ? { ...i, is_reserved: false } : i))
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

  const ensureGuestName = (action: { type: "reserve" | "contribute"; itemId: string }) => {
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
        setShowContribModal(true);
      }
      setPendingAction(null);
    }
  };

  const doReserve = async (itemId: string) => {
    setSubmitting(true);
    try {
      await api.post(`/items/${itemId}/reserve`, {
        guest_name: guestName,
        guest_identifier: guestId,
      });
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, is_reserved: true } : i)));
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

  const handleContributeClick = (itemId: string) => {
    if (ensureGuestName({ type: "contribute", itemId })) {
      setContribItemId(itemId);
      setContribAmount("");
      setContribMessage("");
      setShowContribModal(true);
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
      setShowContribModal(false);
      fetchWishlist();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !wishlist) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Gift className="h-12 w-12 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Вишлист не найден</h2>
        <p className="text-sm text-gray-500">Возможно, ссылка устарела или список был удалён</p>
      </div>
    );
  }

  return (
    <div>
      {/* Wishlist Header */}
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
            <Gift className="h-8 w-8 text-indigo-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">{wishlist.title}</h1>
        {wishlist.owner_name && (
          <p className="mt-2 text-gray-500">Вишлист от {wishlist.owner_name}</p>
        )}
        {wishlist.description && (
          <p className="mt-2 max-w-lg mx-auto text-sm text-gray-600">{wishlist.description}</p>
        )}
        {wishlist.event_date && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-gray-400">
            <Calendar className="h-4 w-4" />
            {formatDate(wishlist.event_date)}
          </p>
        )}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Lock className="h-3 w-3" />
          Владелец не видит, кто что зарезервировал
        </div>
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <Gift className="h-12 w-12 text-gray-300" />
          <p className="text-gray-500">В этом вишлисте пока нет подарков</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition ${
                item.is_reserved && !item.is_group_gift
                  ? "border-green-200 bg-green-50/30 opacity-75"
                  : "border-gray-100 hover:shadow-md"
              }`}
            >
              {item.image_url && (
                <div className="h-44 w-full overflow-hidden bg-gray-100">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}

              <div className="p-4">
                <h3 className="mb-1 font-semibold text-gray-900 line-clamp-2">{item.name}</h3>
                {item.description && (
                  <p className="mb-2 text-xs text-gray-500 line-clamp-2">{item.description}</p>
                )}

                {item.price && (
                  <p className="mb-3 text-xl font-bold text-indigo-600">{formatPrice(item.price)}</p>
                )}

                {/* Group gift progress */}
                {item.is_group_gift && item.price && (
                  <div className="mb-3">
                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                      <span>{formatPrice(item.contribution_total)} из {formatPrice(item.price)}</span>
                      <span>{Math.round(item.progress_percentage)}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.progress_percentage >= 100 ? "bg-green-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${Math.min(item.progress_percentage, 100)}%` }}
                      />
                    </div>
                    {item.contribution_count > 0 && (
                      <p className="mt-1 text-xs text-gray-400">
                        {item.contribution_count} {item.contribution_count === 1 ? "участник" : "участников"}
                      </p>
                    )}
                  </div>
                )}

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-3 flex items-center gap-1 text-xs text-indigo-500 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Посмотреть товар
                  </a>
                )}

                {/* Actions */}
                {item.is_reserved && !item.is_group_gift ? (
                  <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                    <Check className="h-4 w-4" />
                    Зарезервировано
                  </div>
                ) : item.is_group_gift ? (
                  <button
                    onClick={() => handleContributeClick(item.id)}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Banknote className="h-4 w-4" />
                    Скинуться
                  </button>
                ) : (
                  <button
                    onClick={() => handleReserve(item.id)}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Gift className="h-4 w-4" />
                    Зарезервировать
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Guest Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">Как вас зовут?</h3>
            <p className="mb-4 text-sm text-gray-500">Чтобы друзья знали, кто зарезервировал подарок</p>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Ваше имя"
              className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowNameModal(false); setPendingAction(null); }}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600"
              >
                Отмена
              </button>
              <button
                onClick={handleNameSubmit}
                disabled={!guestName.trim()}
                className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Продолжить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contribution Modal */}
      {showContribModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Скинуться на подарок</h3>
              <button onClick={() => setShowContribModal(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Сумма (₽)</label>
              <input
                type="number"
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
                min="1"
                placeholder="0"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                autoFocus
              />
              <div className="mt-2 flex gap-2">
                {[100, 500, 1000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setContribAmount(String(v))}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                  >
                    {v} ₽
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Сообщение (необязательно)</label>
              <textarea
                value={contribMessage}
                onChange={(e) => setContribMessage(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Поздравляю!"
              />
            </div>

            <button
              onClick={handleContribute}
              disabled={submitting || !contribAmount || parseFloat(contribAmount) <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Внести вклад
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
