"use client";

import { useRef, useState } from "react";
import { QRCode as QRCodeLogo } from "react-qrcode-logo";
import { useRouter } from "next/navigation";
import type { QRCodePublic, QRStyle } from "@/types/database";
import { updateQRStyle } from "@/lib/qr-style-actions";

interface Props {
  qr: QRCodePublic;
  token: string;
  shortUrl: string;
}

const EYE_RADIUS_OPTIONS = [
  { label: "Square", value: 0 },
  { label: "Rounded", value: 8 },
  { label: "Circle", value: 20 },
];

const QR_STYLES = [
  { label: "Squares", value: "squares" as const },
  { label: "Dots", value: "dots" as const },
];

export function CustomizePanel({ qr, token, shortUrl }: Props) {
  const style = qr.qr_style || {};
  const [fgColor, setFgColor] = useState(style.fg_color || "#000000");
  const [bgColor, setBgColor] = useState(style.bg_color || "#ffffff");
  const [logoUrl, setLogoUrl] = useState(style.logo_url || "");
  const [frameStyle, setFrameStyle] = useState<"squares" | "dots">(
    (style.frame_style as "squares" | "dots") || "squares",
  );
  const [eyeRadius, setEyeRadius] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();
  const qrRef = useRef<HTMLDivElement>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setStatus(null);

    const newStyle: QRStyle = {
      fg_color: fgColor,
      bg_color: bgColor,
      logo_url: logoUrl || undefined,
      frame_style: frameStyle,
    };

    const result = await updateQRStyle(qr.slug, token, newStyle);
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setStatus("Saved");
    router.refresh();
    setTimeout(() => setStatus(null), 2000);
  }

  function handleDownload() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const href = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = href;
    a.download = `${qr.label.replace(/\s+/g, "-").toLowerCase() || qr.slug}-qr.png`;
    a.click();
  }

  return (
    <section className="bg-[#1a1d27] border border-[#2a2e3d] rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-bold font-serif text-[#e8e9ed] mb-5">
        QR code preview
      </h2>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col items-center gap-4">
          <div
            ref={qrRef}
            className="rounded-xl p-4 inline-block"
            style={{ backgroundColor: bgColor }}
          >
            <QRCodeLogo
              value={shortUrl}
              size={220}
              fgColor={fgColor}
              bgColor={bgColor}
              logoImage={logoUrl || undefined}
              logoWidth={50}
              logoHeight={50}
              logoPadding={4}
              logoPaddingStyle="circle"
              qrStyle={frameStyle}
              eyeRadius={eyeRadius}
              quietZone={10}
            />
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 bg-[#3ecf8e] hover:bg-[#35b67d] text-[#0f1117] rounded-lg text-sm font-medium transition"
          >
            Download PNG
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
              Foreground
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-[#2a2e3d] cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] text-sm focus:outline-none focus:border-[#6c63ff]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
              Background
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-[#2a2e3d] cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] text-sm focus:outline-none focus:border-[#6c63ff]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
              Logo URL (optional)
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 bg-[#262a36] border border-[#3a3f52] rounded-lg text-[#e8e9ed] placeholder-[#8b8fa3] text-sm focus:outline-none focus:border-[#6c63ff]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
              Pattern
            </label>
            <div className="flex gap-2">
              {QR_STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setFrameStyle(s.value)}
                  className={`px-4 py-2 text-xs rounded-lg border transition ${
                    frameStyle === s.value
                      ? "bg-[#6c63ff] border-[#6c63ff] text-white"
                      : "bg-[#0f1117] border-[#2a2e3d] text-[#8b8fa3] hover:border-[#6c63ff]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
              Corner style
            </label>
            <div className="flex gap-2">
              {EYE_RADIUS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setEyeRadius(o.value)}
                  className={`px-4 py-2 text-xs rounded-lg border transition ${
                    eyeRadius === o.value
                      ? "bg-[#6c63ff] border-[#6c63ff] text-white"
                      : "bg-[#0f1117] border-[#2a2e3d] text-[#8b8fa3] hover:border-[#6c63ff]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-2.5 bg-[#6c63ff] hover:bg-[#7b73ff] text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save style"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
