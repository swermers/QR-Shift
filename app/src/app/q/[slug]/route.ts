import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { evaluateRules, parseDeviceType, type ScanContext } from "@/lib/routing";
import type { RoutingRule } from "@/types/database";

/**
 * Redirect engine — the core of QR Shift.
 * Handles both QR scans and short link clicks.
 * Target: <50ms with cache hit (Phase 2: Redis).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Create a Supabase client without cookie auth (public read)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  // Look up the QR code
  const { data: qrRaw, error } = await supabase
    .from("qr_codes")
    .select("id, destination_url, is_active, label, qr_style, metadata")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  const qr = qrRaw as { id: string; destination_url: string; label: string } | null;

  if (error || !qr) {
    return new NextResponse(notFoundPage(), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Build scan context from request
  const userAgent = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");
  const source = referrer ? "short_link" : "qr_scan";

  const context: ScanContext = {
    timestamp: new Date(),
    userAgent: userAgent ?? undefined,
    deviceType: parseDeviceType(userAgent),
    referrer: referrer ?? undefined,
    customSignals: Object.fromEntries(request.nextUrl.searchParams.entries()),
  };

  // Fetch routing rules for this QR code
  const { data: rulesRaw } = await supabase
    .from("routing_rules")
    .select("*")
    .eq("qr_code_id", qr.id)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  const rules = (rulesRaw ?? []) as unknown as RoutingRule[];

  // Evaluate rules
  const result = evaluateRules(rules, context, qr.destination_url);

  // Log scan event asynchronously (fire and forget)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase
    .from("scan_events")
    .insert({
      qr_code_id: qr.id,
      source,
      user_agent: userAgent,
      device_type: context.deviceType ?? null,
      referrer,
      rule_matched: result.matchedRuleId,
      destination_url: result.destinationUrl,
      custom_signals: context.customSignals ?? null,
    } as any)
    .then(() => {});

  // Increment scan/click count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase.rpc("increment_scan", { p_slug: slug, p_source: source } as any).then(() => {});

  // Serve OG meta tags for rich previews before redirect
  const isCrawler = /facebookexternalhit|twitterbot|slackbot|linkedinbot|whatsapp|telegrambot|discordbot/i.test(
    userAgent ?? "",
  );

  if (isCrawler) {
    return new NextResponse(ogPreviewPage(qr.label, result.destinationUrl, slug), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  // 302 redirect
  return NextResponse.redirect(result.destinationUrl, 302);
}

function notFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Link Not Found — QR Shift</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  background:#0f1117;color:#e8e9ed;text-align:center;padding:2rem}
  h1{font-size:2rem;margin-bottom:0.5rem}
  p{color:#8b8fa3;margin-top:0.5rem}
  a{color:#6c63ff;text-decoration:none}
</style>
</head>
<body><div><h1>Link Not Found</h1><p>This QR code is no longer active or doesn't exist.</p>
<p><a href="/">Go to QR Shift</a></p></div></body></html>`;
}

function ogPreviewPage(label: string, destination: string, slug: string): string {
  const safe = (s: string) => s.replace(/[<>"&]/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta property="og:title" content="${safe(label)} — QR Shift">
<meta property="og:description" content="Scan or click to visit: ${safe(destination)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${process.env.NEXT_PUBLIC_APP_URL}/q/${safe(slug)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${safe(label)} — QR Shift">
<meta name="twitter:description" content="Scan or click to visit: ${safe(destination)}">
<meta http-equiv="refresh" content="0;url=${safe(destination)}">
<title>${safe(label)} — QR Shift</title>
</head>
<body><p>Redirecting to <a href="${safe(destination)}">${safe(destination)}</a>...</p></body>
</html>`;
}
