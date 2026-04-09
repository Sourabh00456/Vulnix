import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex-col pt-20 bg-neutral-950/70 backdrop-blur-2xl border-r border-white/5 z-40 hidden lg:flex">
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
          <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center text-white font-black">FS</div>
          <div>
            <p className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-orange-500 leading-none">Core Security</p>
            <p className="text-xs text-neutral-400">Elite Intelligence</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        <Link className="flex items-center gap-3 px-4 py-3 text-orange-500 border-r-2 border-orange-600 bg-orange-600/5 font-['JetBrains_Mono'] text-xs uppercase tracking-widest group" href="/">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
          <span>Dashboard</span>
        </Link>
        <Link className="flex items-center gap-3 px-4 py-3 text-neutral-500 hover:bg-white/5 hover:text-neutral-200 transition-all font-['JetBrains_Mono'] text-xs uppercase tracking-widest group" href="#">
          <span className="material-symbols-outlined">history</span>
          <span>History</span>
        </Link>
        <Link className="flex items-center gap-3 px-4 py-3 text-neutral-500 hover:bg-white/5 hover:text-neutral-200 transition-all font-['JetBrains_Mono'] text-xs uppercase tracking-widest group" href="#">
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </Link>
      </nav>
      <div className="p-6">
        <button className="w-full py-4 hero-gradient text-white font-['JetBrains_Mono'] text-xs uppercase tracking-widest rounded-lg shadow-lg active:scale-95 duration-150">
          Run Scan
        </button>
      </div>
    </aside>
  )
}
