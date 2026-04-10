"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const isAppRoute = (p: string) =>
  p.startsWith("/dashboard") || p.startsWith("/analytics");

export default function Header() {
  const pathname = usePathname();
  const appMode = isAppRoute(pathname);

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-6 py-3">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-primary font-black text-sm">VX</span>
        </div>
        <span className="font-black text-base tracking-tight text-white group-hover:text-primary transition-colors">Vulnix</span>
      </Link>

      {/* Public nav (landing page only) */}
      {!appMode && (
        <nav className="hidden md:flex items-center gap-1">
          {[
            { href: "/#features",  label: "Features" },
            { href: "/#pricing",   label: "Pricing" },
            { href: "/analytics",  label: "Analytics" },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-lg text-sm text-on-surface-variant hover:text-white hover:bg-surface-container-high transition-all"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {appMode ? (
          <>
            <Link href="/dashboard" className="text-on-surface-variant hover:text-white transition-colors">
              <span className="material-symbols-outlined text-xl">dashboard</span>
            </Link>
            <Link href="/analytics" className="text-on-surface-variant hover:text-white transition-colors">
              <span className="material-symbols-outlined text-xl">bar_chart</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm text-on-surface-variant hover:text-white transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-primary text-on-primary text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary-container transition-all shadow-md shadow-primary/20"
            >
              Get Started Free
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
