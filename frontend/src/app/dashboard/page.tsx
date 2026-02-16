"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { formatDate, pluralize, countdownText, countdownUrgency } from "@/lib/utils";
import type { Wishlist } from "@/types";
import { toast } from "sonner";
import {
  Plus,
  Gift,
  ShareNetwork,
  Calendar,
  Trash,
  Eye,
  ArrowSquareOut,
  Sparkle,
  CaretRight,
} from "@phosphor-icons/react";
import EmptyState from "@/components/ui/EmptyState";
import ShareModal from "@/components/ui/ShareModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const occasionConfig: Record<string, { label: string; badge: string }> = {
  birthday: { label: "День рождения", badge: "badge-coral" },
  new_year: { label: "Новый год", badge: "badge-purple" },
  wedding: { label: "Свадьба", badge: "badge-gold" },
  christmas: { label: "Рождество", badge: "badge-amber" },
  other: { label: "Другое", badge: "badge-green" },
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);

  // Share modal state
  const [shareModal, setShareModal] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: "",
    title: "",
  });

  // Delete confirm state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; title: string }>({
    open: false,
    id: "",
    title: "",
  });
  const [deleting, setDeleting] = useState(false);

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

  const openShareModal = (w: Wishlist) => {
    const url = `${window.location.origin}/w/${w.share_token}`;
    setShareModal({ open: true, url, title: w.title });
  };

  const openDeleteDialog = (w: Wishlist) => {
    setDeleteDialog({ open: true, id: w.id, title: w.title });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/wishlists/${deleteDialog.id}`);
      setWishlists((prev) => prev.filter((w) => w.id !== deleteDialog.id));
      toast.success("Вишлист удален");
      setDeleteDialog({ open: false, id: "", title: "" });
    } catch {
      toast.error("Не удалось удалить вишлист");
    } finally {
      setDeleting(false);
    }
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
              <div className="skeleton h-5 w-3/4 mb-3 rounded" />
              <div className="skeleton h-4 w-1/3 mb-4 rounded" />
              <div className="skeleton h-3 w-full mb-2 rounded" />
              <div className="skeleton h-3 w-2/3 mb-4 rounded" />
              <div className="flex gap-3">
                <div className="skeleton h-3 w-16 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Мои вишлисты</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {wishlists.length > 0
              ? `У вас ${wishlists.length} ${pluralize(wishlists.length, "вишлист", "вишлиста", "вишлистов")}`
              : "Создайте свой первый вишлист"}
          </p>
        </div>
        <Link href="/wishlist/create" className="btn-primary flex items-center gap-2">
          <Plus size={18} weight="bold" />
          Создать
          <Sparkle size={18} weight="duotone" />
        </Link>
      </div>

      {/* Empty state */}
      {wishlists.length === 0 ? (
        <EmptyState
          illustration="/illustrations/empty-wishlist.svg"
          title="Пока пусто"
          description="Создайте свой первый вишлист и поделитесь им с близкими"
          action={
            <Link href="/wishlist/create" className="btn-primary">
              Создать вишлист
            </Link>
          }
        />
      ) : (
        /* Wishlist grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((w, index) => {
            const countdown = countdownText(w.event_date);
            const urgency = countdownUrgency(w.event_date);
            const occasion = w.occasion ? occasionConfig[w.occasion] : null;

            return (
              <div
                key={w.id}
                className="group card-premium p-6 animate-fade-in relative flex flex-col"
                style={{ animationDelay: `${(index % 6) * 100}ms` }}
              >
                {/* Card body as link */}
                <Link href={`/wishlist/${w.id}`} className="block flex-1">
                  {/* Title row */}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] transition group-hover:gradient-text">
                      {w.title}
                    </h3>
                    <ArrowSquareOut
                      size={18}
                      weight="duotone"
                      className="shrink-0 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)] transition"
                    />
                  </div>

                  {/* Occasion badge */}
                  {occasion && (
                    <span className={`badge ${occasion.badge} mb-2`}>
                      {occasion.label}
                    </span>
                  )}

                  {/* Description */}
                  {w.description && (
                    <p className="mb-3 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                      {w.description}
                    </p>
                  )}

                  {/* Stats row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <Gift size={14} weight="duotone" />
                      {w.item_count} {pluralize(w.item_count, "подарок", "подарка", "подарков")}
                    </span>
                    {w.event_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={14} weight="duotone" />
                        {formatDate(w.event_date)}
                      </span>
                    )}
                  </div>

                  {/* Countdown badge */}
                  {countdown && (
                    <div className="mt-3">
                      <span
                        className={`countdown-badge ${urgency === "urgent" ? "urgent" : ""} ${urgency === "soon" ? "soon" : ""}`}
                      >
                        {countdown}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Action buttons */}
                <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openShareModal(w)}
                      className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)]"
                      title="Поделиться"
                    >
                      <ShareNetwork size={16} weight="duotone" />
                      Поделиться
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/wishlist/${w.id}`}
                      className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-tertiary)] transition hover:text-[var(--color-primary)]"
                      title="Открыть"
                    >
                      <Eye size={16} weight="duotone" />
                    </Link>
                    <button
                      onClick={() => openDeleteDialog(w)}
                      className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-tertiary)] transition hover:text-[var(--color-danger)]"
                      title="Удалить"
                    >
                      <Trash size={16} weight="duotone" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share modal */}
      <ShareModal
        isOpen={shareModal.open}
        onClose={() => setShareModal({ open: false, url: "", title: "" })}
        shareUrl={shareModal.url}
        title={shareModal.title}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: "", title: "" })}
        onConfirm={handleDelete}
        title="Удалить вишлист?"
        description={`Вишлист "${deleteDialog.title}" и все его подарки будут удалены навсегда.`}
        confirmText="Удалить"
        loading={deleting}
      />
    </div>
  );
}
