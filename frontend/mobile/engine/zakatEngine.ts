// ─────────────────────────────────────────────
//  ZakatFlow — Fiqh Engine
//  Pure functions. No side effects. No UI.
// ─────────────────────────────────────────────

export type Madhab = 'hanafi' | 'shafii' | 'maliki' | 'hanbali';
export type NisabStandard = 'gold' | 'silver';
export type StockIntention = 'traded' | 'longterm';

export interface CashAsset {
  type: 'cash';
  id: string;
  label: string;
  balance: number;
  isRiba: boolean;
  interestEarned: number; // amount to purify
}

export interface GoldAsset {
  type: 'gold';
  id: string;
  label: string;
  weightGrams: number;
  karatPurity: number; // e.g. 0.916 for 22k
  isWorn: boolean;     // affects hanafi vs majority ruling
  pricePerGram: number;
}

export interface StockAsset {
  type: 'stock';
  id: string;
  label: string;
  marketValue: number;
  intention: StockIntention;
  criRatio: number; // default 0.33 if unknown
}

export interface CryptoAsset {
  type: 'crypto';
  id: string;
  label: string;
  quantity: number;
  pricePerUnit: number;
}

export interface RetirementAsset {
  type: 'retirement';
  id: string;
  label: string;
  balance: number;
  vestedPercent: number; // 0–1
  estimatedTaxPenalty: number;
  hasRiba: boolean;
  ribaPortion: number;
}

export type Asset =
  | CashAsset
  | GoldAsset
  | StockAsset
  | CryptoAsset
  | RetirementAsset;

export interface Liability {
  id: string;
  label: string;
  type: 'shortterm' | 'longterm' | 'interest';
  totalBalance: number;
  monthlyPrincipal?: number; // for longterm — deduct 12 months
}

export interface ZakatSettings {
  madhab: Madhab;
  nisabStandard: NisabStandard;
  hawlComplete: boolean;
  goldNisabValue: number;   // live price: 85g × gold/g
  silverNisabValue: number; // live price: 595g × silver/g
}

export interface AssetBreakdown {
  id: string;
  label: string;
  rawValue: number;
  zakatableValue: number;
  zakatDue: number;
  ribaExcluded: number;
  note: string;
}

export interface ZakatResult {
  totalRawAssets: number;
  totalRibaExcluded: number;
  totalZakatableAssets: number;
  totalDeductions: number;
  netZakatableWealth: number;
  nisabThreshold: number;
  meetsNisab: boolean;
  hawlComplete: boolean;
  zakatDue: number;
  breakdown: AssetBreakdown[];
  purificationAmount: number;
}

// ── Per-asset zakatable value ────────────────

function getCashZakatable(asset: CashAsset): AssetBreakdown {
  const ribaExcluded = asset.isRiba ? asset.interestEarned : 0;
  const zakatableValue = asset.balance - ribaExcluded;
  return {
    id: asset.id,
    label: asset.label,
    rawValue: asset.balance,
    zakatableValue,
    zakatDue: zakatableValue * 0.025,
    ribaExcluded,
    note: asset.isRiba
      ? `Interest of $${ribaExcluded.toFixed(2)} excluded and must be purified`
      : 'Clean — no interest',
  };
}

function getGoldZakatable(asset: GoldAsset, madhab: Madhab): AssetBreakdown {
  const marketValue = asset.weightGrams * asset.karatPurity * asset.pricePerGram;

  // Hanafi: all gold zakatable including worn
  // Majority (shafii/maliki/hanbali): worn jewelry exempt
  const isExempt = asset.isWorn && madhab !== 'hanafi';

  const zakatableValue = isExempt ? 0 : marketValue;
  return {
    id: asset.id,
    label: asset.label,
    rawValue: marketValue,
    zakatableValue,
    zakatDue: zakatableValue * 0.025,
    ribaExcluded: 0,
    note: isExempt
      ? `Worn jewelry exempt under ${madhab} — no Zakat due`
      : `${asset.weightGrams}g × ${asset.karatPurity} purity × $${asset.pricePerGram}/g`,
  };
}

function getStockZakatable(asset: StockAsset): AssetBreakdown {
  // Actively traded → full market value
  // Long-term → CRI ratio (cash + receivables + inventory portion)
  const zakatableValue =
    asset.intention === 'traded'
      ? asset.marketValue
      : asset.marketValue * asset.criRatio;

  return {
    id: asset.id,
    label: asset.label,
    rawValue: asset.marketValue,
    zakatableValue,
    zakatDue: zakatableValue * 0.025,
    ribaExcluded: 0,
    note:
      asset.intention === 'traded'
        ? 'Actively traded — full market value'
        : `Long-term — CRI method (${Math.round(asset.criRatio * 100)}% of market value)`,
  };
}

function getCryptoZakatable(asset: CryptoAsset): AssetBreakdown {
  const marketValue = asset.quantity * asset.pricePerUnit;
  return {
    id: asset.id,
    label: asset.label,
    rawValue: marketValue,
    zakatableValue: marketValue,
    zakatDue: marketValue * 0.025,
    ribaExcluded: 0,
    note: `${asset.quantity} × $${asset.pricePerUnit} — full market value per FCNA`,
  };
}

