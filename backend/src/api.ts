// src/api.ts
const REPLIT_DOMAIN = process.env.REPLIT_DEV_DOMAIN;
const API = REPLIT_DOMAIN ? `https://${REPLIT_DOMAIN}:3001` : "http://localhost:3001";

export async function api(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("token"); // guarda tu token aquí tras login
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    let errorMessage: string;
    try {
      // Try to parse as JSON first for API errors
      const errorData = await res.json();
      errorMessage = errorData.error || errorData.message || `HTTP ${res.status}`;
    } catch {
      // If JSON parsing fails, get as text (might be HTML error page)
      const text = await res.text();
      errorMessage = text.includes('<!DOCTYPE') 
        ? `HTTP ${res.status}: Server Error` 
        : `HTTP ${res.status}: ${text}`;
    }
    throw new Error(errorMessage);
  }
  return res.status === 204 ? null : res.json();
}
