"use client";
import { useState } from "react";
import { X, Copy, Check } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  title: string;
}

export default function ShareModal({ isOpen, onClose, shareUrl, title }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareVia = (platform: "telegram" | "whatsapp" | "native") => {
    const text = `Посмотри мой вишлист "${title}"`;
    switch (platform) {
      case "telegram":
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, "_blank");
        break;
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`, "_blank");
        break;
      case "native":
        if (navigator.share) {
          navigator.share({ title, text, url: shareUrl }).catch(() => {});
        }
        break;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="h-1.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent-coral)]" />
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Поделиться</h3>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100 transition">
              <X size={20} className="text-[var(--color-text-tertiary)]" />
            </button>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
              <QRCodeSVG
                value={shareUrl}
                size={140}
                fgColor="#6C5CE7"
                level="M"
              />
            </div>
          </div>

          {/* Copy link */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex-1 rounded-xl bg-[var(--color-surface)] border border-gray-100 px-4 py-3 text-sm text-[var(--color-text-secondary)] truncate">
              {shareUrl}
            </div>
            <button
              onClick={copyLink}
              className={`shrink-0 rounded-xl px-4 py-3 text-sm font-medium transition ${
                copied
                  ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                  : "btn-primary !py-3"
              }`}
            >
              {copied ? <Check size={18} weight="bold" /> : <Copy size={18} />}
            </button>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => shareVia("telegram")}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-white py-3 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-blue-50 hover:border-blue-200"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#229ED9">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.46-1.901-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.062 3.345-.479.329-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472z" />
              </svg>
              Telegram
            </button>
            <button
              onClick={() => shareVia("whatsapp")}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-white py-3 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-green-50 hover:border-green-200"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 012.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.31a8.188 8.188 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm-3.4 4.49c-.14 0-.36.05-.55.27-.19.21-.71.69-.71 1.69s.73 1.96.83 2.09c.1.14 1.41 2.24 3.47 3.05 1.72.67 2.07.54 2.44.5.37-.03 1.2-.49 1.37-.96.17-.47.17-.87.12-.96-.05-.08-.19-.14-.4-.24-.21-.1-1.24-.61-1.43-.68-.19-.07-.33-.1-.47.1-.14.21-.55.68-.68.83-.12.14-.25.16-.46.05-.21-.1-.89-.33-1.7-1.04-.63-.56-1.05-1.25-1.17-1.46-.12-.21-.01-.33.09-.43.09-.1.21-.25.31-.38.1-.14.14-.24.21-.38.07-.14.03-.27-.02-.38-.05-.1-.47-1.13-.64-1.55-.17-.41-.34-.35-.47-.36h-.4z" />
              </svg>
              WhatsApp
            </button>
          </div>

          {/* Native share (if supported) */}
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              onClick={() => shareVia("native")}
              className="mt-3 w-full rounded-xl border border-gray-100 bg-white py-3 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-gray-50"
            >
              Другие способы...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
