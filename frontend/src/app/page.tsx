"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/axios";

export default function Home() {
  const [url, setUrl] = useState("");
  const [scanType, setScanType] = useState<"quick" | "deep">("quick");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const startScan = async () => {
    if (!url) return;
    setLoading(true);
    
    try {
      const res = await api.post("/v1/scans", {
        target_url: url,
        scan_type: scanType,
        schedule_type: "none"
      });
      
      const data = res.data;
      toast.success(`${scanType === "quick" ? "Quick" : "Deep"} scan initiated.`);
      if (data.id) {
        router.push(`/dashboard/scans/${data.id}`);
      }
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      if (e.response?.status === 429) {
        toast.error("Free Tier limit reached (3 scans/day). Upgrade to Pro.");
      } else if (e.response?.status === 401) {
        toast.error("Authentication required.");
        router.push("/login");
      } else if (e.response?.status === 400) {
        toast.error(detail || "Invalid target URL. Must start with http:// or https://");
      } else {
        toast.error(detail || "Scan initiation failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto min-h-[70vh] flex flex-col justify-center animate-fade-in relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="text-center space-y-6 mb-16 relative z-10">
        <h1 className="text-6xl md:text-7xl font-black tracking-tighter">
          Intelligence for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container">Cloud Native</span> Era.
        </h1>
        <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Autonomous attack surface management powered by LLM agents. Enter a target to map vulnerabilities before they are exploited.
        </p>
      </div>

      <div className="bg-surface-container/50 backdrop-blur-xl border border-white/5 p-2 rounded-2xl flex items-center shadow-2xl relative z-10">
        <span className="material-symbols-outlined text-on-surface-variant pl-4">language</span>
        <input 
          type="text" 
          placeholder="https://target-application.internal" 
          className="flex-1 bg-transparent border-none text-lg px-4 focus:ring-0 text-white placeholder:text-on-surface-variant/50"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && startScan()}
        />
        <button 
          onClick={startScan}
          disabled={loading}
          className="bg-primary hover:bg-primary-container text-on-primary px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
             <span className="flex h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
          ) : (
             <>
               <span className="material-symbols-outlined text-sm">rocket_launch</span>
               Deploy Scanner
             </>
          )}
        </button>
      </div>
      
      {/* Scan Type Selector */}
      <div className="flex justify-center gap-3 mt-4 relative z-10">
        <button
          onClick={() => setScanType("quick")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            scanType === "quick"
              ? "bg-primary text-on-primary shadow-lg shadow-primary/30"
              : "bg-surface-container-high text-on-surface-variant hover:text-white"
          }`}
        >
          ⚡ Quick Scan
        </button>
        <button
          onClick={() => setScanType("deep")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            scanType === "deep"
              ? "bg-primary text-on-primary shadow-lg shadow-primary/30"
              : "bg-surface-container-high text-on-surface-variant hover:text-white"
          }`}
        >
          🔬 Deep Scan
        </button>
      </div>
      
      <div className="w-full flex justify-center mt-20 gap-8 opacity-40 grayscale pointer-events-none hidden md:flex">
         <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Google_Cloud_logo.svg" className="h-8" alt="GCP" />
         <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" className="h-8" alt="AWS" />
         <img src="https://upload.wikimedia.org/wikipedia/commons/a/a8/Microsoft_Azure_Logo.svg" className="h-8" alt="Azure" />
      </div>
    </div>
  );
}
