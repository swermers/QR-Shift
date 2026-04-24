"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QRCodePublic } from "@/types/database";
import { deleteQRCode, setQRActive, updateQRCode } from "@/lib/actions";

interface Props {
  qr: QRCodePublic;
  token: string;
  shortUrl: string;
}

export function LinkForm({ qr, token, shortUrl }: Props) {
  const [label, setLabel] = useState(qr.label);
  const [url, setUrl] = useState(qr.destination_url);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setStatus(null);
    const formData = new FormData();
    formData.set("slug", qr.slug);
    formData.set("token", token);
    formData.set("label", label);
    formData.set("destination_url", url);
    const res = await updateQRCode(formData);
    setSaving(false);
    if ("error" in res) {
      setError(res.error);
    } else {
      setStatus("Saved");
      router.refresh();
      setTimeout(() => setStatus(null), 2000);
    }
  }

  async function handleToggleActive() {
    const res = await setQRActive(qr.slug, token, !qr.is_active);
    if ("error" in res) setError(res.error);
    else router.refresh();
  }

  async function handleDelete() {
    if (
      !confirm(
        "Delete this QR code? Printed copies will stop working and the data cannot be recovered.",
      )
    )
      return;
    const res = await deleteQRCode(qr.slug, token);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push("/");
  }

  async function copyShort() {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalScans = (qr.scan_count ?? 0) + (qr.click_count ?? 0);

  return (
    <section className="bg-[#1a1d27] border border-[#2a2e3d] rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold font-serif text-[#e8e9ed]">Link</h2>
        <div className="text-xs text-[#8b8fa3]">
          {totalScans} total {totalScans === 1 ? "hit" : "hits"}
          {!qr.is_active && (
            <span className="ml-2 px-2 py-0.5 rounded bg-red-500/10 text-red-400">
              Disabled
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <code className="text-xs text-[#6c63ff] bg-[#6c63ff]/10 px-3 py-2 rounded-lg flex-1 truncate">
          {shortUrl}
        </code>
        <button
          onClick={copyShort}
          className="px-3 py-2 text-xs bg-[#1a1d27] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] hover:bg-[#222633] transition whitespace-nowrap"
        >
          {copied ? "Copied!" : "Copy short link"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}
      {status && (
        <div className="bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e] rounded-lg px-4 py-3 text-sm mb-4">
          {status}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            maxLength={80}
            className="w-full px-4 py-3 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
            Default destination URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="w-full px-4 py-3 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] focus:outline-none focus:border-[#6c63ff]"
          />
          <p className="text-xs text-[#6b7186] mt-1">
            Used when no routing rule matches.
          </p>
        </div>
        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleToggleActive}
              className="px-3 py-2 text-xs bg-[#1a1d27] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] hover:bg-[#222633] transition"
            >
              {qr.is_active ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-xs border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/10 transition"
            >
              Delete
            </button>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-[#6c63ff] hover:bg-[#7b73ff] text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
