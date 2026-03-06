"use client";

import { useState } from "react";
import { createQRCode, updateQRCode } from "@/lib/actions";
import { useRouter } from "next/navigation";
import type { QRCode } from "@/types/database";

interface CreateQRModalProps {
  onClose: () => void;
  editingQR?: QRCode;
}

export function CreateQRModal({ onClose, editingQR }: CreateQRModalProps) {
  const [label, setLabel] = useState(editingQR?.label ?? "");
  const [url, setUrl] = useState(editingQR?.destination_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isEditing = !!editingQR;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("label", label);
    formData.set("destination_url", url);
    if (editingQR) formData.set("id", editingQR.id);

    const result = isEditing
      ? await updateQRCode(formData)
      : await createQRCode(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-2xl p-6 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
        <h3 className="text-xl font-bold font-serif text-[#e8e9ed] mb-5">
          {isEditing ? "Update Link" : "New QR Code"}
        </h3>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="https://youtube.com/watch?v=..."
              required
              className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] placeholder-[#555] focus:outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/20 transition"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#1a1d27] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] text-sm hover:bg-[#222633] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-[#6c63ff] hover:bg-[#7b73ff] text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {loading
                ? isEditing ? "Updating..." : "Creating..."
                : isEditing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
