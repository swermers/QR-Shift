"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createQRCode } from "@/lib/actions";

export function CreateForm() {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("label", label);
    formData.set("destination_url", url);

    const result = await createQRCode(formData);
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(
      `/edit/${result.slug}?token=${encodeURIComponent(result.editToken)}&new=1`,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
          Label
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Song of the Day"
          required
          maxLength={80}
          className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] placeholder-[#555] focus:outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/20 transition"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
          Destination URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/..."
          required
          className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] placeholder-[#555] focus:outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/20 transition"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-[#6c63ff] hover:bg-[#7b73ff] text-white rounded-lg font-medium transition disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create QR Code"}
      </button>
    </form>
  );
}
