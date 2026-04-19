import { supabase } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

// ── Profile ──────────────────────────────────────────────────────────────────

export function getProfile() {
  return apiFetch<{
    id: string;
    display_name: string | null;
    madhab: string;
    nisab_standard: string;
    hawl_start_date: string | null;
  }>('/api/auth/profile');
}

export function upsertProfile(data: {
  madhab?: string;
  nisab_standard?: string;
  hawl_start_date?: string;
  display_name?: string;
}) {
  return apiFetch('/api/auth/profile', { method: 'POST', body: JSON.stringify(data) });
}

// ── Assets ───────────────────────────────────────────────────────────────────

export function getAssets() {
  return apiFetch<Array<{
    id: string;
    category: string;
    label: string;
    amount: number;
    is_zakatable: boolean;
    metadata: Record<string, any>;
  }>>('/api/assets');
}

export function createAsset(data: {
  category: string;
  label: string;
  amount: number;
  is_zakatable?: boolean;
  metadata?: Record<string, any>;
}) {
  return apiFetch<{ id: string; category: string; label: string; amount: number; is_zakatable: boolean; metadata: Record<string, any> }>(
    '/api/assets',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export function updateAsset(id: string, data: Partial<{ label: string; amount: number; is_zakatable: boolean; metadata: Record<string, any> }>) {
  return apiFetch<{ id: string }>(`/api/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteAsset(id: string) {
  return apiFetch<void>(`/api/assets/${id}`, { method: 'DELETE' });
}

// ── Liabilities ───────────────────────────────────────────────────────────────

export function getLiabilities() {
  return apiFetch<Array<{ id: string; label: string; amount: number; due_within_year: boolean }>>('/api/liabilities');
}

export function createLiability(data: { label: string; amount: number; due_within_year: boolean }) {
  return apiFetch<{ id: string; label: string; amount: number; due_within_year: boolean }>(
    '/api/liabilities',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export function deleteLiability(id: string) {
  return apiFetch<void>(`/api/liabilities/${id}`, { method: 'DELETE' });
}

// ── Zakat ─────────────────────────────────────────────────────────────────────

export function saveCalculation() {
  return apiFetch<{ zakat_due: number; net_zakatable: number }>('/api/zakat/calculate', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// ── Plaid ─────────────────────────────────────────────────────────────────────

export function getPlaidLinkToken() {
  return apiFetch<{ link_token: string }>('/api/plaid/link-token', { method: 'POST', body: JSON.stringify({}) });
}

export function exchangePlaidToken(publicToken: string) {
  return apiFetch('/api/plaid/exchange', { method: 'POST', body: JSON.stringify({ public_token: publicToken }) });
}

export function syncPlaidAssets() {
  return apiFetch<Array<{ id: string; category: string; label: string; amount: number; is_zakatable: boolean; metadata: Record<string, any> }>>(
    '/api/plaid/sync-assets',
    { method: 'POST', body: JSON.stringify({}) }
  );
}

// ── Nisab / Prices ────────────────────────────────────────────────────────────

export function getNisabCurrent() {
  return apiFetch<{ gold_nisab_usd: number; silver_nisab_usd: number; gold_per_gram: number; silver_per_gram: number }>(
    '/api/nisab/current'
  );
}
