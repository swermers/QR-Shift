"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { verifyToken } from "@/lib/tokens";
import { getQR, getRules, saveRules } from "@/lib/storage";
import type { RoutingRule, RuleConditions, RuleType } from "@/types/database";

type ActionResult = { success: true } | { error: string };

function newRuleId(): string {
  return randomBytes(8).toString("hex");
}

type Authz = { kind: "error"; error: string } | { kind: "ok" };

async function authorize(slug: string, token: string | null): Promise<Authz> {
  const qr = await getQR(slug);
  if (!qr) return { kind: "error", error: "QR code not found" };
  if (!verifyToken(token, qr.edit_token_hash)) {
    return { kind: "error", error: "Invalid edit token" };
  }
  return { kind: "ok" };
}

export async function createRoutingRule(formData: FormData): Promise<ActionResult> {
  const slug = formData.get("slug") as string | null;
  const token = formData.get("token") as string | null;
  if (!slug) return { error: "Missing slug" };

  const auth = await authorize(slug, token);
  if (auth.kind === "error") return { error: auth.error };

  const ruleType = formData.get("rule_type") as RuleType | null;
  const destinationUrl = (formData.get("destination_url") as string | null)?.trim();
  const label = (formData.get("label") as string | null)?.trim() || null;
  const priority = parseInt((formData.get("priority") as string | null) ?? "10", 10);
  const conditionsJson = formData.get("conditions") as string | null;

  if (!ruleType || !destinationUrl || !conditionsJson) {
    return { error: "All fields are required" };
  }
  try {
    new URL(destinationUrl);
  } catch {
    return { error: "Invalid destination URL" };
  }

  let conditions: RuleConditions;
  try {
    conditions = JSON.parse(conditionsJson) as RuleConditions;
  } catch {
    return { error: "Invalid conditions" };
  }

  const rules = await getRules(slug);
  const rule: RoutingRule = {
    id: newRuleId(),
    rule_type: ruleType,
    conditions,
    destination_url: destinationUrl,
    payload: null,
    label,
    priority: Number.isFinite(priority) ? priority : 10,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  rules.push(rule);
  await saveRules(slug, rules);

  revalidatePath(`/edit/${slug}`);
  return { success: true };
}

export async function deleteRoutingRule(slug: string, token: string, ruleId: string): Promise<ActionResult> {
  const auth = await authorize(slug, token);
  if (auth.kind === "error") return { error: auth.error };

  const rules = await getRules(slug);
  await saveRules(
    slug,
    rules.filter((r) => r.id !== ruleId),
  );

  revalidatePath(`/edit/${slug}`);
  return { success: true };
}

export async function toggleRoutingRule(
  slug: string,
  token: string,
  ruleId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const auth = await authorize(slug, token);
  if (auth.kind === "error") return { error: auth.error };

  const rules = await getRules(slug);
  const idx = rules.findIndex((r) => r.id === ruleId);
  if (idx < 0) return { error: "Rule not found" };
  rules[idx].is_active = isActive;
  await saveRules(slug, rules);

  revalidatePath(`/edit/${slug}`);
  return { success: true };
}
