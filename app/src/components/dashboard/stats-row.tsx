function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface StatsRowProps {
  totalCodes: number;
  totalScans: number;
  lastUpdated: string | null;
}

export function StatsRow({ totalCodes, totalScans, lastUpdated }: StatsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <StatCard label="Active QR Codes" value={String(totalCodes)} />
      <StatCard label="Total Scans" value={String(totalScans)} />
      <StatCard
        label="Last Updated"
        value={lastUpdated ? timeAgo(lastUpdated) : "—"}
        small
      />
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-xl p-5">
      <div className="text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`font-serif font-bold ${small ? "text-base" : "text-3xl"} text-[#e8e9ed]`}
      >
        {value}
      </div>
    </div>
  );
}
