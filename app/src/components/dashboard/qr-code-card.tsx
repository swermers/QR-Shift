"use client";

import { useState } from "react";
import type { QRCode } from "@/types/database";
import { deleteQRCode } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { CreateQRModal } from "./create-qr-modal";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function QRCodeCard({ qr }: { qr: QRCode }) {
  const [showEdit, setShowEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this QR code? Any printed copies will stop working.")) return;
    await deleteQRCode(qr.id);
    router.refresh();
  }

  async function copyShortLink() {
    await navigator.clipboard.writeText(qr.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalScans = (qr.scan_count ?? 0) + (qr.click_count ?? 0);

  return (
    <>
      <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-xl p-5 hover:border-[#6c63ff] transition grid grid-cols-[1fr_auto] gap-4 items-center sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-[#e8e9ed] truncate">
            {qr.label}
          </h3>
          <p className="text-xs text-[#8b8fa3] truncate mt-0.5">
            → {qr.destination_url}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-[#8b8fa3]">
            <span className="text-[#3ecf8e] font-medium">
              {totalScans} scans
            </span>
            <span>Updated {timeAgo(qr.updated_at)}</span>
          </div>

          {/* Short link + copy */}
          <div className="flex items-center gap-2 mt-2">
            <code className="text-xs text-[#6c63ff] bg-[#6c63ff]/10 px-2 py-0.5 rounded truncate max-w-[240px]">
              {qr.short_url}
            </code>
            <button
              onClick={copyShortLink}
              className="text-xs text-[#8b8fa3] hover:text-[#e8e9ed] transition"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="px-3 py-1.5 text-xs bg-[#1a1d27] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] hover:bg-[#222633] transition whitespace-nowrap"
          >
            Update Link
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-xs border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/10 transition"
          >
            Delete
          </button>
        </div>
      </div>

      {showEdit && (
        <CreateQRModal
          onClose={() => setShowEdit(false)}
          editingQR={qr}
        />
      )}
    </>
  );
}
