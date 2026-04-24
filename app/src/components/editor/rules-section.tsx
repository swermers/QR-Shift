"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RoutingRule, RuleType } from "@/types/database";
import { deleteRoutingRule, toggleRoutingRule } from "@/lib/rule-actions";
import { CreateRuleModal } from "./create-rule-modal";

interface Props {
  slug: string;
  token: string;
  rules: RoutingRule[];
  defaultDestination: string;
}

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  time_range: "Time Range",
  day_of_week: "Day of Week",
  device: "Device Type",
  geo_ip: "Geo IP",
  schedule: "Date Schedule",
  scan_count: "Scan Count",
  custom: "Custom",
  composite: "Composite",
};

export function RulesSection({ slug, token, rules, defaultDestination }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  async function handleDelete(ruleId: string) {
    if (!confirm("Delete this routing rule?")) return;
    await deleteRoutingRule(slug, token, ruleId);
    router.refresh();
  }

  async function handleToggle(ruleId: string, currentActive: boolean) {
    await toggleRoutingRule(slug, token, ruleId, !currentActive);
    router.refresh();
  }

  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  return (
    <section className="bg-[#1a1d27] border border-[#2a2e3d] rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold font-serif text-[#e8e9ed]">
          Routing Rules
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-[#6c63ff] hover:bg-[#7b73ff] text-white rounded-lg text-sm font-medium transition"
        >
          + Add Rule
        </button>
      </div>

      <div className="bg-[#0f1117] border border-[#2a2e3d] rounded-xl p-4 mb-5 text-sm text-[#8b8fa3]">
        Default destination:{" "}
        <span className="text-[#e8e9ed] break-all">{defaultDestination}</span>
        <br />
        Rules are evaluated in priority order (lowest first). First match wins;
        fallthrough uses the default.
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-[#8b8fa3]">
          <p className="text-sm">
            No routing rules yet. Add one to redirect scans based on time,
            device, location, or query parameters.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((rule) => (
            <div
              key={rule.id}
              className={`bg-[#0f1117] border rounded-xl p-4 transition ${
                rule.is_active
                  ? "border-[#2a2e3d] hover:border-[#6c63ff]"
                  : "border-[#2a2e3d]/50 opacity-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#6c63ff]/10 text-[#6c63ff] font-medium">
                      {RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}
                    </span>
                    <span className="text-xs text-[#555]">
                      Priority: {rule.priority}
                    </span>
                    {!rule.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                        Disabled
                      </span>
                    )}
                  </div>
                  {rule.label && (
                    <h4 className="text-sm font-medium text-[#e8e9ed] mb-1">
                      {rule.label}
                    </h4>
                  )}
                  <p className="text-xs text-[#8b8fa3] break-all">
                    → {rule.destination_url}
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

      {showCreate && (
        <CreateRuleModal
          slug={slug}
          token={token}
          onClose={() => setShowCreate(false)}
        />
      )}
    </section>
  );
}
