"use server";

import { revalidatePath } from "next/cache";
import { verifyToken } from "@/lib/tokens";
import { getQR, saveQR } from "@/lib/storage";
import type { QRStyle } from "@/types/database";

type ActionResult = { success: true } | { error: string };

export async function updateQRStyle(slug: string, token: string, style: QRStyle): Promise<ActionResult> {
  const qr = await getQR(slug);
  if (!qr) return { error: "QR code not found" };
  if (!verifyToken(token, qr.edit_token_hash)) {
    return { error: "Invalid edit token" };
  }

  qr.qr_style = style;
  qr.updated_at = new Date().toISOString();
  await saveQR(qr);

  revalidatePath(`/edit/${slug}`);
  return { success: true };
}
