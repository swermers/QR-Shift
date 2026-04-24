import Link from "next/link";
import { getQR, getRules } from "@/lib/storage";
import { getAnalytics } from "@/lib/analytics";
import { verifyToken } from "@/lib/tokens";
import { editUrl, shortUrl } from "@/lib/constants";
import { NewQRBanner } from "@/components/editor/new-qr-banner";
import { LinkForm } from "@/components/editor/link-form";
import { CustomizePanel } from "@/components/editor/customize-panel";
import { RulesSection } from "@/components/editor/rules-section";
import { AnalyticsSection } from "@/components/editor/analytics-section";
import type { QRCodePublic } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string; new?: string }>;
}

export default async function EditPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const token = sp.token ?? "";

  const qr = await getQR(slug);
  if (!qr) return <NotFound />;
  if (!verifyToken(token, qr.edit_token_hash)) return <Unauthorized />;

  const [rules, analytics] = await Promise.all([
    getRules(slug),
    getAnalytics(slug, token, 30),
  ]);

  const publicQR: QRCodePublic = {
    slug: qr.slug,
    label: qr.label,
    destination_url: qr.destination_url,
    is_active: qr.is_active,
    qr_style: qr.qr_style,
    scan_count: qr.scan_count,
    click_count: qr.click_count,
    created_at: qr.created_at,
    updated_at: qr.updated_at,
  };

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="sticky top-0 z-40 border-b border-[#2a2e3d] bg-[#1a1d27]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-[#6c63ff] to-[#3ecf8e] bg-clip-text text-transparent font-serif"
          >
            QR Shift
          </Link>
          <Link
            href="/"
            className="text-sm text-[#8b8fa3] hover:text-[#e8e9ed] transition"
          >
            + New QR
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {sp.new === "1" && <NewQRBanner editUrl={editUrl(slug, token)} />}

        <LinkForm qr={publicQR} token={token} shortUrl={shortUrl(slug)} />
        <CustomizePanel qr={publicQR} token={token} shortUrl={shortUrl(slug)} />
        <RulesSection
          slug={slug}
          token={token}
          rules={rules}
          defaultDestination={qr.destination_url}
        />
        {analytics && <AnalyticsSection analytics={analytics} />}
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#e8e9ed] mb-2">
          QR code not found
        </h1>
        <p className="text-sm text-[#8b8fa3] mb-6">
          This QR doesn't exist — check the URL or create a new one.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-[#6c63ff] hover:bg-[#7b73ff] text-white rounded-lg text-sm font-medium transition inline-block"
        >
          Create a QR code
        </Link>
      </div>
    </div>
  );
}

function Unauthorized() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#e8e9ed] mb-2">
          Invalid edit link
        </h1>
        <p className="text-sm text-[#8b8fa3] mb-6 max-w-sm">
          Missing or wrong token. Edit links contain a secret token — make sure
          you're pasting the full URL you saved when creating the code.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-[#6c63ff] hover:bg-[#7b73ff] text-white rounded-lg text-sm font-medium transition inline-block"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
