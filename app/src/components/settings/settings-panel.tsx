"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfile,
  updatePassword,
  deleteAccount,
} from "@/lib/settings-actions";
import { signOut } from "@/lib/actions";
import type { Plan } from "@/types/database";
import { PLAN_LIMITS } from "@/lib/constants";

interface SettingsPanelProps {
  profile: {
    display_name: string | null;
    email: string;
    created_at: string;
  };
  plan: Plan;
  usage: {
    totalCodes: number;
    totalScansThisMonth: number;
  };
}

export function SettingsPanel({ profile, plan, usage }: SettingsPanelProps) {
  const router = useRouter();
  const limits = PLAN_LIMITS[plan];

  // Profile form
  const [displayName, setDisplayName] = useState(
    profile.display_name ?? ""
  );
  const [profileMsg, setProfileMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    const fd = new FormData();
    fd.set("display_name", displayName);
    const res = await updateProfile(fd);
    setProfileLoading(false);
    if (res.error) {
      setProfileMsg({ type: "error", text: res.error });
    } else {
      setProfileMsg({ type: "success", text: "Profile updated" });
      router.refresh();
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMsg(null);
    const fd = new FormData();
    fd.set("new_password", newPassword);
    fd.set("confirm_password", confirmPassword);
    const res = await updatePassword(fd);
    setPasswordLoading(false);
    if (res.error) {
      setPasswordMsg({ type: "error", text: res.error });
    } else {
      setPasswordMsg({ type: "success", text: "Password updated" });
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    await deleteAccount();
    router.push("/login");
    router.refresh();
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  function formatLimit(val: number): string {
    if (val === Infinity) return "Unlimited";
    return val.toLocaleString();
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#e8e9ed]">Settings</h1>
        <p className="text-sm text-[#8b8fa3] mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Plan & Usage */}
      <section className="bg-[#1a1d27] border border-[#2a2e3d] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#e8e9ed] mb-4">
          Plan &amp; Usage
        </h2>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#6c63ff]/15 text-[#6c63ff] capitalize">
            {plan}
          </span>
          <span className="text-sm text-[#8b8fa3]">
            Member since {memberSince}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UsageBar
            label="QR Codes"
            used={usage.totalCodes}
            max={limits.max_codes}
          />
          <UsageBar
            label="Scans this month"
            used={usage.totalScansThisMonth}
            max={limits.max_scans_per_month}
          />
        </div>
      </section>

      {/* Profile */}
      <section className="bg-[#1a1d27] border border-[#2a2e3d] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#e8e9ed] mb-4">Profile</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#8b8fa3] mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2e3d] rounded-lg text-[#8b8fa3] text-sm cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8b8fa3] mb-1">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] text-sm focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff] outline-none transition"
            />
          </div>
          {profileMsg && (
            <p
              className={`text-sm ${
                profileMsg.type === "error"
                  ? "text-red-400"
                  : "text-[#3ecf8e]"
              }`}
            >
              {profileMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={profileLoading}
            className="px-4 py-2 bg-[#6c63ff] hover:bg-[#5b54e0] text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {profileLoading ? "Saving..." : "Save"}
          </button>
        </form>
      </section>

      {/* Change Password */}
      <section className="bg-[#1a1d27] border border-[#2a2e3d] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#e8e9ed] mb-4">
          Change Password
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#8b8fa3] mb-1">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] text-sm focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff] outline-none transition"
              placeholder="Min 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8b8fa3] mb-1">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] text-sm focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff] outline-none transition"
              placeholder="Re-enter password"
            />
          </div>
          {passwordMsg && (
            <p
              className={`text-sm ${
                passwordMsg.type === "error"
                  ? "text-red-400"
                  : "text-[#3ecf8e]"
              }`}
            >
              {passwordMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={passwordLoading}
            className="px-4 py-2 bg-[#6c63ff] hover:bg-[#5b54e0] text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {passwordLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>

      {/* Danger Zone */}
      <section className="bg-[#1a1d27] border border-red-500/30 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-[#8b8fa3] mb-4">
          Permanently deactivate all your QR codes and sign out. This cannot be
          undone.
        </p>
        {!showDeleteConfirm ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-[#1a1d27] border border-[#2a2e3d] text-[#e8e9ed] text-sm rounded-lg hover:bg-[#222633] transition"
            >
              Sign Out
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg hover:bg-red-500/20 transition"
            >
              Delete Account
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleteLoading ? "Deleting..." : "Yes, delete my account"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 bg-[#1a1d27] border border-[#2a2e3d] text-[#e8e9ed] text-sm rounded-lg hover:bg-[#222633] transition"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function UsageBar({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number;
}) {
  const pct = max === Infinity ? 0 : Math.min((used / max) * 100, 100);
  const isUnlimited = max === Infinity;
  const isWarning = !isUnlimited && pct >= 80;
  const barColor = isWarning ? "bg-amber-500" : "bg-[#6c63ff]";

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#8b8fa3]">{label}</span>
        <span className="text-[#e8e9ed]">
          {used.toLocaleString()}
          {isUnlimited ? "" : ` / ${max.toLocaleString()}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-[#0f1117] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {isUnlimited && (
        <p className="text-xs text-[#3ecf8e]">Unlimited</p>
      )}
    </div>
  );
}
