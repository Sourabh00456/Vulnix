"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await api.post("/v1/auth/register", {
        email: email,
        password: password
      });

      if (res.data.access_token) {
        localStorage.setItem("vulnix_auth_token", res.data.access_token);
        router.push("/dashboard");
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === "string" ? detail : (typeof detail === "object" ? JSON.stringify(detail) : "Failed to register"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest animate-fade-in relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="w-full max-w-md p-8 bg-surface-container-high rounded-2xl shadow-2xl relative z-10">
        <h2 className="text-3xl font-black mb-2 tracking-tight">Provision Identity.</h2>
        <p className="text-on-surface-variant text-sm mb-8">Establish your core node on the platform.</p>
        
        {errorMsg && (
          <div className="mb-4 bg-error/10 border border-error/20 rounded p-3 text-error text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-2">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-surface-container-lowest border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-2">Access Code</label>
            <input 
              type="password" 
              required
              className="w-full bg-surface-container-lowest border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-2">Verify Code</label>
            <input 
              type="password" 
              required
              className="w-full bg-surface-container-lowest border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
          >
            {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : "Initialize Account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-on-surface-variant">
          Already synced? <button onClick={() => router.push('/login')} className="text-primary hover:underline">Access Terminal</button>
        </p>
      </div>
    </div>
  );
}
