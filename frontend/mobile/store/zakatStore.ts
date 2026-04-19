import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import {
  Asset,
  Liability,
  Madhab,
  NisabStandard,
  calculateZakat,
  getNisabValues,
  isHawlComplete,
} from '../engine/zakatEngine';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';

interface UserProfile {
  name: string;
  email: string;
  madhab: Madhab;
  nisabStandard: NisabStandard;
  lastZakatPaidDate: string | null;
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
}

// ── Asset ↔ Backend mapping ────────────────────────────────────────────────

function assetToBackend(asset: Asset): Parameters<typeof api.createAsset>[0] {
  switch (asset.type) {
    case 'cash':
      return {
        category: 'cash',
        label: asset.label,
        amount: asset.balance,
        is_zakatable: !asset.isRiba,
        metadata: { isRiba: asset.isRiba, interestEarned: asset.interestEarned },
      };
    case 'gold':
      return {
        category: 'gold',
        label: asset.label,
        amount: asset.weightGrams * asset.karatPurity * asset.pricePerGram,
        is_zakatable: true,
        metadata: { weightGrams: asset.weightGrams, karatPurity: asset.karatPurity, isWorn: asset.isWorn, pricePerGram: asset.pricePerGram },
      };
    case 'stock':
      return {
        category: asset.intention === 'traded' ? 'stocks_trade' : 'stocks_hold',
        label: asset.label,
        amount: asset.marketValue,
        is_zakatable: true,
        metadata: { intention: asset.intention, criRatio: asset.criRatio },
      };
    case 'crypto':
      return {
        category: 'crypto',
        label: asset.label,
        amount: asset.quantity * asset.pricePerUnit,
        is_zakatable: true,
        metadata: { quantity: asset.quantity, pricePerUnit: asset.pricePerUnit },
      };
    case 'retirement':
      return {
        category: 'retirement',
        label: asset.label,
        amount: asset.balance,
        is_zakatable: true,
        metadata: { vestedPercent: asset.vestedPercent, hasRiba: asset.hasRiba, ribaPortion: asset.ribaPortion },
      };
  }
}

function backendToAsset(b: { id: string; category: string; label: string; amount: number; is_zakatable: boolean; metadata: Record<string, any> }): Asset | null {
  const m = b.metadata ?? {};
  switch (b.category) {
    case 'cash':
      return { type: 'cash', id: b.id, label: b.label, balance: b.amount, isRiba: m.isRiba ?? false, interestEarned: m.interestEarned ?? 0 };
    case 'gold':
      return { type: 'gold', id: b.id, label: b.label, weightGrams: m.weightGrams ?? 0, karatPurity: m.karatPurity ?? 1, isWorn: m.isWorn ?? false, pricePerGram: m.pricePerGram ?? 85.2 };
    case 'stocks_trade':
      return { type: 'stock', id: b.id, label: b.label, marketValue: b.amount, intention: 'traded', criRatio: m.criRatio ?? 0.33 };
    case 'stocks_hold':
      return { type: 'stock', id: b.id, label: b.label, marketValue: b.amount, intention: 'longterm', criRatio: m.criRatio ?? 0.33 };
    case 'crypto':
      return { type: 'crypto', id: b.id, label: b.label, quantity: m.quantity ?? 1, pricePerUnit: b.amount / (m.quantity ?? 1) };
    case 'retirement':
      return { type: 'retirement', id: b.id, label: b.label, balance: b.amount, vestedPercent: m.vestedPercent ?? 1, estimatedTaxPenalty: m.estimatedTaxPenalty ?? 0, hasRiba: m.hasRiba ?? false, ribaPortion: m.ribaPortion ?? 0 };
    default:
      return null;
  }
}

// ── Store interface ─────────────────────────────────────────────────────────

interface ZakatStore {
  isLoggedIn: boolean;
  userId: string | null;
  profile: UserProfile;
  assets: Asset[];
  liabilities: Liability[];

  // Auth
  setSession: (session: Session | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  // Profile (local)
  setProfile: (updates: Partial<UserProfile>) => void;
  completeOnboarding: () => void;

  // Profile (remote)
  syncProfile: () => Promise<void>;
  saveProfile: (fields: { madhab?: string; nisab_standard?: string; hawl_start_date?: string; display_name?: string }) => Promise<void>;

  // Assets (local)
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  removeAsset: (id: string) => void;

  // Assets (remote)
  persistAsset: (asset: Asset) => Promise<Asset>;
  deleteAssetRemote: (id: string) => Promise<void>;
  loadAssets: () => Promise<void>;

  // Liabilities (local)
  addLiability: (liability: Liability) => void;
  updateLiability: (id: string, updates: Partial<Liability>) => void;
  removeLiability: (id: string) => void;

  // Liabilities (remote)
  persistLiability: (liability: Liability) => Promise<Liability>;
  deleteLiabilityRemote: (id: string) => Promise<void>;

  // Computed
  getZakatResult: () => ReturnType<typeof calculateZakat>;
}

const defaultProfile: UserProfile = {
  name: '',
  email: '',
  madhab: 'shafii',
  nisabStandard: 'silver',
  lastZakatPaidDate: null,
  onboardingComplete: false,
  notificationsEnabled: false,
};

export const useZakatStore = create<ZakatStore>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      userId: null,
      profile: defaultProfile,
      assets: [],
      liabilities: [],

