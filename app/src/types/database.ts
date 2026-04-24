// Data types for the KV-backed QR-Shift deployment.
// No user accounts — ownership is proven by an edit token per QR code.

export type RuleType =
  | "time_range"
  | "day_of_week"
  | "device"
  | "geo_ip"
  | "schedule"
  | "scan_count"
  | "custom"
  | "composite";

export type DeviceType = "mobile" | "desktop" | "tablet" | "robot" | "drone";
export type ScanSource = "qr_scan" | "short_link";

export interface QRStyle {
  fg_color?: string;
  bg_color?: string;
  logo_url?: string;
  frame_style?: string;
}

export interface QRCode {
  slug: string;
  label: string;
  destination_url: string;
  is_active: boolean;
  qr_style: QRStyle | null;
  edit_token_hash: string;
  scan_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
}

/** Subset of QRCode safe to hand to client components. */
export type QRCodePublic = Omit<QRCode, "edit_token_hash">;

export interface RoutingRule {
  id: string;
  priority: number;
  rule_type: RuleType;
  conditions: RuleConditions;
  destination_url: string;
  payload: Record<string, unknown> | null;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TimeRangeCondition {
  start_time: string;
  end_time: string;
  timezone: string;
}

export interface DayOfWeekCondition {
  days: string[];
}

export interface DeviceCondition {
  device_type: DeviceType;
}

export interface GeoIPCondition {
  country?: string;
  region?: string;
  city?: string;
}

export interface ScheduleCondition {
  start_date?: string;
  end_date?: string;
  holidays?: string[];
  country?: string;
}

export interface ScanCountCondition {
  max_scans_per: "day" | "hour" | "week" | "month";
  threshold: number;
  action: string;
}

export interface CustomCondition {
  key: string;
  operator: "equals" | "contains" | "starts_with" | "regex";
  value: string;
}

export interface CompositeCondition {
  time_range?: TimeRangeCondition;
  day_of_week?: DayOfWeekCondition;
  device?: DeviceCondition;
  geo_ip?: GeoIPCondition;
  schedule?: ScheduleCondition;
  scan_count?: ScanCountCondition;
  custom?: CustomCondition;
}

export type RuleConditions =
  | TimeRangeCondition
  | DayOfWeekCondition
  | DeviceCondition
  | GeoIPCondition
  | ScheduleCondition
  | ScanCountCondition
  | CustomCondition
  | CompositeCondition;

export interface ScanEvent {
  scanned_at: string;
  source: ScanSource;
  device_type: DeviceType | null;
  country: string | null;
  region: string | null;
  city: string | null;
  referrer: string | null;
  rule_matched: string | null;
  destination_url: string;
  custom_signals: Record<string, string> | null;
}
