export const APP_NAME = "QR Shift";
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const SHORT_DOMAIN = process.env.NEXT_PUBLIC_SHORT_DOMAIN ?? APP_DOMAIN;

export function shortUrl(slug: string): string {
  return `${SHORT_DOMAIN}/q/${slug}`;
}

export function editUrl(slug: string, token: string): string {
  return `${APP_DOMAIN}/edit/${slug}?token=${encodeURIComponent(token)}`;
}

export function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  const rand = crypto.getRandomValues(new Uint8Array(6));
  for (let i = 0; i < 6; i++) {
    slug += chars[rand[i] % chars.length];
  }
  return slug;
}

export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const DAY_SHORTHAND: Record<string, string[]> = {
  weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  weekends: ["saturday", "sunday"],
};
