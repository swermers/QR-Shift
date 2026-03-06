import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { RulesManager } from "@/components/rules/rules-manager";
import type { QRCode, RoutingRule } from "@/types/database";

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  const prof = profile as { display_name: string | null; email: string } | null;

  const { data: qrCodes } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("label", { ascending: true });

  const codes = (qrCodes ?? []) as unknown as QRCode[];
  const params = await searchParams;
  const selectedCodeId = params.code || codes[0]?.id || null;

  let rules: RoutingRule[] = [];
  if (selectedCodeId) {
    const { data: rulesData } = await supabase
      .from("routing_rules")
      .select("*")
      .eq("qr_code_id", selectedCodeId)
      .order("priority", { ascending: true });

    rules = (rulesData ?? []) as unknown as RoutingRule[];
  }

  return (
    <DashboardShell userName={prof?.display_name || prof?.email || "User"}>
      <RulesManager
        codes={codes}
        rules={rules}
        selectedCodeId={selectedCodeId}
      />
    </DashboardShell>
  );
}
