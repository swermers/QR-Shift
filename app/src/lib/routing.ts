// ═══════════════════════════════════════════
//  Context-Aware Routing Engine
//  Evaluates routing rules against scan context
//  to determine the redirect destination.
// ═══════════════════════════════════════════

import type {
  RoutingRule,
  RuleConditions,
  TimeRangeCondition,
  DayOfWeekCondition,
  DeviceCondition,
  GeoIPCondition,
  ScheduleCondition,
  ScanCountCondition,
  CustomCondition,
  CompositeCondition,
  DeviceType,
} from "@/types/database";
import { DAY_SHORTHAND, DAYS_OF_WEEK } from "./constants";

/** Context gathered from the incoming scan/click request */
export interface ScanContext {
  timestamp: Date;
  timezone?: string;
  userAgent?: string;
  deviceType?: DeviceType;
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lng?: number;
  referrer?: string;
  customSignals?: Record<string, string>;
  scanCount?: number;
}

export interface RoutingResult {
  destinationUrl: string;
  matchedRuleId: string | null;
  payload: Record<string, unknown> | null;
}

/**
 * Evaluate routing rules in priority order.
 * First matching rule wins. Falls back to defaultUrl.
 */
export function evaluateRules(
  rules: RoutingRule[],
  context: ScanContext,
  defaultUrl: string,
): RoutingResult {
  // Sort by priority (lowest first) — stable sort
  const sorted = [...rules]
    .filter((r) => r.is_active)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (matchesConditions(rule.rule_type, rule.conditions, context)) {
      return {
        destinationUrl: rule.destination_url,
        matchedRuleId: rule.id,
        payload: rule.payload,
      };
    }
  }

  return { destinationUrl: defaultUrl, matchedRuleId: null, payload: null };
}

/**
 * Check if a rule's conditions match the current scan context.
 * Composite conditions use AND logic (all sub-conditions must match).
 */
function matchesConditions(
  ruleType: string,
  conditions: RuleConditions,
  ctx: ScanContext,
): boolean {
  switch (ruleType) {
    case "time_range":
      return matchTimeRange(conditions as TimeRangeCondition, ctx);
    case "day_of_week":
      return matchDayOfWeek(conditions as DayOfWeekCondition, ctx);
    case "device":
      return matchDevice(conditions as DeviceCondition, ctx);
    case "geo_ip":
      return matchGeoIP(conditions as GeoIPCondition, ctx);
    case "schedule":
      return matchSchedule(conditions as ScheduleCondition, ctx);
    case "scan_count":
      return matchScanCount(conditions as ScanCountCondition, ctx);
    case "custom":
      return matchCustom(conditions as CustomCondition, ctx);
    case "composite":
      return matchComposite(conditions as CompositeCondition, ctx);
    default:
      return false;
  }
}

// ── Individual Matchers ──

function matchTimeRange(cond: TimeRangeCondition, ctx: ScanContext): boolean {
  const tz = cond.timezone || ctx.timezone || "UTC";
  const now = ctx.timestamp;

  let currentTime: string;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    currentTime = `${hour}:${minute}`;
  } catch {
    // Invalid timezone — fail closed
    return false;
  }

  // Handle overnight ranges (e.g., 22:00 to 06:00)
  if (cond.start_time <= cond.end_time) {
    return currentTime >= cond.start_time && currentTime < cond.end_time;
  }
  return currentTime >= cond.start_time || currentTime < cond.end_time;
}

function matchDayOfWeek(cond: DayOfWeekCondition, ctx: ScanContext): boolean {
  const tz = ctx.timezone || "UTC";
  let dayName: string;
  try {
    dayName = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
    })
      .format(ctx.timestamp)
      .toLowerCase();
  } catch {
    dayName = DAYS_OF_WEEK[ctx.timestamp.getUTCDay() === 0 ? 6 : ctx.timestamp.getUTCDay() - 1];
  }

  // Expand shorthand ("weekdays", "weekends")
  const expandedDays = cond.days.flatMap(
    (d) => DAY_SHORTHAND[d] ?? [d],
  );

  return expandedDays.includes(dayName);
}

function matchDevice(cond: DeviceCondition, ctx: ScanContext): boolean {
  if (!ctx.deviceType) return false;
  return ctx.deviceType === cond.device_type;
}

function matchGeoIP(cond: GeoIPCondition, ctx: ScanContext): boolean {
  if (cond.country && ctx.country?.toLowerCase() !== cond.country.toLowerCase())
    return false;
  if (cond.region && ctx.region?.toLowerCase() !== cond.region.toLowerCase())
    return false;
  if (cond.city && ctx.city?.toLowerCase() !== cond.city.toLowerCase())
    return false;
  // If none specified, don't match anything
  return !!(cond.country || cond.region || cond.city);
}

function matchSchedule(cond: ScheduleCondition, ctx: ScanContext): boolean {
  const now = ctx.timestamp;
  const today = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

  if (cond.start_date && today < cond.start_date) return false;
  if (cond.end_date && today > cond.end_date) return false;

  // If only holidays specified (no date range), skip for now
  // Holiday matching requires a holiday calendar — Phase 3 feature
  if (cond.holidays && !cond.start_date && !cond.end_date) return false;

  return true;
}

function matchScanCount(cond: ScanCountCondition, ctx: ScanContext): boolean {
  if (ctx.scanCount === undefined) return false;
  return ctx.scanCount >= cond.threshold;
}

function matchCustom(cond: CustomCondition, ctx: ScanContext): boolean {
  const val = ctx.customSignals?.[cond.key];
  if (val === undefined) return false;

  switch (cond.operator) {
    case "equals":
      return val === cond.value;
    case "contains":
      return val.includes(cond.value);
    case "starts_with":
      return val.startsWith(cond.value);
    case "regex":
      try {
        return new RegExp(cond.value).test(val);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function matchComposite(cond: CompositeCondition, ctx: ScanContext): boolean {
  // AND logic: every defined sub-condition must match
  if (cond.time_range && !matchTimeRange(cond.time_range, ctx)) return false;
  if (cond.day_of_week && !matchDayOfWeek(cond.day_of_week, ctx)) return false;
  if (cond.device && !matchDevice(cond.device, ctx)) return false;
  if (cond.geo_ip && !matchGeoIP(cond.geo_ip, ctx)) return false;
  if (cond.schedule && !matchSchedule(cond.schedule, ctx)) return false;
  if (cond.scan_count && !matchScanCount(cond.scan_count, ctx)) return false;
  if (cond.custom && !matchCustom(cond.custom, ctx)) return false;
  // At least one sub-condition must be defined
  return Object.keys(cond).length > 0;
}

// ── Device Detection ──

export function parseDeviceType(userAgent: string | null): DeviceType | undefined {
  if (!userAgent) return undefined;
  const ua = userAgent.toLowerCase();
  if (/bot|crawler|spider|crawling/i.test(ua)) return "robot";
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mozilla|chrome|safari|firefox|edge|opera/i.test(ua)) return "desktop";
  return undefined;
}
