"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ThreatScore from "@/components/ThreatScore";
import LogsPanel from "@/components/LogsPanel";
import VulnerabilityCard from "@/components/VulnerabilityCard";

export default function Dashboard() {
  const params = useParams();
  const [logs, setLogs] = useState<{ time: string; msg: string }[]>([]);
  const [status, setStatus] = useState("scanning");
  const [report, setReport] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("Initializing...");
  const [threatScore, setThreatScore] = useState(0);

  useEffect(() => {
    if (!params.id) return;

    let ws: WebSocket;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${API_URL}/v1/scans/${params.id}/report`)
      .then(res => res.json())
      .then(data => {
         if (data.scan?.status === "completed") {
           setStatus("completed");
           setReport(data);
           setThreatScore(data.scan?.threat_score || 0);
         } else {
           connectWs();
         }
      })
      .catch(console.error);

    function connectWs() {
      const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
      ws = new WebSocket(`${WS_URL}/v1/scans/${params.id}/ws`);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "progress") {
          if (typeof data.progress === 'number') setProgress(data.progress);
          if (data.step) setStep(data.step);
        } else if (data.type === "log" || data.log) {
          const time = new Date().toLocaleTimeString('en-US', { hour12: false });
          setLogs(prev => [...prev, { time, msg: data.log || data.message }]);
        } else if (data.type === "completed" || data.status === "completed") {
          setStatus("completed");
          if(ws) ws.close();
          fetch(`${API_URL}/v1/scans/${params.id}/report`)
            .then(res => res.json())
            .then(reportData => {
              setReport(reportData);
              setThreatScore(reportData.scan?.threat_score || 0);
            });
        } else if (data.type === "error") {
          setStatus("failed");
        }
      };
    }

    return () => {
      if(ws) ws.close();
    };
  }, [params.id]);

  const vulnerabilities = report?.vulnerabilities || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Risk Score & Logs */}
        <div className="lg:col-span-5 space-y-8">
          <ThreatScore score={threatScore} status={status} progress={progress} step={step} />
          <LogsPanel logs={logs} status={status} />
        </div>

        {/* Right Column: Vulnerability Cards */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-end justify-between px-2">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Vulnerability Report</h3>
              <p className="text-on-surface-variant text-sm">
                {status === "scanning" 
                  ? "Scanning in progress..." 
                  : `${vulnerabilities.filter((v: any) => v.severity.toLowerCase() === 'critical').length} Critical Findings / ${vulnerabilities.length} Total`}
              </p>
            </div>
          </div>

          {status === "scanning" ? (
             <div className="bg-surface-container-high rounded-2xl p-6 group flex items-center justify-center min-h-[300px]">
                <p className="text-on-surface-variant mono animate-pulse">Analyzing application security profile...</p>
             </div>
          ) : vulnerabilities.map((v: any, index: number) => (
             <VulnerabilityCard key={index} vuln={v} />
          ))}
        </div>
        
      </div>
    </div>
  );
}
