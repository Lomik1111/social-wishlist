"use client";
import { Warning } from "@phosphor-icons/react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Удалить",
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-danger-light)]">
            <Warning size={28} weight="fill" className="text-[var(--color-danger)]" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-[var(--color-text-primary)]">{title}</h3>
          {description && (
            <p className="mb-6 text-sm text-[var(--color-text-secondary)]">{description}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-secondary flex-1 !py-2.5 text-sm"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-danger)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
