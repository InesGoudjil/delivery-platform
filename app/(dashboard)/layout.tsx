import Link from "next/link";
import { Film, Settings, ExternalLink, LogOut, User } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-bg2 border-b md:border-b-0 md:border-r border-line p-6 flex flex-col justify-between shrink-0">
        <div>
          <Link href="/dashboard" className="font-display text-2xl font-black text-ink block mb-8">
            CUT<span className="text-orange">.</span>
            <span className="text-[10px] uppercase tracking-widest text-faint ml-2 border border-line px-2 py-0.5 rounded-full font-mono font-normal">Backend</span>
          </Link>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-bg3 text-orange border border-line"
            >
              <Film className="w-4 h-4" /> Projects
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-dim hover:text-ink hover:bg-bg3/50 transition"
            >
              <Settings className="w-4 h-4" /> Customize Brand
            </Link>
            <Link
              href="/p/pedro"
              target="_blank"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-dim hover:text-ink hover:bg-bg3/50 transition"
            >
              <ExternalLink className="w-4 h-4 text-orange" /> Public Portfolio
            </Link>
          </nav>
        </div>

        <div className="border-t border-line pt-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange/20 border border-orange/40 text-orange flex items-center justify-center text-xs font-bold">
                PC
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-ink">Pedro Concreato</p>
                <p className="text-[10px] text-faint">Studio Tier (AED)</p>
              </div>
            </div>
            <Link href="/" className="text-faint hover:text-ink transition" title="Log out">
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
