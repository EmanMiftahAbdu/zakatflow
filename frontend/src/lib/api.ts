const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface ZakatRequest {
  cash?: number;
  gold_value?: number;
  silver_value?: number;
  investments?: number;
  business_assets?: number;
  debts?: number;
}

export interface ZakatResponse {
  total_assets: number;
  net_zakatable: number;
  nisab_threshold: number;
  zakat_due: number;
  is_above_nisab: boolean;
}

export function calculateZakat(data: ZakatRequest): Promise<ZakatResponse> {
  return apiFetch<ZakatResponse>("/api/zakat/calculate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
