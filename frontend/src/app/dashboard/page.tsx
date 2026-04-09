"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ThreatScore from "@/components/ThreatScore";
import LogsPanel from "@/components/LogsPanel";
import VulnerabilityCard from "@/components/VulnerabilityCard";

export default function Dashboard() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Real-time states decoupled from standard scan payload
  const [liveLogs, setLiveLogs] = useState<{ time: string; msg: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Initializing");
  const [status, setStatus] = useState("scanning");
  
  // Polling fallback mechanism tracker
  const [wsFailed, setWsFailed] = useState(false);

  useEffect(() => {
    if (!id) return;

    let ws: WebSocket;
    let pollInterval: NodeJS.Timeout;

    // Fetch initial state first
    const fetchScanData = async () => {
      try {
        const res = await fetch(`http://localhost:8000/v1/scans/${id}`);
        const data = await res.json();
        setScan(data);
        setStatus(data.status);
        setProgress(data.progress || 0);
        setCurrentStep(data.current_step || "scanning");
        setLiveLogs(data.logs || []);
        setLoading(false);
        
        if (data.status === "completed" || data.status === "failed") {
          return true; // execution done
        }
        return false;
      } catch (err) {
        console.error("API error", err);
        return false;
      }
    };

    fetchScanData().then((isComplete) => {
        if (!isComplete && !wsFailed) {
            connectWebSocket();
        }
    });

    const connectWebSocket = () => {
      ws = new WebSocket(`ws://localhost:8000/v1/scans/${id}/ws`);
      
      ws.onopen = () => {
        console.log("WebSocket connected. Subscribed to Redis Events.");
      };

      ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // Sync live progress and step
            if (data.progress !== undefined) setProgress(data.progress);
            if (data.step) setCurrentStep(data.step);
            
            if (data.type === "log" || data.type === "error") {
                const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
                setLiveLogs(prev => [...prev, { time: timeStr, msg: data.log }]);
                if (data.type === "error" && data.log === "CRITICAL PIPELINE ERROR") {
                   setStatus("failed");
                   if(ws) ws.close();
                }
            } 
            else if (data.type === "completed") {
                setStatus("completed");
                setProgress(100);
                setCurrentStep("Completed");
                if (ws) ws.close();
                // Fetch perfectly structured AI Results now that execution is complete
                fetchScanData();
            }
        } catch(e) {
            console.error("WebSocket format error", e)
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket connection failed, falling back to polling.", e);
        setWsFailed(true);
      };

      ws.onclose = () => {
          console.log("WebSocket stream closed.");
      };
    };

    if (wsFailed) {
      // Fallback logical polling
      pollInterval = setInterval(async () => {
        const isComplete = await fetchScanData();
        if (isComplete) {
          clearInterval(pollInterval);
        }
      }, 2000);
    }

    return () => {
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [id, wsFailed]);

  if (loading) {
    return (
       <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
          <p className="text-on-surface-variant mono flex items-center gap-3">
             <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse"></span>
             Connecting to Remote Telemetry...
          </p>
       </div>
    );
  }

  const threatScore = scan?.threat_score || 0;
  const vulnerabilities = scan?.vulnerabilities || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Risk Score & Logs */}
        <div className="lg:col-span-5 space-y-8">
          <ThreatScore score={threatScore} status={status} progress={progress} step={currentStep} />
          <LogsPanel logs={liveLogs} status={status} />
        </div>

        {/* Right Column: Vulnerability Cards */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-end justify-between px-2">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Vulnerability Report</h3>
              <p className="text-on-surface-variant text-sm">
                {status === "scanning" 
                  ? "Scanning in progress..." 
                  : `${vulnerabilities.filter((v: any) => v.severity.toUpperCase() === 'CRITICAL').length} Critical Findings / ${vulnerabilities.length} Total Normalized Vectors`}
              </p>
            </div>
          </div>

          {status === "scanning" ? (
             <div className="bg-surface-container-high rounded-2xl p-6 group flex flex-col items-center justify-center min-h-[300px]">
                <span className="flex h-12 w-12 rounded-full border-t-2 border-primary animate-spin mb-4"></span>
                <p className="text-on-surface-variant mono animate-pulse">Running {currentStep} Sequence...</p>
             </div>
          ) : vulnerabilities.map((v: any, index: number) => (
             <VulnerabilityCard key={index} vuln={v} />
          ))}
        </div>
        
      </div>
    </div>
  );
}
