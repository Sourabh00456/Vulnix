"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import api from "@/lib/axios";

// -- Demo scan data shown to unauthenticated visitors --
const DEMO_VULNERABILITIES = [
  { type: "OPEN_PORT",        severity: "CRITICAL", source: "NMAP", endpoint: ":21",  description: "FTP service exposed. Allows unauthenticated file transfer." },
  { type: "WEB_VULNERABILITY", severity: "HIGH",    source: "ZAP",  endpoint: "/api/login", description: "SQL Injection detected in login endpoint." },
  { type: "WEB_VULNERABILITY", severity: "HIGH",    source: "ZAP",  endpoint: "/admin",     description: "Admin panel accessible without authentication." },
  { type: "OPEN_PORT",        severity: "MEDIUM",   source: "NMAP", endpoint: ":8080", description: "Development HTTP server exposed to public internet." },
  { type: "WEB_VULNERABILITY", severity: "LOW",     source: "ZAP",  endpoint: "/",    description: "Missing X-Content-Type-Options security header." },
];

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
  HIGH:     "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEDIUM:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW:      "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const FEATURES = [
  { icon: "radar",        title: "AI-Powered Scanning",      desc: "Gemini LLM analyzes open ports, ZAP findings, and generates human-readable exploit explanations with fix recommendations." },
  { icon: "bolt",         title: "Real-Time Progress Logs",  desc: "WebSocket-powered live feed shows exactly what the scanner is doing at each phase — DNS, Nmap, ZAP spider, AI analysis." },
  { icon: "schedule",     title: "Scheduled Monitoring",     desc: "Set daily or weekly automated scans. Vulnix monitors your attack surface around the clock without manual intervention." },
  { icon: "shield_person", title: "SSRF & Input Protection", desc: "Built-in guards reject localhost, private IPs, and malformed URLs before a single packet is sent." },
  { icon: "bar_chart",    title: "Analytics Dashboard",      desc: "30-day vulnerability trend, severity breakdown, and top exposed endpoints visualized with Recharts." },
  { icon: "credit_card",  title: "Stripe-Backed Billing",    desc: "Free tier (3 scans/day) and Pro (unlimited). Stripe Checkout handles upgrades with automatic plan management via webhooks." },
];

