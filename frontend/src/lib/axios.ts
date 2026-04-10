import axios from 'axios';

// Strip any accidental path suffix (e.g. .../health) from the env var
// so NEXT_PUBLIC_API_URL=https://host.railway.app/health still works
function resolveBaseURL(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const url = new URL(raw);
    // Keep only origin (scheme + host + port), drop any path
    return url.origin;
  } catch {
    return raw;
  }
}

const api = axios.create({
  baseURL: resolveBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("breachme_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
