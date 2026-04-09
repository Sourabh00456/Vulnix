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

  useEffect(() => {
    if (!params.id) return;

    let ws: WebSocket;

    fetch(`http://localhost:8000/v1/scans/${params.id}/report`)
      .then(res => res.json())
      .then(data => {
         if (data.scan?.status === "completed") {
           setStatus("completed");
           setReport(data);
         } else {
           connectWs();
         }
      })
      .catch(console.error);

    function connectWs() {
      ws = new WebSocket(`ws://localhost:8000/v1/scans/${params.id}/ws`);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.log) {
          const time = new Date().toLocaleTimeString('en-US', { hour12: false });
          setLogs(prev => [...prev, { time, msg: data.log }]);
        } else if (data.status === "completed") {
          setStatus("completed");
          if(ws) ws.close();
          fetch(`http://localhost:8000/v1/scans/${params.id}/report`)
            .then(res => res.json())
            .then(setReport);
        }
      };
    }

    return () => {
      if(ws) ws.close();
    };
  }, [params.id]);

  const threatScore = report?.scan?.threat_score || 0;
  const vulnerabilities = report?.vulnerabilities || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Risk Score & Logs */}
        <div className="lg:col-span-5 space-y-8">
          <ThreatScore score={threatScore} status={status} />
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
