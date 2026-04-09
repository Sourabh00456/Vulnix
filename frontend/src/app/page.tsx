"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const startScan = async () => {
    if (!url) return;
    setLoading(true);
    setErrorMsg("");
    
    try {
      const res = await fetch("http://localhost:8000/v1/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_url: url }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Free Tier: Daily limit of 3 scans exceeded. Upgrade to Pro.");
        } else if (res.status === 403) {
          throw new Error("Target Verification Failed. Missing TXT Token.");
        } else if (res.status === 401) {
          throw new Error("Authentication required. Please login.");
        }
        throw new Error(data.detail || "Server failed to initiate scan.");
      }

      if (data.id) {
        router.push(`/dashboard?id=${data.id}`);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
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
      
      {errorMsg && (
        <div className="mt-6 mx-auto w-full max-w-2xl bg-error/10 border border-error/20 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-error">warning</span>
          <p className="text-sm font-semibold text-error">{errorMsg}</p>
        </div>
      )}
      
      <div className="w-full flex justify-center mt-20 gap-8 opacity-40 grayscale pointer-events-none hidden md:flex">
         <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Google_Cloud_logo.svg" className="h-8" alt="GCP" />
         <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" className="h-8" alt="AWS" />
         <img src="https://upload.wikimedia.org/wikipedia/commons/a/a8/Microsoft_Azure_Logo.svg" className="h-8" alt="Azure" />
      </div>
    </div>
  );
}
