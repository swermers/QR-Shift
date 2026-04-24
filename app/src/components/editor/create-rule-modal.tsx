"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoutingRule } from "@/lib/rule-actions";
import type { RuleType } from "@/types/database";

interface Props {
  slug: string;
  token: string;
  onClose: () => void;
}

const RULE_TYPES: { value: RuleType; label: string; description: string }[] = [
  { value: "time_range", label: "Time Range", description: "Redirect based on time of day" },
  { value: "day_of_week", label: "Day of Week", description: "Redirect on specific days" },
  { value: "device", label: "Device Type", description: "Redirect by mobile, desktop, or tablet" },
  { value: "geo_ip", label: "Geo IP", description: "Redirect by country, region, or city" },
  { value: "schedule", label: "Date Schedule", description: "Redirect during a date range" },
  { value: "custom", label: "Custom", description: "Match query parameters" },
];

export function CreateRuleModal({ slug, token, onClose }: Props) {
  const [ruleType, setRuleType] = useState<RuleType>("time_range");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [label, setLabel] = useState("");
  const [priority, setPriority] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [timezone, setTimezone] = useState("America/New_York");
  const [selectedDays, setSelectedDays] = useState<string[]>(["weekdays"]);
  const [deviceType, setDeviceType] = useState("mobile");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [customOp, setCustomOp] = useState("equals");
  const [customValue, setCustomValue] = useState("");

  function buildConditions(): Record<string, unknown> {
    switch (ruleType) {
      case "time_range":
        return { start_time: startTime, end_time: endTime, timezone };
      case "day_of_week":
        return { days: selectedDays };
      case "device":
        return { device_type: deviceType };
      case "geo_ip":
        return {
          ...(country && { country }),
          ...(region && { region }),
          ...(city && { city }),
        };
      case "schedule":
        return {
          ...(startDate && { start_date: startDate }),
          ...(endDate && { end_date: endDate }),
        };
      case "custom":
        return { key: customKey, operator: customOp, value: customValue };
      default:
        return {};
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("slug", slug);
    formData.set("token", token);
    formData.set("rule_type", ruleType);
    formData.set("destination_url", destinationUrl);
    formData.set("label", label);
    formData.set("priority", priority);
    formData.set("conditions", JSON.stringify(buildConditions()));

    const result = await createRoutingRule(formData);
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    onClose();
  }

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold font-serif text-[#e8e9ed] mb-5">
          New Routing Rule
        </h3>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
              Rule Type
            </label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as RuleType)}
              className="w-full px-4 py-3 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff]"
            >
              {RULE_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label} — {rt.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
              Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Lunch menu redirect"
              className="w-full px-4 py-3 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] placeholder-[#8b8fa3] focus:outline-none focus:border-[#6c63ff]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
              Destination URL
            </label>
            <input
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://..."
              required
              className="w-full px-4 py-3 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] placeholder-[#8b8fa3] focus:outline-none focus:border-[#6c63ff]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
              Priority (lower = higher priority)
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              min="1"
              max="999"
              className="w-full px-4 py-3 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff]"
            />
          </div>

          <div className="border-t border-[#2a2e3d] pt-4">
            <div className="text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-3">
              Conditions
            </div>

            {ruleType === "time_range" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#8b8fa3] mb-1">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8b8fa3] mb-1">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff] text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#8b8fa3] mb-1">Timezone</label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="America/New_York"
                    className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] placeholder-[#8b8fa3] focus:outline-none focus:border-[#6c63ff] text-sm"
                  />
                </div>
              </div>
            )}

            {ruleType === "day_of_week" && (
              <div className="flex flex-wrap gap-2">
                {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "weekdays", "weekends"].map(
                  (day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition capitalize ${
                        selectedDays.includes(day)
                          ? "bg-[#6c63ff] border-[#6c63ff] text-white"
                          : "bg-[#0f1117] border-[#2a2e3d] text-[#8b8fa3] hover:border-[#6c63ff]"
                      }`}
                    >
                      {day}
                    </button>
                  ),
                )}
              </div>
            )}

            {ruleType === "device" && (
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff] text-sm"
              >
                <option value="mobile">Mobile</option>
                <option value="desktop">Desktop</option>
                <option value="tablet">Tablet</option>
                <option value="robot">Robot / Bot</option>
              </select>
            )}

            {ruleType === "geo_ip" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country (e.g. US)"
                  className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] placeholder-[#8b8fa3] focus:outline-none focus:border-[#6c63ff] text-sm"
                />
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Region (optional)"
                  className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] placeholder-[#8b8fa3] focus:outline-none focus:border-[#6c63ff] text-sm"
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City (optional)"
                  className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] placeholder-[#8b8fa3] focus:outline-none focus:border-[#6c63ff] text-sm"
                />
              </div>
            )}

            {ruleType === "schedule" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8b8fa3] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8b8fa3] mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff] text-sm"
                  />
                </div>
              </div>
            )}

            {ruleType === "custom" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="Query parameter key"
                  className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] placeholder-[#8b8fa3] focus:outline-none focus:border-[#6c63ff] text-sm"
                />
                <select
                  value={customOp}
                  onChange={(e) => setCustomOp(e.target.value)}
                  className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff] text-sm"
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="starts_with">Starts With</option>
                  <option value="regex">Regex</option>
                </select>
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Value to match"
                  className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] placeholder-[#8b8fa3] focus:outline-none focus:border-[#6c63ff] text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#1a1d27] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] text-sm hover:bg-[#222633] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-[#6c63ff] hover:bg-[#7b73ff] text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