function getRetirementZakatable(asset: RetirementAsset): AssetBreakdown {
  // (balance × vested%) - tax/penalty - riba portion
  const vestedBalance = asset.balance * asset.vestedPercent;
  const ribaExcluded = asset.hasRiba ? asset.ribaPortion : 0;
  const zakatableValue = Math.max(
    0,
    vestedBalance - asset.estimatedTaxPenalty - ribaExcluded
  );
  return {
    id: asset.id,
    label: asset.label,
    rawValue: asset.balance,
    zakatableValue,
    zakatDue: zakatableValue * 0.025,
    ribaExcluded,
    note: `($${asset.balance} × ${asset.vestedPercent * 100}%) − $${asset.estimatedTaxPenalty} tax/penalty${ribaExcluded ? ` − $${ribaExcluded} riba` : ''}`,
  };
}

// ── Liability deduction ───────────────────────

export function getDeductibleAmount(liability: Liability): number {
  if (liability.type === 'interest') return 0; // riba never deductible
  if (liability.type === 'shortterm') return liability.totalBalance;
  // longterm: only 12 months of principal
  if (liability.type === 'longterm' && liability.monthlyPrincipal) {
    return Math.min(liability.monthlyPrincipal * 12, liability.totalBalance);
  }
  return 0;
}

// ── Main engine ───────────────────────────────

export function calculateZakat(
  assets: Asset[],
  liabilities: Liability[],
  settings: ZakatSettings
): ZakatResult {
  // 1. Normalize each asset
  const breakdown: AssetBreakdown[] = assets.map((asset) => {
    switch (asset.type) {
      case 'cash':       return getCashZakatable(asset);
      case 'gold':       return getGoldZakatable(asset, settings.madhab);
      case 'stock':      return getStockZakatable(asset);
      case 'crypto':     return getCryptoZakatable(asset);
      case 'retirement': return getRetirementZakatable(asset);
    }
  });

  const totalRawAssets      = breakdown.reduce((s, b) => s + b.rawValue, 0);
  const totalRibaExcluded   = breakdown.reduce((s, b) => s + b.ribaExcluded, 0);
  const totalZakatableAssets = breakdown.reduce((s, b) => s + b.zakatableValue, 0);
  const purificationAmount   = totalRibaExcluded;

  // 2. Deduct liabilities
  const totalDeductions = liabilities.reduce(
    (s, l) => s + getDeductibleAmount(l),
    0
  );

  const netZakatableWealth = Math.max(0, totalZakatableAssets - totalDeductions);

  // 3. Nisab check
  const nisabThreshold =
    settings.nisabStandard === 'silver'
      ? settings.silverNisabValue
      : settings.goldNisabValue;

  const meetsNisab = netZakatableWealth >= nisabThreshold;

  // 4. Calculate
  const zakatDue =
    meetsNisab && settings.hawlComplete ? netZakatableWealth * 0.025 : 0;

  return {
    totalRawAssets,
    totalRibaExcluded,
    totalZakatableAssets,
    totalDeductions,
    netZakatableWealth,
    nisabThreshold,
    meetsNisab,
    hawlComplete: settings.hawlComplete,
    zakatDue,
    breakdown,
    purificationAmount,
  };
}

// ── Riba detection ────────────────────────────

// Plaid account subtypes that are interest-bearing
export const RIBA_ACCOUNT_SUBTYPES = new Set([
  'savings',
  'money market',
  'cd',
  'certificate',
  'prepaid',
  // investment types
  'bond',
  'fixed income',
  'mutual fund', // may contain bonds — flag for review
]);

export function detectRiba(plaidSubtype: string): boolean {
  return RIBA_ACCOUNT_SUBTYPES.has(plaidSubtype.toLowerCase());
}

// ── Hawl helpers ──────────────────────────────

export const HAWL_DAYS = 354; // one lunar year

export function getHawlDueDate(lastPaidDate: Date): Date {
  const due = new Date(lastPaidDate);
  due.setDate(due.getDate() + HAWL_DAYS);
  return due;
}

export function getDaysUntilHawl(lastPaidDate: Date): number {
  const due = getHawlDueDate(lastPaidDate);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function isHawlComplete(lastPaidDate: Date): boolean {
  return getDaysUntilHawl(lastPaidDate) === 0;
}

export function getHawlProgress(lastPaidDate: Date): number {
  const totalMs = HAWL_DAYS * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - lastPaidDate.getTime();
  return Math.min(1, Math.max(0, elapsed / totalMs));
}

// ── Nisab live prices (hardcoded for MVP) ─────
// Update these with live API in v2

export const GOLD_PRICE_PER_GRAM_USD  = 85.20;  // ~Apr 2026
export const SILVER_PRICE_PER_GRAM_USD = 0.86;

export const GOLD_NISAB_GRAMS   = 85;
export const SILVER_NISAB_GRAMS = 595;

export function getNisabValues() {
  return {
    gold:   GOLD_NISAB_GRAMS   * GOLD_PRICE_PER_GRAM_USD,
    silver: SILVER_NISAB_GRAMS * SILVER_PRICE_PER_GRAM_USD,
  };
}
