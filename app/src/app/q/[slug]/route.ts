import { NextRequest, NextResponse } from "next/server";
import {
  getQR,
  getRules,
  recordScan,
  incrementScanCount,
} from "@/lib/storage";
import { evaluateRules, parseDeviceType, type ScanContext } from "@/lib/routing";
import type { ScanEvent } from "@/types/database";

/**
 * Redirect engine — the core of QR Shift.
 * Handles both QR scans and short-link clicks.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const qr = await getQR(slug);

  if (!qr || !qr.is_active) {
    return new NextResponse(notFoundPage(), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  const userAgent = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");
  const source: "qr_scan" | "short_link" = referrer ? "short_link" : "qr_scan";

  const geo = geoFromHeaders(request);
  const context: ScanContext = {
    timestamp: new Date(),
    userAgent: userAgent ?? undefined,
    deviceType: parseDeviceType(userAgent),
    country: geo.country,
    region: geo.region,
    city: geo.city,
    referrer: referrer ?? undefined,
    customSignals: Object.fromEntries(request.nextUrl.searchParams.entries()),
  };

  const rules = await getRules(slug);
  const result = evaluateRules(rules, context, qr.destination_url);

  const event: ScanEvent = {
    scanned_at: new Date().toISOString(),
    source,
    device_type: context.deviceType ?? null,
    country: geo.country ?? null,
    region: geo.region ?? null,
    city: geo.city ?? null,
    referrer: referrer ?? null,
    rule_matched: result.matchedRuleId,
    destination_url: result.destinationUrl,
    custom_signals:
      Object.keys(context.customSignals ?? {}).length > 0
        ? (context.customSignals ?? null)
        : null,
  };

  // Fire-and-forget so we don't delay the redirect.
  recordScan(slug, event).catch(() => {});
  incrementScanCount(slug, source).catch(() => {});

  const isCrawler = /facebookexternalhit|twitterbot|slackbot|linkedinbot|whatsapp|telegrambot|discordbot/i.test(
    userAgent ?? "",
  );
  if (isCrawler) {
    return new NextResponse(ogPreviewPage(qr.label, result.destinationUrl, slug), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  return NextResponse.redirect(result.destinationUrl, 302);
}

interface GeoInfo {
  country?: string;
  region?: string;
  city?: string;
}

function geoFromHeaders(request: NextRequest): GeoInfo {
  const h = request.headers;
  const decode = (v: string | null) => {
    if (!v) return undefined;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  return {
    country: decode(h.get("x-vercel-ip-country")) ?? undefined,
    region: decode(h.get("x-vercel-ip-country-region")) ?? undefined,
    city: decode(h.get("x-vercel-ip-city")) ?? undefined,
  };
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta property="og:title" content="${safe(label)} — QR Shift">
<meta property="og:description" content="Scan or click to visit: ${safe(destination)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${safe(appUrl)}/q/${safe(slug)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${safe(label)} — QR Shift">
<meta name="twitter:description" content="Scan or click to visit: ${safe(destination)}">
<meta http-equiv="refresh" content="0;url=${safe(destination)}">
<title>${safe(label)} — QR Shift</title>
</head>
<body><p>Redirecting to <a href="${safe(destination)}">${safe(destination)}</a>...</p></body>
</html>`;
}
