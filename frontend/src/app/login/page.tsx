"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // OAuth2PasswordRequestForm requires application/x-www-form-urlencoded.
      // URLSearchParams is serialized correctly by axios automatically.
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);

      const res = await api.post("/v1/auth/login", params);

      if (res.data.access_token) {
        localStorage.setItem("vulnix_auth_token", res.data.access_token);
        router.push("/dashboard");
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === "string" ? detail : (typeof detail === "object" ? JSON.stringify(detail) : "Failed to authenticate"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest animate-fade-in">
      <div className="w-full max-w-md p-8 bg-surface-container-high rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full"></div>
        <h2 className="text-3xl font-black mb-2 tracking-tight">Access Terminal.</h2>
        <p className="text-on-surface-variant text-sm mb-8">Authenticate into the Vulnix SaaS application.</p>
        
        {errorMsg && (
          <div className="mb-4 bg-error/10 border border-error/20 rounded p-3 text-error text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div>
            <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-2">Email Identity</label>
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
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : "Synthesize Connection"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-on-surface-variant">
          Not initialized? <button onClick={() => router.push('/register')} className="text-primary hover:underline">Provision Engine</button>
        </p>
      </div>
    </div>
  );
}
