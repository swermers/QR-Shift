import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { QRCodeList } from "@/components/dashboard/qr-code-list";
import { StatsRow } from "@/components/dashboard/stats-row";
import type { QRCode } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  const { data: qrCodes } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  const codes = (qrCodes ?? []) as unknown as QRCode[];
  const totalScans = codes.reduce((sum, q) => sum + (q.scan_count ?? 0) + (q.click_count ?? 0), 0);
  const lastUpdated = codes.length > 0 ? codes[0].updated_at : null;

  const prof = profile as { display_name: string | null; email: string } | null;

  return (
    <DashboardShell
      userName={prof?.display_name || prof?.email || "User"}
    >
      <StatsRow
        totalCodes={codes.length}
        totalScans={totalScans}
        lastUpdated={lastUpdated}
      />
      <QRCodeList codes={codes} />
    </DashboardShell>
  );
}
