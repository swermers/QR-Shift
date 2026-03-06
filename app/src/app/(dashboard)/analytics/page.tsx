import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { getAnalytics } from "@/lib/analytics";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import type { QRCode } from "@/types/database";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; days?: string }>;
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
    .select("id, label, slug")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("label", { ascending: true });

  const codes = (qrCodes ?? []) as { id: string; label: string; slug: string }[];
  const params = await searchParams;
  const selectedCode = params.code || undefined;
  const days = parseInt(params.days || "30", 10);

  const analytics = await getAnalytics(selectedCode, days);

  return (
    <DashboardShell userName={prof?.display_name || prof?.email || "User"}>
      <AnalyticsDashboard
        analytics={analytics}
        codes={codes}
        selectedCode={selectedCode}
        days={days}
      />
    </DashboardShell>
  );
}