      // ── Auth ───────────────────────────────────────────────────────────────

      setSession: (session) =>
        set({
          isLoggedIn: !!session,
          userId: session?.user.id ?? null,
          profile: session
            ? { ...get().profile, email: session.user.email ?? '' }
            : defaultProfile,
        }),

      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        get().setSession(data.session);
        try { await get().syncProfile(); } catch {}
        try { await get().loadAssets(); } catch {}
      },

      signUp: async (name, email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } },
        });
        if (error) throw error;
        if (data.session) {
          get().setSession(data.session);
          set((s) => ({ profile: { ...s.profile, name } }));
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ isLoggedIn: false, userId: null, profile: defaultProfile, assets: [], liabilities: [] });
      },

      // ── Profile (local) ────────────────────────────────────────────────────

      setProfile: (updates) =>
        set((s) => ({ profile: { ...s.profile, ...updates } })),

      completeOnboarding: () =>
        set((s) => ({ profile: { ...s.profile, onboardingComplete: true } })),

      // ── Profile (remote) ───────────────────────────────────────────────────

      syncProfile: async () => {
        const data = await api.getProfile();
        set((s) => ({
          profile: {
            ...s.profile,
            name: data.display_name ?? s.profile.name,
            madhab: (data.madhab as Madhab) ?? s.profile.madhab,
            nisabStandard: (data.nisab_standard as NisabStandard) ?? s.profile.nisabStandard,
            lastZakatPaidDate: data.hawl_start_date ?? s.profile.lastZakatPaidDate,
          },
        }));
      },

      saveProfile: async (fields) => {
        await api.upsertProfile(fields);
      },

      // ── Assets (local) ─────────────────────────────────────────────────────

      addAsset: (asset) =>
        set((s) => ({ assets: [...s.assets, asset] })),

      updateAsset: (id, updates) =>
        set((s) => ({
          assets: s.assets.map((a) =>
            a.id === id ? ({ ...a, ...updates } as Asset) : a
          ),
        })),

      removeAsset: (id) =>
        set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),

      // ── Assets (remote) ────────────────────────────────────────────────────

      persistAsset: async (asset) => {
        const payload = assetToBackend(asset);
        const created = await api.createAsset(payload);
        const saved = { ...asset, id: created.id };
        set((s) => ({
          assets: s.assets.some((a) => a.id === asset.id)
            ? s.assets.map((a) => (a.id === asset.id ? saved : a))
            : [...s.assets, saved],
        }));
        return saved;
      },

      deleteAssetRemote: async (id) => {
        await api.deleteAsset(id);
        set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }));
      },

      loadAssets: async () => {
        const backendAssets = await api.getAssets();
        const local = backendAssets.map(backendToAsset).filter((a): a is Asset => a !== null);
        set({ assets: local });
      },

      // ── Liabilities (local) ────────────────────────────────────────────────

      addLiability: (liability) =>
        set((s) => ({ liabilities: [...s.liabilities, liability] })),

      updateLiability: (id, updates) =>
        set((s) => ({
          liabilities: s.liabilities.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
        })),

      removeLiability: (id) =>
        set((s) => ({
          liabilities: s.liabilities.filter((l) => l.id !== id),
        })),

      // ── Liabilities (remote) ───────────────────────────────────────────────

      persistLiability: async (liability) => {
        const dueWithinYear = liability.type === 'shortterm';
        const created = await api.createLiability({
          label: liability.label,
          amount: liability.totalBalance,
          due_within_year: dueWithinYear,
        });
        const saved = { ...liability, id: created.id };
        set((s) => ({
          liabilities: s.liabilities.some((l) => l.id === liability.id)
            ? s.liabilities.map((l) => (l.id === liability.id ? saved : l))
            : [...s.liabilities, saved],
        }));
        return saved;
      },

      deleteLiabilityRemote: async (id) => {
        await api.deleteLiability(id);
        set((s) => ({ liabilities: s.liabilities.filter((l) => l.id !== id) }));
      },

      // ── Computed ───────────────────────────────────────────────────────────

      getZakatResult: () => {
        const { assets, liabilities, profile } = get();
        const nisabValues = getNisabValues();
        const lastPaid = profile.lastZakatPaidDate
          ? new Date(profile.lastZakatPaidDate)
          : null;

        return calculateZakat(assets, liabilities, {
          madhab: profile.madhab,
          nisabStandard: profile.nisabStandard,
          hawlComplete: lastPaid ? isHawlComplete(lastPaid) : false,
          goldNisabValue: nisabValues.gold,
          silverNisabValue: nisabValues.silver,
        });
      },
    }),
    {
      name: 'zakatflow-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        isLoggedIn: s.isLoggedIn,
        userId: s.userId,
        profile: s.profile,
        assets: s.assets,
        liabilities: s.liabilities,
      }),
    }
  )
);
