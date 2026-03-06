"use client";

import { signOut } from "@/lib/actions";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface DashboardShellProps {
  userName: string;
  children: React.ReactNode;
}

const NAV_LINKS = [
  { href: "/dashboard", label: "QR Codes" },
  { href: "/analytics", label: "Analytics" },
  { href: "/rules", label: "Rules" },
];

export function DashboardShell({ userName, children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();

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
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-xl font-bold bg-gradient-to-r from-[#6c63ff] to-[#3ecf8e] bg-clip-text text-transparent font-serif"
            >
              QR Shift
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${
                    pathname === link.href
                      ? "bg-[#6c63ff]/10 text-[#6c63ff] font-medium"
                      : "text-[#8b8fa3] hover:text-[#e8e9ed] hover:bg-[#222633]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#8b8fa3] hidden sm:block">{userName}</span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-sm bg-[#1a1d27] border border-[#2a2e3d] rounded-lg text-[#e8e9ed] hover:bg-[#222633] transition"
            >
              Sign Out
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden flex items-center gap-1 px-6 pb-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-xs rounded-lg transition ${
                pathname === link.href
                  ? "bg-[#6c63ff]/10 text-[#6c63ff] font-medium"
                  : "text-[#8b8fa3] hover:text-[#e8e9ed]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
