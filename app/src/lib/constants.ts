// ═══════════════════════════════════════════
//  App-wide constants
// ═══════════════════════════════════════════

export const APP_NAME = "QR Shift";
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const SHORT_DOMAIN = process.env.NEXT_PUBLIC_SHORT_DOMAIN ?? APP_DOMAIN;

/** Build the short/redirect URL for a given slug */
export function shortUrl(slug: string): string {
  return `${SHORT_DOMAIN}/q/${slug}`;
}

/** Generate a random 6-char alphanumeric slug */
export function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  const rand = crypto.getRandomValues(new Uint8Array(6));
  for (let i = 0; i < 6; i++) {
    slug += chars[rand[i] % chars.length];
  }
  return slug;
}

/** Plan limits — single source of truth */
export const PLAN_LIMITS = {
  free: {
    max_codes: 10,
    max_scans_per_month: 500,
    max_rules_per_code: 0,
    max_automations: 0,
    max_api_calls_per_month: 0,
    max_api_keys: 0,
    max_agents: 0,
  },
  pro: {
    max_codes: 100,
    max_scans_per_month: 10_000,
    max_rules_per_code: 3,
    max_automations: 5,
    max_api_calls_per_month: 1_000,
    max_api_keys: 1,
    max_agents: 0,
  },
  agent: {
    max_codes: 1_000,
    max_scans_per_month: 50_000,
    max_rules_per_code: Infinity,
    max_automations: Infinity,
    max_api_calls_per_month: 50_000,
    max_api_keys: 10,
    max_agents: 5,
  },
  enterprise: {
    max_codes: Infinity,
    max_scans_per_month: Infinity,
    max_rules_per_code: Infinity,
    max_automations: Infinity,
    max_api_calls_per_month: Infinity,
    max_api_keys: Infinity,
    max_agents: Infinity,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

/** Days of the week for routing rules */
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
