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
  const id = params?.id as string;

  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [liveLogs, setLiveLogs] = useState<{ time: string; msg: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Initializing");
  const [status, setStatus] = useState("queued");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ------------------------------------------------------------------
  // Safe fetch — all error paths set state gracefully, never throw
  // ------------------------------------------------------------------
  const fetchScanData = async (): Promise<boolean> => {
    if (!id) return false;
    try {
      const res = await api.get(`/v1/scans/${id}`);
      const data = res?.data ?? {};

      setScan(data);
      setStatus(data?.status ?? "queued");
      setProgress(typeof data?.progress === "number" ? data.progress : 0);
      setCurrentStep(data?.current_step ?? "Processing");

      if (Array.isArray(data?.logs) && data.logs.length > 0) {
        setLiveLogs(data.logs);
      }

      setLoading(false);
      const done = data?.status === "completed" || data?.status === "failed";
      return done;
    } catch (err: any) {
      setLoading(false);
      const status = err?.response?.status;
      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        router.push("/login");
      } else if (status === 404) {
        setError("Scan not found. It may have been deleted.");
      } else {
        setError("Unable to load scan. Backend may be unavailable.");
      }
      return false;
    }
  };

  // ------------------------------------------------------------------
  // On mount: initial fetch, then poll every 2.5 s until terminal state
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!id) {
      setError("Invalid scan ID.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      const done = await fetchScanData();
      if (done || cancelled) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        return;
      }
      // Start interval polling only if not already running
      if (!pollRef.current) {
        pollRef.current = setInterval(async () => {
          if (cancelled) {
            if (pollRef.current) clearInterval(pollRef.current);
            return;
          }
          const isDone = await fetchScanData();
          if (isDone && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }, 2500);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Error state ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] gap-6 p-6">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <h2 className="text-xl font-bold">Scan Unavailable</h2>
        <p className="text-on-surface-variant text-sm text-center max-w-md">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold hover:bg-primary-container transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchScanData();
            }}
            className="border border-primary/40 text-primary px-6 py-3 rounded-xl font-bold hover:bg-primary/10 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────
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

  const threatScore = typeof scan?.threat_score === "number" ? scan.threat_score : 0;
  const vulnerabilities: any[] = Array.isArray(scan?.vulnerabilities) ? scan.vulnerabilities : [];

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
                  : `${vulnerabilities.filter((v) => (v?.severity ?? "").toUpperCase() === "CRITICAL").length} Critical · ${vulnerabilities.length} Total`}
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
              <span
                className="material-symbols-outlined text-primary text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
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
