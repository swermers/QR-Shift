"use server";

import { revalidatePath } from "next/cache";
import { generateSlug } from "@/lib/constants";
import { generateEditToken, hashToken, verifyToken } from "@/lib/tokens";
import { getQR, saveQR, deleteQR } from "@/lib/storage";
import type { QRCode } from "@/types/database";

export type CreateQRResult =
  | { error: string }
  | { slug: string; editToken: string };

export type ActionResult = { success: true } | { error: string };

export async function createQRCode(formData: FormData): Promise<CreateQRResult> {
  const label = (formData.get("label") as string | null)?.trim();
  const destinationUrl = (formData.get("destination_url") as string | null)?.trim();

  if (!label || !destinationUrl) {
    return { error: "Label and URL are required" };
  }
  try {
    new URL(destinationUrl);
  } catch {
    return { error: "Invalid URL" };
  }

  // Retry on the astronomically-unlikely slug collision.
  let slug = generateSlug();
  for (let i = 0; i < 5; i++) {
    const existing = await getQR(slug);
    if (!existing) break;
    slug = generateSlug();
  }

  const editToken = generateEditToken();
  const now = new Date().toISOString();

  const qr: QRCode = {
    slug,
    label,
    destination_url: destinationUrl,
    is_active: true,
    qr_style: null,
    edit_token_hash: hashToken(editToken),
    scan_count: 0,
    click_count: 0,
    created_at: now,
    updated_at: now,
  };

  await saveQR(qr);
  return { slug, editToken };
}

type AuthResult =
  | { kind: "error"; error: string }
  | { kind: "ok"; qr: QRCode };

function authorize(qr: QRCode | null, token: string | null): AuthResult {
  if (!qr) return { kind: "error", error: "QR code not found" };
  if (!verifyToken(token, qr.edit_token_hash)) {
    return { kind: "error", error: "Invalid edit token" };
  }
  return { kind: "ok", qr };
}

export async function updateQRCode(formData: FormData): Promise<ActionResult> {
  const slug = formData.get("slug") as string | null;
  const token = formData.get("token") as string | null;
  const label = (formData.get("label") as string | null)?.trim();
  const destinationUrl = (formData.get("destination_url") as string | null)?.trim();

  if (!slug || !label || !destinationUrl) {
    return { error: "All fields are required" };
  }
  try {
    new URL(destinationUrl);
  } catch {
    return { error: "Invalid URL" };
  }

  const auth = authorize(await getQR(slug), token);
  if (auth.kind === "error") return { error: auth.error };

  auth.qr.label = label;
  auth.qr.destination_url = destinationUrl;
  auth.qr.updated_at = new Date().toISOString();
  await saveQR(auth.qr);

  revalidatePath(`/edit/${slug}`);
  return { success: true };
}

export async function deleteQRCode(slug: string, token: string): Promise<ActionResult> {
  const auth = authorize(await getQR(slug), token);
  if (auth.kind === "error") return { error: auth.error };
  await deleteQR(slug);
  return { success: true };
}

export async function setQRActive(slug: string, token: string, active: boolean): Promise<ActionResult> {
  const auth = authorize(await getQR(slug), token);
  if (auth.kind === "error") return { error: auth.error };
  auth.qr.is_active = active;
  auth.qr.updated_at = new Date().toISOString();
  await saveQR(auth.qr);
  revalidatePath(`/edit/${slug}`);
  return { success: true };
}
