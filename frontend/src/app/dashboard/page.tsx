"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function DashboardOverview() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsRes, recentRes] = await Promise.all([
          api.get("/v1/dashboard/stats"),
          api.get("/v1/dashboard/recent")
        ]);
        setStats(statsRes.data);
        setRecent(recentRes.data);
      } catch (e: any) {
        if (e.response?.status === 401) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <span className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></span>
      </div>
    );
  }

  // Format Recharts data
  const pieData = stats ? [
    { name: "CRITICAL", value: stats.severities.CRITICAL || 0, color: "#FF3366" },
    { name: "HIGH", value: stats.severities.HIGH || 0, color: "#FF6633" },
    { name: "MEDIUM", value: stats.severities.MEDIUM || 0, color: "#FFCC00" },
    { name: "LOW", value: stats.severities.LOW || 0, color: "#33CCFF" },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fade-in p-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight">Command Center.</h2>
          <p className="text-on-surface-variant text-sm mt-2">Aggregate view of organization threat analytics.</p>
        </div>
        <button 
          onClick={() => router.push("/")}
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-container transition-colors"
        >
          <span className="material-symbols-outlined text-sm">rocket_launch</span>
          New Scan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-high rounded-2xl p-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full"></div>
           <p className="text-on-surface-variant uppercase text-xs font-bold tracking-widest mb-4">Total Executions</p>
           <p className="text-6xl font-black">{stats?.total_scans || 0}</p>
        </div>
        <div className="md:col-span-2 bg-surface-container-high rounded-2xl p-8 flex flex-col justify-center">
           <p className="text-on-surface-variant uppercase text-xs font-bold tracking-widest mb-4">Severity Distribution</p>
           {pieData.length > 0 ? (
             <div className="h-48 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={pieData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {pieData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#1C1C1E', borderColor: '#333', borderRadius: '12px' }}
                      itemStyle={{ color: '#FFF' }}
                   />
                   <Legend verticalAlign="middle" align="right" layout="vertical" />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           ) : (
             <div className="h-full flex items-center justify-center text-on-surface-variant italic text-sm">
                No vulnerabilities logged yet.
             </div>
           )}
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold tracking-tight mb-6">Recent Activity Engine</h3>
        <div className="bg-surface-container border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-highest/50 text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="p-4">Target Application</th>
                <th className="p-4">Status</th>
                <th className="p-4">Composite Score</th>
                <th className="p-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recent.map(scan => (
                <tr 
                  key={scan.id} 
                  onClick={() => router.push(`/dashboard/scans/${scan.id}`)}
                  className="hover:bg-surface-container-highest/30 cursor-pointer transition-colors"
                >
                  <td className="p-4 font-mono text-sm">{scan.target_url}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      scan.status === 'completed' ? 'bg-primary/20 text-primary' : 
                      scan.status === 'failed' ? 'bg-error/20 text-error' : 
                      'bg-secondary/20 text-secondary'
                    }`}>
                      {scan.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 font-bold">{scan.threat_score || '--'}</td>
                  <td className="p-4 text-right text-xs text-on-surface-variant">
                    {scan.created_at ? new Date(scan.created_at).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                   <td colSpan={4} className="p-8 text-center text-on-surface-variant text-sm">
                      No scan history found. Deploy a scanner to begin.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
