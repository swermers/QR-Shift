import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { SettingsPanel } from "@/components/settings/settings-panel";
import type { Plan } from "@/types/database";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, created_at")
    .eq("id", user.id)
    .single();

  const { data: billing } = await supabase
    .from("billing_accounts")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  // Count active QR codes
  const { count: totalCodes } = await supabase
    .from("qr_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  // Count scans this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Get user's QR code IDs first, then count scans
  const { data: userCodes } = await supabase
    .from("qr_codes")
    .select("id")
    .eq("user_id", user.id);

  let totalScansThisMonth = 0;
  if (userCodes && userCodes.length > 0) {
    const codeIds = userCodes.map((c: { id: string }) => c.id);
    const { count } = await supabase
      .from("scan_events")
      .select("id", { count: "exact", head: true })
      .in("qr_code_id", codeIds)
      .gte("scanned_at", monthStart);
    totalScansThisMonth = count ?? 0;
  }

  const prof = profile as {
    display_name: string | null;
    email: string;
    created_at: string;
  } | null;

  const plan = ((billing as { plan: string } | null)?.plan ?? "free") as Plan;

  return (
    <DashboardShell userName={prof?.display_name || prof?.email || "User"}>
      <SettingsPanel
        profile={{
          display_name: prof?.display_name ?? null,
          email: prof?.email ?? user.email ?? "",
          created_at: prof?.created_at ?? user.created_at,
        }}
        plan={plan}
        usage={{
          totalCodes: totalCodes ?? 0,
          totalScansThisMonth,
        }}
      />
    </DashboardShell>
  );
}
