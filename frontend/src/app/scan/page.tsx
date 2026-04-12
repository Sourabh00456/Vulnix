"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/axios";

export default function ScannerPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [scanType, setScanType] = useState<"quick" | "deep">("quick");
  const [loading, setLoading] = useState(false);

  const startScan = async () => {
    if (!url.trim()) {
      toast.error("Enter a target URL first.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/v1/scans", {
        target_url: url.trim(),
        scan_type: scanType,
        schedule_type: "none",
      });
      const scanId = res.data?.id;
      if (!scanId) {
        toast.error("Scan created but no ID returned.");
        return;
      }
      toast.success(`${scanType === "quick" ? "⚡ Quick" : "🔬 Deep"} scan initiated!`);
      router.push(`/dashboard/scans/${scanId}`);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        toast.error("Please sign in to run a scan.");
        router.push("/login");
      } else if (status === 429) {
        toast.error("Free tier limit reached (3 scans/day). Upgrade to Pro.");
      } else if (status === 400) {
        toast.error(e.response?.data?.detail || "Invalid URL. Must start with https://");
      } else {
        toast.error(e.response?.data?.detail || "Scan failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fade-in">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl space-y-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-mono px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Scanner ready — authenticated session
        </div>

        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none mb-3">
            Launch a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-tertiary">
              scan.
            </span>
          </h1>
          <p className="text-on-surface-variant text-base">
            Enter a target URL and Vulnix will run Nmap, OWASP ZAP, and Gemini AI analysis.
          </p>
        </div>

        {/* Scan type pills */}
        <div className="flex justify-center gap-3">
          {(["quick", "deep"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setScanType(t)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                scanType === t
                  ? "bg-primary text-on-primary shadow-md shadow-primary/30"
                  : "bg-surface-container-high text-on-surface-variant hover:text-white"
              }`}
            >
              {t === "quick" ? "⚡ Quick Scan" : "🔬 Deep Scan"}
            </button>
          ))}
        </div>

        {/* URL input + launch */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-4 gap-3">
            <span className="material-symbols-outlined text-on-surface-variant text-lg">language</span>
            <input
              type="url"
              placeholder="https://your-target.com"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-on-surface-variant/50 focus:outline-none"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startScan()}
              disabled={loading}
            />
          </div>
          <button
            onClick={startScan}
            disabled={loading}
            className="bg-primary hover:bg-primary-container text-on-primary px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 justify-center shadow-lg shadow-primary/30 min-w-[140px]"
          >
            {loading ? (
              <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                Scan Now
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-on-surface-variant">
          Free tier · 3 scans/day · Quick scan completes in ~60s
        </p>

        {/* Scan type details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mt-4">
          <div className={`rounded-2xl p-5 border transition-all ${scanType === "quick" ? "border-primary/30 bg-primary/5" : "border-white/5 bg-surface-container-high"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⚡</span>
              <span className="font-bold text-sm">Quick Scan</span>
              <span className="ml-auto text-xs text-on-surface-variant font-mono">~60s</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              DNS resolution, Nmap port scan, and Gemini AI analysis. Best for rapid checks.
            </p>
          </div>
          <div className={`rounded-2xl p-5 border transition-all ${scanType === "deep" ? "border-primary/30 bg-primary/5" : "border-white/5 bg-surface-container-high"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔬</span>
              <span className="font-bold text-sm">Deep Scan</span>
              <span className="ml-auto text-xs text-on-surface-variant font-mono">~5min</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Full OWASP ZAP spider + active scan + Nmap + Gemini AI. Complete vulnerability report.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