function DemoTerminal() {
  const [lines, setLines] = useState<string[]>([]);
  const [visibleVulns, setVisibleVulns] = useState<typeof DEMO_VULNERABILITIES>([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = [
      "▶ Initializing DEEP scan on demo.vulnix.io...",
      "⟳ Resolving DNS... 104.21.57.72",
      "✓ SSRF check passed — public IP confirmed",
      "⟳ Running Nmap port scan (-sV -F)...",
      "✓ Port 21/tcp  open  ftp  vsftpd 3.0.3",
      "✓ Port 80/tcp  open  http nginx 1.18",
      "✓ Port 8080/tcp open  http-proxy",
      "⟳ Starting OWASP ZAP spider...",
      "✓ Spider: 47 endpoints discovered",
      "✓ ZAP: 3 high-risk alerts detected",
      "⟳ Invoking Gemini AI analysis engine...",
      "✓ 5 vulnerabilities classified and explained",
      "■ Scan complete. Threat Score: 42/100",
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < log.length) {
        setLines(prev => [...prev, log[i]]);
        setProgress(Math.round(((i + 1) / log.length) * 100));
        // Reveal vulns progressively in the last third
        if (i >= 9) {
          const vIdx = i - 9;
          if (vIdx < DEMO_VULNERABILITIES.length) {
            setVisibleVulns(prev => [...prev, DEMO_VULNERABILITIES[vIdx]]);
          }
        }
        i++;
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
      } else {
        setDone(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-primary/10">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-container border-b border-white/5">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs text-on-surface-variant font-mono">vulnix — demo.vulnix.io — deep scan</span>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 bg-surface-container-high">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      {/* Log output */}
      <div ref={ref} className="bg-surface-container-lowest p-4 h-44 overflow-y-auto font-mono text-xs space-y-1">
        {lines.map((l, i) => (
          <p key={i} className={l.startsWith("✓") ? "text-green-400" : l.startsWith("■") ? "text-primary font-bold" : "text-on-surface-variant"}>
            {l}
          </p>
        ))}
        {!done && <span className="inline-block w-2 h-3 bg-primary/70 animate-pulse ml-1" />}
      </div>
      {/* Vuln results */}
      {visibleVulns.length > 0 && (
        <div className="bg-surface-container border-t border-white/5 p-4 space-y-2">
          {visibleVulns.map((v, i) => (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs animate-fade-in ${SEVERITY_COLOR[v.severity]}`}>
              <span className="font-bold w-16 shrink-0">{v.severity}</span>
              <span className="font-mono">{v.endpoint}</span>
              <span className="text-on-surface-variant truncate">{v.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [scanType, setScanType] = useState<"quick" | "deep">("quick");
  const [loading, setLoading] = useState(false);

  const startScan = async () => {
    if (!url) { toast.error("Enter a target URL first."); return; }
    setLoading(true);
    try {
      const res = await api.post("/v1/scans", { target_url: url, scan_type: scanType, schedule_type: "none" });
      toast.success(`${scanType === "quick" ? "⚡ Quick" : "🔬 Deep"} scan initiated!`);
      router.push(`/dashboard/scans/${res.data.id}`);
    } catch (e: any) {
      if (e.response?.status === 401) {
        toast.error("Please sign in to run a scan.");
        router.push("/login");
      } else if (e.response?.status === 429) {
        toast.error("Free tier limit reached. Upgrade to Pro.");
        router.push("/pricing");
      } else if (e.response?.status === 400) {
        toast.error(e.response?.data?.detail || "Invalid URL.");
      } else {
        toast.error("Scan failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">

      {/* ────────── HERO ────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-32 text-center overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-primary/5 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-mono px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Now in public beta — free tier available
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
            Find vulnerabilities{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-tertiary">
              before attackers do.
            </span>
          </h1>

          <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Vulnix combines Nmap, OWASP ZAP, and Gemini AI to continuously
            monitor your attack surface. Get actionable fixes, not just alerts.
          </p>

          {/* Scan bar */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="flex-1 flex items-center bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">language</span>
              <input
                type="text"
                placeholder="https://your-app.com"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-on-surface-variant/50 focus:outline-none"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && startScan()}
              />
            </div>
            <button
              onClick={startScan}
              disabled={loading}
              className="bg-primary hover:bg-primary-container text-on-primary px-8 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 justify-center shadow-lg shadow-primary/30"
            >
              {loading
                ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span className="material-symbols-outlined text-sm">rocket_launch</span> Scan Now</>}
            </button>
          </div>

          {/* Scan type pills */}
          <div className="flex justify-center gap-3">
            {(["quick", "deep"] as const).map(t => (
              <button
                key={t}
                onClick={() => setScanType(t)}
                className={`px-5 py-2 rounded-full text-xs font-bold mono transition-all ${
                  scanType === t ? "bg-primary text-on-primary shadow-md shadow-primary/30" : "bg-surface-container-high text-on-surface-variant hover:text-white"
                }`}
              >
                {t === "quick" ? "⚡ Quick Scan" : "🔬 Deep Scan"}
              </button>
            ))}
          </div>

          <p className="text-xs text-on-surface-variant">
            Free tier · 3 scans/day · No credit card required ·{" "}
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </section>

      {/* ────────── DEMO TERMINAL ────────── */}
      <section className="py-24 px-6 bg-surface-container-lowest/50">
        <div className="max-w-5xl mx-auto space-y-12 text-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">See it in action.</h2>
            <p className="text-on-surface-variant mt-3">Live demo scan running against our test environment right now.</p>
          </div>
          <DemoTerminal />
        </div>
      </section>

      {/* ────────── FEATURES ────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Everything you need to stay secure.</h2>
            <p className="text-on-surface-variant mt-3 max-w-xl mx-auto">
              A complete security monitoring stack — not just a port scanner.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-surface-container-high rounded-2xl p-6 card-hover border border-white/5 group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                </div>
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── PRICING ────────── */}
      <section id="pricing" className="py-24 px-6 bg-surface-container-lowest/50">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Simple, honest pricing.</h2>
            <p className="text-on-surface-variant mt-3">Start free. Upgrade when you're ready.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Free */}
            <div className="bg-surface-container-high rounded-2xl p-8 border border-white/5 space-y-6">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-on-surface-variant mb-2">Free</p>
                <p className="text-5xl font-black">$0<span className="text-xl text-on-surface-variant font-normal">/mo</span></p>
              </div>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                {["3 scans per day", "Quick scan mode", "AI vulnerability explanations", "Real-time logs", "Dashboard & analytics"].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full py-3 text-center rounded-xl border border-primary/40 text-primary font-bold text-sm hover:bg-primary/10 transition-colors">
                Get Started Free
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-primary/10 rounded-2xl p-8 border border-primary/30 space-y-6 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/20 blur-[50px] rounded-full" />
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-primary mb-2">Pro</p>
                <p className="text-5xl font-black">$29<span className="text-xl text-on-surface-variant font-normal">/mo</span></p>
              </div>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                {["Unlimited scans", "Deep scan with full ZAP pipeline", "Daily & weekly scheduled scans", "Organization & team sharing", "Priority support", "Everything in Free"].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
              <UpgradeButton />
            </div>
          </div>
        </div>
      </section>

      {/* ────────── FINAL CTA ────────── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-5 pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            Your attack surface is being mapped right now.
          </h2>
          <p className="text-on-surface-variant text-lg">
            Start your free scan in 30 seconds. No credit card, no setup.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-10 py-4 rounded-2xl font-bold text-base transition-all shadow-xl shadow-primary/30"
          >
            <span className="material-symbols-outlined">shield_person</span>
            Start Scanning Free
          </Link>
        </div>
      </section>
    </div>
  );
}

// Separate client button for Stripe checkout
function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await api.get("/v1/billing/checkout");
      window.location.href = res.data.checkout_url;
    } catch (e: any) {
      if (e.response?.status === 401) {
        toast.error("Sign in first to upgrade.");
        router.push("/login");
      } else {
        toast.error("Billing unavailable. Try again shortly.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
    >
      {loading
        ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : <><span className="material-symbols-outlined text-base">credit_card</span> Upgrade to Pro</>}
    </button>
  );
}
