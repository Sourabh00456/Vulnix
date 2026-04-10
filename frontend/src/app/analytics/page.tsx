"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/axios";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ff3366",
  HIGH:     "#ff6633",
  MEDIUM:   "#ffcc00",
  LOW:      "#22d3ee",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "#7c6af7",
  running:   "#22d3ee",
  failed:    "#ff6b6b",
  queued:    "#9b8fa8",
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/v1/analytics")
      .then(res => setData(res.data))
      .catch(e => {
        if (e.response?.status === 401) {
          toast.error("Session expired.");
          router.push("/login");
        } else {
          toast.error("Failed to load analytics.");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-12 p-6 animate-fade-in">
        <div className="skeleton h-10 w-56 mb-2" />
        <div className="skeleton h-4 w-72" />
        <SkeletonStats />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  const severityPie = (data?.severity_breakdown ?? []).map((s: any) => ({
    name: s.severity,
    value: s.count,
    color: SEVERITY_COLORS[s.severity] ?? "#9b8fa8",
  }));

  const statusPie = (data?.status_breakdown ?? []).map((s: any) => ({
    name: s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#9b8fa8",
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-12 p-6 animate-fade-in stagger">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight">Analytics Engine.</h1>
        <p className="text-on-surface-variant text-sm mt-2">
          30-day threat trend and vulnerability intelligence for your organization.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Threat Score", value: data?.avg_threat_score ?? "—", color: "text-primary" },
          { label: "Total Vulns", value: severityPie.reduce((a: number, b: any) => a + b.value, 0) },
          { label: "Critical", value: severityPie.find((s: any) => s.name === "CRITICAL")?.value ?? 0, color: "text-red-400" },
          { label: "Scans (30d)", value: data?.scan_trend?.reduce((a: number, b: any) => a + b.scans, 0) ?? 0 },
        ].map((kpi, i) => (
          <div key={i} className="bg-surface-container-high rounded-2xl p-6 card-hover">
            <p className="text-on-surface-variant text-xs uppercase tracking-widest mb-3">{kpi.label}</p>
            <p className={`text-4xl font-black ${kpi.color ?? "text-on-surface"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* 30-day Scan Trend */}
      <div className="bg-surface-container-high rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-6">Scan Volume — 30 Day Trend</h2>
        {data?.scan_trend?.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.scan_trend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c6af7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7c6af7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#9b8fa8", fontSize: 10 }}
                tickFormatter={v => v.slice(5)} // Show MM-DD only
              />
              <YAxis tick={{ fill: "#9b8fa8", fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1d1d30", borderColor: "#252540", borderRadius: "12px" }}
                itemStyle={{ color: "#e8e6f0" }}
                labelStyle={{ color: "#9b8fa8", fontSize: "11px" }}
              />
              <Area
                type="monotone"
                dataKey="scans"
                stroke="#7c6af7"
                strokeWidth={2}
                fill="url(#scanGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-on-surface-variant text-center py-16 italic text-sm">No scan data yet.</p>
        )}
      </div>

      {/* Two-column charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity Pie */}
        <div className="bg-surface-container-high rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-6">Severity Distribution</h2>
          {severityPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={severityPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {severityPie.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1d1d30", borderColor: "#252540", borderRadius: "12px" }} itemStyle={{ color: "#e8e6f0" }} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: "12px", color: "#9b8fa8" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-on-surface-variant text-center py-16 italic text-sm">No vulnerabilities yet.</p>
          )}
        </div>

        {/* Status Breakdown Bar */}
        <div className="bg-surface-container-high rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-6">Scan Status Breakdown</h2>
          {statusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusPie} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#9b8fa8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#9b8fa8", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1d1d30", borderColor: "#252540", borderRadius: "12px" }} itemStyle={{ color: "#e8e6f0" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusPie.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-on-surface-variant text-center py-16 italic text-sm">No scans yet.</p>
          )}
        </div>
      </div>

      {/* Top Vulnerable Endpoints */}
      <div className="bg-surface-container-high rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-6">Top Vulnerable Endpoints</h2>
        {data?.top_endpoints?.length > 0 ? (
          <div className="space-y-3">
            {data.top_endpoints.map((ep: any, i: number) => {
              const max = data.top_endpoints[0].count;
              const pct = Math.round((ep.count / max) * 100);
              return (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-on-surface-variant text-xs w-4 text-right">{i + 1}</span>
                  <span className="font-mono text-xs text-on-surface truncate w-48">{ep.endpoint || "/"}</span>
                  <div className="flex-1 bg-surface-container rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary progress-bar"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-on-surface-variant w-8 text-right">{ep.count}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-on-surface-variant text-center py-8 italic text-sm">No endpoint data yet.</p>
        )}
      </div>
    </div>
  );
}
