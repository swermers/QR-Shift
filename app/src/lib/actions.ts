"use server";

import { createClient } from "@/lib/supabase/server";
import { generateSlug, shortUrl } from "@/lib/constants";
import { revalidatePath } from "next/cache";

export async function createQRCode(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const label = (formData.get("label") as string)?.trim();
  const destinationUrl = (formData.get("destination_url") as string)?.trim();

  if (!label || !destinationUrl) return { error: "Label and URL are required" };

  try {
    new URL(destinationUrl);
  } catch {
    return { error: "Invalid URL" };
  }

  const slug = generateSlug();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("qr_codes").insert({
    user_id: user.id,
    slug,
    custom_slug: false,
    label,
    destination_url: destinationUrl,
    short_url: shortUrl(slug),
    is_active: true,
    tags: [],
  } as any);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { slug };
}

export async function updateQRCode(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const id = formData.get("id") as string;
  const label = (formData.get("label") as string)?.trim();
  const destinationUrl = (formData.get("destination_url") as string)?.trim();

  if (!id || !label || !destinationUrl) return { error: "All fields are required" };

  try {
    new URL(destinationUrl);
  } catch {
    return { error: "Invalid URL" };
  }

  // Get current destination for history
  const { data: current } = await supabase
    .from("qr_codes")
    .select("destination_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const row = current as { destination_url: string } | null;
  if (!row) return { error: "QR code not found" };

  // Log history if URL changed
  if (row.destination_url !== destinationUrl) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("link_history").insert({
      qr_code_id: id,
      previous_url: row.destination_url,
      new_url: destinationUrl,
      changed_by: "user",
    } as any);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from("qr_codes")
    .update({ label, destination_url: destinationUrl } as any)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteQRCode(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from("qr_codes")
    .update({ is_active: false } as any)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
