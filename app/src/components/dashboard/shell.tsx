"use client";

import { signOut } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface DashboardShellProps {
  userName: string;
  children: React.ReactNode;
}

export function DashboardShell({ userName, children }: DashboardShellProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Topbar */}
      <header className="sticky top-0 z-50 border-b border-[#2a2e3d] bg-[#1a1d27]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
          <span className="text-xl font-bold bg-gradient-to-r from-[#6c63ff] to-[#3ecf8e] bg-clip-text text-transparent font-serif">
            QR Shift
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#8b8fa3]">{userName}</span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-sm bg-[#1a1d27] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] hover:bg-[#222633] transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
