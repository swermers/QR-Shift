import Link from "next/link";
import { CreateForm } from "@/components/create-form";
import { isPersistent } from "@/lib/storage";

export default function HomePage() {
  const persistent = isPersistent();

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center px-4 py-12 text-center">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#6c63ff]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#3ecf8e]/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-xl w-full">
        <h1 className="text-5xl sm:text-6xl font-bold font-serif bg-gradient-to-r from-[#6c63ff] to-[#3ecf8e] bg-clip-text text-transparent mb-4">
          QR Shift
        </h1>
        <p className="text-xl text-[#8b8fa3] mb-2">
          Print once, update anytime.
        </p>
        <p className="text-sm text-[#8b8fa3] max-w-md mx-auto mb-8">
          Dynamic QR codes with context-aware routing. No account required —
          you get a private edit link after creating a code. Save it to manage
          the QR later.
        </p>

        <div className="bg-[#1a1d27] border border-[#2a2e3d] rounded-2xl p-6 text-left">
          <CreateForm />
        </div>

        {!persistent && (
          <div className="mt-6 bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] rounded-lg px-4 py-3 text-xs text-left">
            <strong>In-memory dev mode.</strong> No <code>UPSTASH_REDIS_REST_URL</code>{" "}
            configured — QR codes will not persist across restarts and will not
            survive deployment. Set up Upstash (see the README) before sharing
            links.
          </div>
        )}

        <p className="text-xs text-[#555] mt-8">
          Already have an edit link? Paste it in your browser to manage your QR.
        </p>

        <p className="text-xs text-[#555] mt-2">
          <Link href="https://github.com/swermers/qr-shift" className="underline hover:text-[#8b8fa3]">
            View source on GitHub
          </Link>
        </p>
      </div>
    </div>
  );
}
