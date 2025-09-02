// src/api.ts
const API = import.meta.env.VITE_API_URL || "";

export async function api(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("token"); // guarda tu token aquí tras login
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}
