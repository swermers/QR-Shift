"use client";

import { useState } from "react";
import type { QRCode } from "@/types/database";
import { QRCodeCard } from "./qr-code-card";
import { CreateQRModal } from "./create-qr-modal";

interface QRCodeListProps {
  codes: QRCode[];
}

export function QRCodeList({ codes }: QRCodeListProps) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-serif text-[#e8e9ed]">
          Your QR Codes
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 bg-[#6c63ff] hover:bg-[#7b73ff] text-white rounded-lg text-sm font-medium transition"
        >
          + New QR Code
        </button>
      </div>

      {codes.length === 0 ? (
        <div className="text-center py-16 text-[#8b8fa3]">
          <div className="text-5xl opacity-40 mb-4">⎔</div>
          <h3 className="text-xl font-serif text-[#e8e9ed] mb-2">
            No QR codes yet
          </h3>
          <p className="text-sm">
            Create your first dynamic QR code — print it once, update the link
            anytime.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {codes.map((qr) => (
            <QRCodeCard key={qr.id} qr={qr} />
          ))}
        </div>
      )}

      {showCreate && <CreateQRModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
