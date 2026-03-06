"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { AnalyticsData } from "@/lib/analytics";

interface Props {
  analytics: AnalyticsData | null;
  codes: { id: string; label: string; slug: string }[];
  selectedCode?: string;
  days: number;
}

export function AnalyticsDashboard({ analytics, codes, selectedCode, days }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/analytics?${params.toString()}`);
  }

  if (!analytics) {
    return <p className="text-[#8b8fa3]">Unable to load analytics.</p>;
  }

  const maxScans = Math.max(...analytics.scansByDay.map((d) => d.count), 1);
  const maxDevice = Math.max(...analytics.deviceBreakdown.map((d) => d.count), 1);
  const maxCountry = Math.max(...analytics.topCountries.map((d) => d.count), 1);
  const maxReferrer = Math.max(...analytics.topReferrers.map((d) => d.count), 1);
  const total = analytics.totalScans + analytics.totalClicks;

  const deviceColors: Record<string, string> = {
    mobile: "#6c63ff",
    desktop: "#3ecf8e",
    tablet: "#f59e0b",
    robot: "#8b8fa3",
    unknown: "#555",
  };

  return (
    <div>
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold font-serif text-[#e8e9ed]">Analytics</h2>
        <div className="flex gap-3">
          <select
            value={selectedCode || ""}
            onChange={(e) => updateFilter("code", e.target.value)}
            className="bg-[#1a1d27] border border-[#2a2e3d] rounded-lg px-3 py-2 text-sm text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff]"
          >
            <option value="">All QR Codes</option>
            {codes.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => updateFilter("days", e.target.value)}
            className="bg-[#1a1d27] border border-[#2a2e3d] rounded-lg px-3 py-2 text-sm text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff]"
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="QR Scans" value={analytics.totalScans} />
        <StatCard label="Link Clicks" value={analytics.totalClicks} />
        <StatCard label="Total" value={total} />
      </div>

      {/* Scans Over Time Chart */}
      <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-xl p-5 mb-6">
        <h3 className="text-sm font-medium text-[#8b8fa3] uppercase tracking-wider mb-4">
          Scans Over Time
        </h3>
        {total === 0 ? (
          <p className="text-[#555] text-sm py-8 text-center">No scan data yet</p>
        ) : (
          <div className="flex items-end gap-[2px] h-40">
            {analytics.scansByDay.map((d) => (
              <div
                key={d.date}
                className="flex-1 group relative"
                style={{ height: "100%" }}
              >
                <div
                  className="absolute bottom-0 w-full bg-[#6c63ff] rounded-t-sm opacity-80 hover:opacity-100 transition-opacity min-h-[1px]"
                  style={{ height: `${Math.max((d.count / maxScans) * 100, d.count > 0 ? 3 : 0)}%` }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#222633] text-[#e8e9ed] text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {d.date}: {d.count}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between mt-2 text-[10px] text-[#555]">
          <span>{analytics.scansByDay[0]?.date}</span>
          <span>{analytics.scansByDay[analytics.scansByDay.length - 1]?.date}</span>
        </div>
      </div>

      {/* Two-column: Device + Countries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Device Breakdown */}
        <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-xl p-5">
          <h3 className="text-sm font-medium text-[#8b8fa3] uppercase tracking-wider mb-4">
            Devices
          </h3>
          {analytics.deviceBreakdown.length === 0 ? (
            <p className="text-[#555] text-sm py-4 text-center">No data</p>
          ) : (
            <div className="space-y-3">
              {analytics.deviceBreakdown.map((d) => (
                <div key={d.device}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#e8e9ed] capitalize">{d.device}</span>
                    <span className="text-[#8b8fa3]">{d.count} ({Math.round((d.count / total) * 100)}%)</span>
                  </div>
                  <div className="h-2 bg-[#0f1117] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(d.count / maxDevice) * 100}%`,
                        backgroundColor: deviceColors[d.device] || "#6c63ff",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Countries */}
        <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-xl p-5">
          <h3 className="text-sm font-medium text-[#8b8fa3] uppercase tracking-wider mb-4">
            Top Locations
          </h3>
          {analytics.topCountries.length === 0 ? (
            <p className="text-[#555] text-sm py-4 text-center">No data</p>
          ) : (
            <div className="space-y-3">
              {analytics.topCountries.map((c) => (
                <div key={c.country}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#e8e9ed]">{c.country}</span>
                    <span className="text-[#8b8fa3]">{c.count}</span>
                  </div>
                  <div className="h-2 bg-[#0f1117] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#3ecf8e] rounded-full transition-all"
                      style={{ width: `${(c.count / maxCountry) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Referrers */}
      <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-xl p-5 mb-6">
        <h3 className="text-sm font-medium text-[#8b8fa3] uppercase tracking-wider mb-4">
          Top Referrers
        </h3>
        {analytics.topReferrers.length === 0 ? (
          <p className="text-[#555] text-sm py-4 text-center">No data</p>
        ) : (
          <div className="space-y-3">
            {analytics.topReferrers.map((r) => (
              <div key={r.referrer}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#e8e9ed] truncate max-w-[70%]">{r.referrer}</span>
                  <span className="text-[#8b8fa3]">{r.count}</span>
                </div>
                <div className="h-2 bg-[#0f1117] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6c63ff] rounded-full transition-all"
                    style={{ width: `${(r.count / maxReferrer) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-xl p-5">
        <h3 className="text-sm font-medium text-[#8b8fa3] uppercase tracking-wider mb-4">
          Recent Activity
        </h3>
        {analytics.recentScans.length === 0 ? (
          <p className="text-[#555] text-sm py-4 text-center">No scans yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#8b8fa3] border-b border-[#2a2e3d]">
                  <th className="text-left pb-2 font-medium">Time</th>
                  <th className="text-left pb-2 font-medium">Device</th>
                  <th className="text-left pb-2 font-medium">Location</th>
                  <th className="text-left pb-2 font-medium">Referrer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2e3d]/50">
                {analytics.recentScans.map((s, i) => (
                  <tr key={i} className="text-[#e8e9ed]">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(s.scanned_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 capitalize">{s.device_type || "—"}</td>
                    <td className="py-2 pr-4">
                      {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="py-2 truncate max-w-[200px]">{s.referrer || "Direct"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-xl p-5">
      <div className="text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-3xl font-serif font-bold text-[#e8e9ed]">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
