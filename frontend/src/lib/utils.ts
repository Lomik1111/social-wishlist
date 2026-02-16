import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string | null | undefined): string {
  if (!price) return "";
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

/** Russian pluralization: pluralize(5, "подарок", "подарка", "подарков") → "подарков" */
export function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/** Days until a date. Returns negative if date is past. */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const target = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Countdown text: "через 27 дней" or "событие прошло" */
export function countdownText(date: string | null | undefined): string | null {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return "Событие прошло";
  if (days === 0) return "Сегодня!";
  if (days === 1) return "Завтра!";
  return `через ${days} ${pluralize(days, "день", "дня", "дней")}`;
}

/** Countdown urgency level for styling */
export function countdownUrgency(date: string | null | undefined): "normal" | "soon" | "urgent" | "past" {
  const days = daysUntil(date);
  if (days === null) return "normal";
  if (days < 0) return "past";
  if (days <= 3) return "urgent";
  if (days <= 14) return "soon";
  return "normal";
}
