"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/axios";
import ThreatScore from "@/components/ThreatScore";
import LogsPanel from "@/components/LogsPanel";
import VulnerabilityCard from "@/components/VulnerabilityCard";

function DashboardContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [liveLogs, setLiveLogs] = useState<{ time: string; msg: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Initializing");
  const [status, setStatus] = useState("queued");

  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Safe fetch using axios (includes auth token + base URL fix) ──
  const fetchScanData = async (): Promise<boolean> => {
    try {
      const res = await api.get(`/v1/scans/${id}`);
      const data = res.data;
      setScan(data);
      setStatus(data?.status ?? "queued");
      setProgress(data?.progress ?? 0);
      setCurrentStep(data?.current_step ?? "queued");
      if (Array.isArray(data?.logs)) setLiveLogs(data.logs);
      setLoading(false);
      return data?.status === "completed" || data?.status === "failed";
    } catch (err: any) {
      setLoading(false);
      if (err.response?.status === 401) {
        toast.error("Session expired.");
        router.push("/login");
      } else if (err.response?.status === 404) {
        setError("Scan not found. It may have been deleted.");
      } else {
        setError("Unable to load scan data. Backend may be unavailable.");
      }
      return false;
    }
  };

  // ── WebSocket with safe fallback to polling ──
  useEffect(() => {
    if (!id) return;

    let usePoll = false;

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(async () => {
        const done = await fetchScanData();
        if (done && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 2500);
    };

    const connectWebSocket = () => {
      if (typeof window === "undefined") return;

      try {
        // Derive ws URL safely from NEXT_PUBLIC_WS_URL or API URL
        const rawWs =
          process.env.NEXT_PUBLIC_WS_URL ||
          (process.env.NEXT_PUBLIC_API_URL || "ws://localhost:8000")
            .replace(/^https:\/\//, "wss://")
            .replace(/^http:\/\//, "ws://");

        // Strip path suffix from env var
        let wsOrigin = rawWs;
        try {
          const u = new URL(rawWs);
          wsOrigin = `${u.protocol}//${u.host}`;
        } catch {}

        const ws = new WebSocket(`${wsOrigin}/v1/scans/${id}/ws`);
        wsRef.current = ws;

        const timeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            toast("Live feed unavailable — switching to polling.", { icon: "📡" });
            startPolling();
          }
        }, 5000);

        ws.onopen = () => clearTimeout(timeout);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.progress !== undefined) setProgress(data.progress);
            if (data.step) setCurrentStep(data.step);

            if (data.type === "log" || data.type === "error") {
              const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false });
              setLiveLogs((prev) => [...prev, { time: timeStr, msg: data.log ?? "" }]);
              if (data.type === "error" && data.log === "CRITICAL PIPELINE ERROR") {
                setStatus("failed");
                ws.close();
              }
            } else if (data.type === "completed") {
              setStatus("completed");
              setProgress(100);
              setCurrentStep("Completed");
              ws.close();
              fetchScanData(); // refresh final structured data
            }
          } catch {
            // Malformed message — ignore
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          startPolling();
        };

        ws.onclose = () => {
          clearTimeout(timeout);
          if (status !== "completed" && status !== "failed" && !usePoll) {
            startPolling();
          }
        };
      } catch {
        startPolling();
      }
    };

    fetchScanData().then((done) => {
      if (!done) connectWebSocket();
    });

    return () => {
      wsRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Error state ──
  if (error) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] gap-6 p-6">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <h2 className="text-xl font-bold">Scan Unavailable</h2>
        <p className="text-on-surface-variant text-sm text-center max-w-md">{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold hover:bg-primary-container transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <p className="text-on-surface-variant font-mono flex items-center gap-3">
          <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse" />
          Connecting to Remote Telemetry...
        </p>
      </div>
    );
  }

  const threatScore = scan?.threat_score ?? 0;
  const vulnerabilities: any[] = scan?.vulnerabilities ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left: Score + Logs */}
        <div className="lg:col-span-5 space-y-8">
          <ThreatScore score={threatScore} status={status} progress={progress} step={currentStep} />
          <LogsPanel logs={liveLogs} status={status} />
        </div>

        {/* Right: Vulnerabilities */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-end justify-between px-2">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Vulnerability Report</h3>
              <p className="text-on-surface-variant text-sm">
                {status === "running" || status === "queued"
                  ? "Scan in progress — results will appear here"
                  : `${vulnerabilities.filter((v) => v.severity?.toUpperCase() === "CRITICAL").length} Critical · ${vulnerabilities.length} Total`}
              </p>
            </div>
          </div>

          {status === "running" || status === "queued" ? (
            <div className="bg-surface-container-high rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
              <span className="flex h-12 w-12 rounded-full border-t-2 border-primary animate-spin mb-4" />
              <p className="text-on-surface-variant font-mono animate-pulse">
                Running {currentStep} Sequence...
              </p>
            </div>
          ) : vulnerabilities.length === 0 ? (
            <div className="bg-surface-container-high rounded-2xl p-12 flex flex-col items-center text-center gap-4">
              <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
              <p className="font-bold">No vulnerabilities detected</p>
              <p className="text-on-surface-variant text-sm">The scan completed without finding issues.</p>
            </div>
          ) : (
            vulnerabilities.map((v: any, i: number) => (
              <VulnerabilityCard key={i} vuln={v} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
          <p className="text-on-surface-variant font-mono flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse" />
            Loading Scan Data...
          </p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
