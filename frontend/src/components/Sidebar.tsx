"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/",          icon: "radar",             label: "Scanner" },
  { href: "/dashboard", icon: "dashboard",          label: "Dashboard" },
  { href: "/analytics", icon: "bar_chart_4_bars",   label: "Analytics" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex-col pt-20 bg-surface-container-lowest/80 backdrop-blur-2xl border-r border-white/5 z-40 hidden lg:flex">
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-black text-sm">VX</div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary leading-none">Vulnix</p>
            <p className="text-xs text-on-surface-variant">Security Platform</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs uppercase tracking-widest transition-all ${
                active
                  ? "text-primary border border-primary/20 bg-primary/10"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <span
                className="material-symbols-outlined text-base"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-6">
        <Link
          href="/login"
          className="w-full py-3 flex items-center justify-center gap-2 bg-surface-container-high text-on-surface-variant hover:text-on-surface font-mono text-xs uppercase tracking-widest rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Sign Out
        </Link>
      </div>
    </aside>
  );
}
