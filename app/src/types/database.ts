// ═══════════════════════════════════════════
//  Database types — mirrors Supabase schema
//  Keep in sync with supabase/schema.sql
// ═══════════════════════════════════════════

export type UserRole = "owner" | "admin" | "member";

export type RuleType =
  | "time_range"
  | "day_of_week"
  | "device"
  | "geo_fence"
  | "geo_ip"
  | "schedule"
  | "scan_count"
  | "custom";

export type DeviceType = "mobile" | "desktop" | "tablet" | "robot" | "drone";
export type ScanSource = "qr_scan" | "short_link" | "embed" | "api_simulate";
export type ChangeSource = "user" | "api" | "agent" | "schedule";
export type AutomationJobType =
  | "rotate_playlist"
  | "rss_sync"
  | "calendar_sync"
  | "webhook";
export type Plan = "free" | "pro" | "agent" | "enterprise";
export type BillingCycle = "monthly" | "annual";
export type AgentType = "mcp" | "rest" | "webhook";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  org_id: string | null;
  role: UserRole;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: Record<string, unknown> | null;
  created_at: string;
}

export interface QRCode {
  id: string;
  user_id: string;
  org_id: string | null;
  slug: string;
  custom_slug: boolean;
  label: string;
  destination_url: string;
  short_url: string;
  is_active: boolean;
  scan_count: number;
  click_count: number;
  tags: string[];
  qr_style: QRStyle | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface QRStyle {
  fg_color?: string;
  bg_color?: string;
  logo_url?: string;
  frame_style?: string;
}

export interface RoutingRule {
  id: string;
  qr_code_id: string;
  priority: number;
  rule_type: RuleType;
  conditions: RuleConditions;
  destination_url: string;
  payload: Record<string, unknown> | null;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Routing Rule Condition Schemas ──

export interface TimeRangeCondition {
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  timezone: string;   // "America/Denver"
}

export interface DayOfWeekCondition {
  days: string[]; // ["monday", "friday"] or ["weekdays"]
}

export interface DeviceCondition {
  device_type: DeviceType;
}

export interface GeoFenceCondition {
  lat: number;
  lng: number;
  radius_km: number;
  place_label?: string;
  polygon?: [number, number][];
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

export type RuleConditions =
  | TimeRangeCondition
  | DayOfWeekCondition
  | DeviceCondition
  | GeoFenceCondition
  | GeoIPCondition
  | ScheduleCondition
  | ScanCountCondition
  | CustomCondition
  | CompositeCondition;

export interface CompositeCondition {
  time_range?: TimeRangeCondition;
  day_of_week?: DayOfWeekCondition;
  device?: DeviceCondition;
  geo_fence?: GeoFenceCondition;
  geo_ip?: GeoIPCondition;
  schedule?: ScheduleCondition;
  scan_count?: ScanCountCondition;
  custom?: CustomCondition;
}

export interface GeoFence {
  id: string;
  rule_id: string;
  center: { lat: number; lng: number };
  radius_meters: number;
  polygon: [number, number][] | null;
  place_label: string | null;
  place_id: string | null;
  created_at: string;
}

export interface ScanEvent {
  id: string;
  qr_code_id: string;
  source: ScanSource;
  scanned_at: string;
  user_agent: string | null;
  device_type: DeviceType | null;
  ip_hash: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  referrer: string | null;
  rule_matched: string | null;
  destination_url: string;
  custom_signals: Record<string, string> | null;
}

export interface LinkHistory {
  id: string;
  qr_code_id: string;
  previous_url: string;
  new_url: string;
  changed_by: ChangeSource;
  changed_at: string;
  agent_context: Record<string, unknown> | null;
}

export interface AutomationJob {
  id: string;
  qr_code_id: string;
  job_type: AutomationJobType;
  config: Record<string, unknown>;
  cron_expression: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Supabase generated types helper ──
// This maps table names to row types for type-safe queries

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at">; Update: Partial<Profile> };
      organizations: { Row: Organization; Insert: Omit<Organization, "id" | "created_at">; Update: Partial<Organization> };
      qr_codes: { Row: QRCode; Insert: Omit<QRCode, "id" | "scan_count" | "click_count" | "created_at" | "updated_at">; Update: Partial<QRCode> };
      routing_rules: { Row: RoutingRule; Insert: Omit<RoutingRule, "id" | "created_at">; Update: Partial<RoutingRule> };
      scan_events: { Row: ScanEvent; Insert: Omit<ScanEvent, "id" | "scanned_at">; Update: never };
      link_history: { Row: LinkHistory; Insert: Omit<LinkHistory, "id" | "changed_at">; Update: never };
      automation_jobs: { Row: AutomationJob; Insert: Omit<AutomationJob, "id" | "created_at">; Update: Partial<AutomationJob> };
    };
  };
}
