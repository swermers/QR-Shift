"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const displayName = (formData.get("display_name") as string)?.trim();
  if (!displayName) return { error: "Display name is required" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName } as any)
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!newPassword || newPassword.length < 8)
    return { error: "Password must be at least 8 characters" };
  if (newPassword !== confirmPassword)
    return { error: "Passwords do not match" };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { success: true };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Soft-delete all QR codes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase
    .from("qr_codes")
    .update({ is_active: false } as any)
    .eq("user_id", user.id);

  // Sign the user out (full account deletion requires admin/edge function)
  await supabase.auth.signOut();

  return { success: true };
}
