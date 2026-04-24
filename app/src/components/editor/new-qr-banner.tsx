"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function NewQRBanner({ editUrl }: { editUrl: string }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function copy() {
    await navigator.clipboard.writeText(editUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function dismiss() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 rounded-xl p-5 mb-8">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="text-[#3ecf8e] font-serif font-bold text-lg">
            Your QR code is live
          </h3>
          <p className="text-sm text-[#8b8fa3] mt-1">
            Bookmark this edit link — it's the only way back. Anyone with this
            link can change the destination.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-[#8b8fa3] hover:text-[#e8e9ed] text-sm shrink-0"
        >
          Dismiss
        </button>
      </div>
      <div className="flex items-center gap-2">
        <code className="text-xs text-[#3ecf8e] bg-[#0f1117] border border-[#2a2e3d] rounded px-3 py-2 flex-1 overflow-x-auto whitespace-nowrap">
          {editUrl}
        </code>
        <button
          onClick={copy}
          className="px-3 py-2 text-xs bg-[#3ecf8e] hover:bg-[#35b67d] text-[#0f1117] rounded-lg font-medium transition whitespace-nowrap"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
