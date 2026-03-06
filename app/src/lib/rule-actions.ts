"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createRoutingRule(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const qrCodeId = formData.get("qr_code_id") as string;
  const ruleType = formData.get("rule_type") as string;
  const destinationUrl = (formData.get("destination_url") as string)?.trim();
  const label = (formData.get("label") as string)?.trim() || null;
  const priority = parseInt(formData.get("priority") as string || "10", 10);
  const conditionsJson = formData.get("conditions") as string;

  if (!qrCodeId || !ruleType || !destinationUrl || !conditionsJson) {
    return { error: "All fields are required" };
  }

  try {
    new URL(destinationUrl);
  } catch {
    return { error: "Invalid destination URL" };
  }

  let conditions: Record<string, unknown>;
  try {
    conditions = JSON.parse(conditionsJson);
  } catch {
    return { error: "Invalid conditions" };
  }

  // Verify user owns the QR code
  const { data: code } = await supabase
    .from("qr_codes")
    .select("id")
    .eq("id", qrCodeId)
    .eq("user_id", user.id)
    .single();

  if (!code) return { error: "QR code not found" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("routing_rules").insert({
    qr_code_id: qrCodeId,
    rule_type: ruleType,
    destination_url: destinationUrl,
    label,
    priority,
    conditions,
    is_active: true,
  } as any);

  if (error) return { error: error.message };

  revalidatePath(`/rules`);
  return { success: true };
}

export async function deleteRoutingRule(ruleId: string, qrCodeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify user owns the QR code
  const { data: code } = await supabase
    .from("qr_codes")
    .select("id")
    .eq("id", qrCodeId)
    .eq("user_id", user.id)
    .single();

  if (!code) return { error: "QR code not found" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from("routing_rules")
    .delete()
    .eq("id", ruleId)
    .eq("qr_code_id", qrCodeId);

  if (error) return { error: error.message };

  revalidatePath(`/rules`);
  return { success: true };
}

export async function toggleRoutingRule(ruleId: string, qrCodeId: string, isActive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify ownership
  const { data: code } = await supabase
    .from("qr_codes")
    .select("id")
    .eq("id", qrCodeId)
    .eq("user_id", user.id)
    .single();

  if (!code) return { error: "QR code not found" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from("routing_rules")
    .update({ is_active: isActive } as any)
    .eq("id", ruleId)
    .eq("qr_code_id", qrCodeId);

  if (error) return { error: error.message };

  revalidatePath(`/rules`);
  return { success: true };
}
