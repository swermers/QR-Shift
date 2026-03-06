"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { QRCode, RoutingRule, RuleType } from "@/types/database";
import { createRoutingRule, deleteRoutingRule, toggleRoutingRule } from "@/lib/rule-actions";
import { CreateRuleModal } from "./create-rule-modal";

interface Props {
  codes: QRCode[];
  rules: RoutingRule[];
  selectedCodeId: string | null;
}

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  time_range: "Time Range",
  day_of_week: "Day of Week",
  device: "Device Type",
  geo_fence: "Geo-Fence",
  geo_ip: "Geo IP",
  schedule: "Date Schedule",
  scan_count: "Scan Count",
  custom: "Custom",
};

export function RulesManager({ codes, rules, selectedCodeId }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectCode(codeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("code", codeId);
    router.push(`/rules?${params.toString()}`);
  }

  async function handleDelete(ruleId: string) {
    if (!selectedCodeId) return;
    if (!confirm("Delete this routing rule?")) return;
    await deleteRoutingRule(ruleId, selectedCodeId);
    router.refresh();
  }

  async function handleToggle(ruleId: string, currentActive: boolean) {
    if (!selectedCodeId) return;
    await toggleRoutingRule(ruleId, selectedCodeId, !currentActive);
    router.refresh();
  }

  if (codes.length === 0) {
    return (
      <div className="text-center py-16 text-[#8b8fa3]">
        <h2 className="text-2xl font-bold font-serif text-[#e8e9ed] mb-4">Routing Rules</h2>
        <p className="text-sm">Create a QR code first to set up routing rules.</p>
      </div>
    );
  }

  const selectedCode = codes.find((c) => c.id === selectedCodeId);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold font-serif text-[#e8e9ed]">Routing Rules</h2>
        <div className="flex gap-3">
          <select
            value={selectedCodeId || ""}
            onChange={(e) => selectCode(e.target.value)}
            className="bg-[#1a1d27] border border-[#2a2e3d] rounded-lg px-3 py-2 text-sm text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff]"
          >
            {codes.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[#6c63ff] hover:bg-[#7b73ff] text-white rounded-lg text-sm font-medium transition"
          >
            + Add Rule
          </button>
        </div>
      </div>

      {selectedCode && (
        <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-xl p-4 mb-6 text-sm text-[#8b8fa3]">
          Default destination: <span className="text-[#e8e9ed]">{selectedCode.destination_url}</span>
          <br />
          Rules are evaluated in priority order. First match wins.
        </div>
      )}

      {rules.length === 0 ? (
        <div className="text-center py-16 text-[#8b8fa3]">
          <div className="text-4xl opacity-40 mb-4">&#x2696;</div>
          <h3 className="text-lg font-serif text-[#e8e9ed] mb-2">No routing rules</h3>
          <p className="text-sm">
            Add rules to redirect scans based on time, device, location, and more.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-[#1a1d27] border rounded-xl p-5 transition ${
                rule.is_active ? "border-[#2a2e3d] hover:border-[#6c63ff]" : "border-[#2a2e3d]/50 opacity-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#6c63ff]/10 text-[#6c63ff] font-medium">
                      {RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}
                    </span>
                    <span className="text-xs text-[#555]">Priority: {rule.priority}</span>
                    {!rule.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                        Disabled
                      </span>
                    )}
                  </div>
                  {rule.label && (
                    <h4 className="text-sm font-medium text-[#e8e9ed] mb-1">{rule.label}</h4>
                  )}
                  <p className="text-xs text-[#8b8fa3] truncate">
                    &rarr; {rule.destination_url}
                  </p>
                  <pre className="text-xs text-[#555] mt-2 overflow-x-auto">
                    {JSON.stringify(rule.conditions, null, 2)}
                  </pre>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(rule.id, rule.is_active)}
                    className="px-3 py-1.5 text-xs bg-[#1a1d27] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] hover:bg-[#222633] transition"
                  >
                    {rule.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="px-3 py-1.5 text-xs border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && selectedCodeId && (
        <CreateRuleModal
          qrCodeId={selectedCodeId}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
