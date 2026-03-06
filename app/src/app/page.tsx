import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center px-4 text-center">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#6c63ff]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#3ecf8e]/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl">
        <h1 className="text-5xl sm:text-6xl font-bold font-serif bg-gradient-to-r from-[#6c63ff] to-[#3ecf8e] bg-clip-text text-transparent mb-4">
          QR Shift
        </h1>
        <p className="text-xl text-[#8b8fa3] mb-2">
          Print once, update anytime.
        </p>
        <p className="text-sm text-[#8b8fa3] max-w-md mx-auto mb-8">
          Dynamic QR codes with context-aware routing. Different links for
          different days, times, devices, and locations — from one printed
          code.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="px-6 py-3 bg-[#6c63ff] hover:bg-[#7b73ff] text-white rounded-lg font-medium transition"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 bg-[#1a1d27] border border-[#2a2e3d] hover:border-[#6c63ff] text-[#e8e9ed] rounded-lg font-medium transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
