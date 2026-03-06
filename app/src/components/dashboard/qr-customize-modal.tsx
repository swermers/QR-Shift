"use client";

import { useState, useRef } from "react";
import { QRCode as QRCodeLogo } from "react-qrcode-logo";
import { useRouter } from "next/navigation";
import type { QRCode, QRStyle } from "@/types/database";
import { updateQRStyle } from "@/lib/qr-style-actions";

interface Props {
  qr: QRCode;
  onClose: () => void;
}

const EYE_RADIUS_OPTIONS = [
  { label: "Square", value: 0 },
  { label: "Rounded", value: 8 },
  { label: "Circle", value: 20 },
];

const QR_STYLES = [
  { label: "Squares", value: "squares" },
  { label: "Dots", value: "dots" },
];

export function QRCustomizeModal({ qr, onClose }: Props) {
  const style = qr.qr_style || {};
  const [fgColor, setFgColor] = useState(style.fg_color || "#000000");
  const [bgColor, setBgColor] = useState(style.bg_color || "#ffffff");
  const [logoUrl, setLogoUrl] = useState(style.logo_url || "");
  const [frameStyle, setFrameStyle] = useState(style.frame_style || "squares");
  const [eyeRadius, setEyeRadius] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const qrRef = useRef<HTMLDivElement>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const newStyle: QRStyle = {
      fg_color: fgColor,
      bg_color: bgColor,
      logo_url: logoUrl || undefined,
      frame_style: frameStyle,
    };

    const result = await updateQRStyle(qr.id, newStyle);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    router.refresh();
    onClose();
  }

  async function handleDownload() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${qr.label.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    a.click();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        <h3 className="text-xl font-bold font-serif text-[#e8e9ed] mb-5">
          Customize QR Code
        </h3>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="flex flex-col items-center gap-4">
            <div
              ref={qrRef}
              className="bg-white rounded-xl p-4 inline-block"
              style={{ backgroundColor: bgColor }}
            >
              <QRCodeLogo
                value={qr.short_url}
                size={200}
                fgColor={fgColor}
                bgColor={bgColor}
                logoImage={logoUrl || undefined}
                logoWidth={50}
                logoHeight={50}
                logoPadding={4}
                logoPaddingStyle="circle"
                qrStyle={frameStyle === "dots" ? "dots" : "squares"}
                eyeRadius={eyeRadius}
                quietZone={10}
              />
            </div>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-[#3ecf8e] hover:bg-[#35b67d] text-[#0f1117] rounded-lg text-sm font-medium transition"
            >
              Download PNG
            </button>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Foreground Color */}
            <div>
              <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
                Foreground Color
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
                  className="flex-1 px-3 py-2 bg-[#0f1117] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] text-sm focus:outline-none focus:border-[#6c63ff]"
                />
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
                Background Color
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
                  className="flex-1 px-3 py-2 bg-[#0f1117] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] text-sm focus:outline-none focus:border-[#6c63ff]"
                />
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
                Logo Image URL (optional)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] placeholder-[#555] text-sm focus:outline-none focus:border-[#6c63ff]"
              />
            </div>

            {/* QR Style */}
            <div>
              <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
                Pattern Style
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

            {/* Eye Radius */}
            <div>
              <label className="block text-xs font-medium text-[#8b8fa3] uppercase tracking-wider mb-1.5">
                Corner Style
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
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-6 mt-6 border-t border-[#2a2e3d]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-[#1a1d27] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] text-sm hover:bg-[#222633] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2.5 bg-[#6c63ff] hover:bg-[#7b73ff] text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Style"}
          </button>
        </div>
      </div>
    </div>
  );
}
