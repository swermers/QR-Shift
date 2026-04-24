"use server";

import { verifyToken } from "@/lib/tokens";
import { getQR, getScans } from "@/lib/storage";

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

function emptyAnalytics(days: number): AnalyticsData {
  const scansByDay: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    scansByDay.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return {
    scansByDay,
    deviceBreakdown: [],
    topCountries: [],
    topReferrers: [],
    totalScans: 0,
    totalClicks: 0,
    recentScans: [],
  };
}

export async function getAnalytics(
  slug: string,
  token: string,
  days = 30,
): Promise<AnalyticsData | null> {
  const qr = await getQR(slug);
  if (!qr) return null;
  if (!verifyToken(token, qr.edit_token_hash)) return null;

  const scans = await getScans(slug);
  const sinceMs = Date.now() - days * 86_400_000;
  const windowed = scans.filter((s) => new Date(s.scanned_at).getTime() >= sinceMs);

  const dayMap: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const s of windowed) {
    const day = s.scanned_at.slice(0, 10);
    if (dayMap[day] !== undefined) dayMap[day]++;
  }
  const scansByDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  const bucket = <K extends string | null>(
    items: { key: K; fallback: string }[],
  ) => {
    const map: Record<string, number> = {};
    for (const { key, fallback } of items) {
      const k = key ?? fallback;
      map[k] = (map[k] || 0) + 1;
    }
    return Object.entries(map)
      .map(([k, count]) => ({ k, count }))
      .sort((a, b) => b.count - a.count);
  };

  const deviceBreakdown = bucket(
    windowed.map((s) => ({ key: s.device_type, fallback: "unknown" })),
  ).map((d) => ({ device: d.k, count: d.count }));

  const topCountries = bucket(
    windowed.map((s) => ({ key: s.country, fallback: "Unknown" })),
  )
    .slice(0, 10)
    .map((c) => ({ country: c.k, count: c.count }));

  const topReferrers = bucket(
    windowed.map((s) => ({ key: s.referrer, fallback: "Direct / QR Scan" })),
  )
    .slice(0, 10)
    .map((r) => ({ referrer: r.k, count: r.count }));

  const totalScans = windowed.filter((s) => s.source === "qr_scan").length;
  const totalClicks = windowed.filter((s) => s.source === "short_link").length;

  const recentScans = windowed.slice(0, 20).map((s) => ({
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

export async function getEmptyAnalytics(days = 30): Promise<AnalyticsData> {
  return emptyAnalytics(days);
}
