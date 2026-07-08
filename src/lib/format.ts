import type { DurationOffer } from "@/lib/api";
import type { IconName } from "@/components/Icon";

/** Russian plural picker: one / few / many by the usual RU rules. */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export function durationLabel(days: number): string {
  if (days === 0) return "Навсегда";
  if (days % 365 === 0) {
    const y = days / 365;
    return `${y} ${plural(y, "год", "года", "лет")}`;
  }
  if (days % 30 === 0) {
    const mo = days / 30;
    return `${mo} ${plural(mo, "месяц", "месяца", "месяцев")}`;
  }
  return `${days} ${plural(days, "день", "дня", "дней")}`;
}

/** Compact duration for the tight segmented ladder — months abbreviate to "мес"
 *  so four+ segments stay on one line at phone widths ("12 месяцев" would wrap). */
export function durationLabelShort(days: number): string {
  if (days === 0) return "Навсегда";
  if (days % 365 === 0) {
    const y = days / 365;
    return `${y} ${plural(y, "год", "года", "лет")}`;
  }
  if (days % 30 === 0) return `${days / 30} мес`;
  return `${days} дн.`;
}

/** Pick a display price for a duration: prefer a RUB gateway, else the first. */
export function pickPrice(d: DurationOffer) {
  return d.prices.find((p) => p.currency === "RUB") ?? d.prices[0] ?? null;
}

/** Per-month effective price for a duration (for the ladder savings badge). */
export function monthlyPrice(d: DurationOffer): number | null {
  const pr = pickPrice(d);
  if (!pr || d.days <= 0) return null;
  const amount = parseFloat(pr.final_amount);
  return Number.isFinite(amount) ? amount / (d.days / 30) : null;
}

/** Savings vs the plan's shortest duration (the "−30% на 12 месяцев" ladder). */
export function ladderSavings(d: DurationOffer, base: DurationOffer): number {
  const m = monthlyPrice(d);
  const b = monthlyPrice(base);
  if (m === null || b === null || b <= 0) return 0;
  return Math.round((1 - m / b) * 100);
}

export const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Активна",
  EXPIRED: "Истекла",
  LIMITED: "Лимит трафика",
  DISABLED: "Отключена",
};

export function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function fmtBytes(n: number): string {
  if (!n) return "0 Б";
  const u = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

export function platformIcon(p?: string | null): IconName {
  const s = (p ?? "").toLowerCase();
  if (s.includes("mac")) return "laptop";
  if (s.includes("windows")) return "monitor";
  if (s.includes("tv")) return "tv";
  return "phone";
}
