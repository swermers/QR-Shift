"use server";

import { createClient } from "@/lib/supabase/server";

export interface AnalyticsData {
  scansByDay: { date: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  topCountries: { country: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  totalScans: number;
  totalClicks: number;
  recentScans: {
    scanned_at: string;
    device_type: string | null;
    country: string | null;
    city: string | null;
    referrer: string | null;
    destination_url: string;
  }[];
}

export async function getAnalytics(
  qrCodeId?: string,
  days = 30,
): Promise<AnalyticsData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user's QR code IDs
  const { data: codes } = await supabase
    .from("qr_codes")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!codes || codes.length === 0) {
    return {
      scansByDay: [],
      deviceBreakdown: [],
      topCountries: [],
      topReferrers: [],
      totalScans: 0,
      totalClicks: 0,
      recentScans: [],
    };
  }

  const codeIds = qrCodeId
    ? [qrCodeId]
    : codes.map((c: { id: string }) => c.id);

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  // Fetch scan events
  const { data: events } = await supabase
    .from("scan_events")
    .select("scanned_at, device_type, country, city, referrer, destination_url, source")
    .in("qr_code_id", codeIds)
    .gte("scanned_at", sinceStr)
    .order("scanned_at", { ascending: false })
    .limit(5000);

  const scans = (events ?? []) as {
    scanned_at: string;
    device_type: string | null;
    country: string | null;
    city: string | null;
    referrer: string | null;
    destination_url: string;
    source: string;
  }[];

  // Scans by day
  const dayMap: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const s of scans) {
    const day = s.scanned_at.slice(0, 10);
    if (dayMap[day] !== undefined) dayMap[day]++;
  }
  const scansByDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  // Device breakdown
  const deviceMap: Record<string, number> = {};
  for (const s of scans) {
    const d = s.device_type || "unknown";
    deviceMap[d] = (deviceMap[d] || 0) + 1;
  }
  const deviceBreakdown = Object.entries(deviceMap)
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  // Top countries
  const countryMap: Record<string, number> = {};
  for (const s of scans) {
    const c = s.country || "Unknown";
    countryMap[c] = (countryMap[c] || 0) + 1;
  }
  const topCountries = Object.entries(countryMap)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top referrers
  const refMap: Record<string, number> = {};
  for (const s of scans) {
    const r = s.referrer || "Direct / QR Scan";
    refMap[r] = (refMap[r] || 0) + 1;
  }
  const topReferrers = Object.entries(refMap)
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Totals
  const totalScans = scans.filter((s) => s.source === "qr_scan").length;
  const totalClicks = scans.filter((s) => s.source === "short_link").length;

  // Recent scans
  const recentScans = scans.slice(0, 20).map((s) => ({
    scanned_at: s.scanned_at,
    device_type: s.device_type,
    country: s.country,
    city: s.city,
    referrer: s.referrer,
    destination_url: s.destination_url,
  }));

  return {
    scansByDay,
    deviceBreakdown,
    topCountries,
    topReferrers,
    totalScans,
    totalClicks,
    recentScans,
  };
}
