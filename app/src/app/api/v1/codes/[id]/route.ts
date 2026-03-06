import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", status: 401 };
  }

  const token = authHeader.slice(7);

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

  // Try API key fallback
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
 * GET /api/v1/codes/:id — Get a single QR code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, userId } = auth;
  const { id } = await params;

  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  }

  // Also fetch routing rules and recent scans
  const { data: rules } = await supabase
    .from("routing_rules")
    .select("*")
    .eq("qr_code_id", id)
    .order("priority", { ascending: true });

  const { data: recentScans } = await supabase
    .from("scan_events")
    .select("scanned_at, device_type, country, city, referrer, destination_url")
    .eq("qr_code_id", id)
    .order("scanned_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    data: {
      ...data,
      routing_rules: rules || [],
      recent_scans: recentScans || [],
    },
  });
}

/**
 * PATCH /api/v1/codes/:id — Update a QR code
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, userId } = auth;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowedFields = ["label", "destination_url", "is_active", "tags", "qr_style", "metadata"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  if (updates.destination_url) {
    try {
      new URL(updates.destination_url as string);
    } catch {
      return NextResponse.json({ error: "Invalid destination_url" }, { status: 400 });
    }

    // Log URL change to history
    const { data: current } = await supabase
      .from("qr_codes")
      .select("destination_url")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    const row = current as { destination_url: string } | null;
    if (row && row.destination_url !== updates.destination_url) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from("link_history").insert({
        qr_code_id: id,
        previous_url: row.destination_url,
        new_url: updates.destination_url,
        changed_by: "api",
      } as any);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from("qr_codes")
    .update(updates as any)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "QR code not found or update failed" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

/**
 * DELETE /api/v1/codes/:id — Soft delete a QR code
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, userId } = auth;
  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from("qr_codes")
    .update({ is_active: false } as any)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
