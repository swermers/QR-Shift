import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { generateSlug, shortUrl } from "@/lib/constants";

function createSupabase(apiKey: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      global: { headers: { Authorization: `Bearer ${apiKey}` } },
    },
  );
}

async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", status: 401 };
  }

  const token = authHeader.slice(7);

  // Try as Supabase JWT first
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  if (user) {
    return { supabase, userId: user.id };
  }

  // Try as API key
  const adminSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  const { data: apiKey } = await adminSupabase
    .from("api_keys")
    .select("user_id, is_active")
    .eq("key_hash", token)
    .single();

  const key = apiKey as { user_id: string; is_active: boolean } | null;
  if (key?.is_active) {
    return { supabase: adminSupabase, userId: key.user_id };
  }

  return { error: "Invalid authentication", status: 401 };
}

/**
 * GET /api/v1/codes — List all QR codes for the authenticated user
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, userId } = auth;
  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const activeOnly = searchParams.get("active") !== "false";

  let query = supabase
    .from("qr_codes")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    meta: { total: count, limit, offset },
  });
}

/**
 * POST /api/v1/codes — Create a new QR code
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, userId } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { label, destination_url, custom_slug, tags } = body as {
    label?: string;
    destination_url?: string;
    custom_slug?: string;
    tags?: string[];
  };

  if (!label || !destination_url) {
    return NextResponse.json({ error: "label and destination_url are required" }, { status: 400 });
  }

  try {
    new URL(destination_url);
  } catch {
    return NextResponse.json({ error: "Invalid destination_url" }, { status: 400 });
  }

  const slug = custom_slug || generateSlug();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from("qr_codes")
    .insert({
      user_id: userId,
      slug,
      custom_slug: !!custom_slug,
      label,
      destination_url,
      short_url: shortUrl(slug),
      is_active: true,
      tags: tags || [],
    } as any)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
