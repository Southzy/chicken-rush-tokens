// src/lib/gameConfig.ts
// Centralized Game Configuration (fixed + normalized)
// All runes, ranks, exchange rates, and game constants

export type RuneKey = 
  | 'rune_a' | 'rune_b' | 'rune_c' | 'rune_d' | 'rune_e' | 'rune_f'
  | 'rune_g' | 'rune_h' | 'rune_i' | 'rune_j' | 'rune_k' | 'rune_l' | 'rune_m'
  | 'rune_joke';

export type UserRank = 
  | 'nova_cadet' | 'quantum_ranger' | 'cyber_warden' | 'celestial_overlord' | 'eclipse_titan'
  | 'starlight_scout' | 'nebula_ranger' | 'quasar_sentinel' | 'pulsar_warden' | 'eventide_herald' | 'cosmic_arbiter'
  | 'the_joke';

export interface RuneData {
  key: RuneKey;
  name: string;
  symbol: string;
  effect: string;    // human-readable; see effectRegistry.ts for executable logic
  dropRate: number;  // normalized final rate (sums to 1.0 across all runes)
  cap: number | null;
  color: string;     // Tailwind gradient classes, use at most: from-*, (optional) via-*, to-*
}

export interface RankData {
  key: UserRank;
  name: string;
  price?: number;
  shardCost?: number;
  badge: string;
  luckMult: number;
  moneyMult: number;
  gradient: string;
}

export interface ExchangeRate {
  jokeRuneToTokens: number;
  jokeRuneToShards: number;
  jokeRuneForTheJokeRank: number;
}

// Box pricing
export const BOX_PRICE = 1000;

// Balance caps
export const MAX_TOKEN_BALANCE = 1_000_000_000_000; // 1e12
export const MAX_SHARD_BALANCE = 1_000_000_000_000; // 1e12

// Exchange rates for The Joke Rune (fixed to match comments)
export const EXCHANGE_RATES: ExchangeRate = {
  jokeRuneToTokens: 100_000, // 1 Joke Rune = 100k tokens
  jokeRuneToShards: 10,      // 1 Joke Rune = 10 shards
  jokeRuneForTheJokeRank: 1000, // Need 1000 Joke Runes for The Joke rank
};

// --- Base runes with intended relative weights (before normalization) ---
type BaseRuneRow = Omit<RuneData, 'dropRate'> & { dropRate: number };

const BASE_RUNES: BaseRuneRow[] = [
  // Original 6 runes (sum = 1.00 before scaling)
  { key: 'rune_a', name: 'Aether Rune',  symbol: '✨', effect: '+0.001 Luck',                         dropRate: 0.30,  cap: 500, color: 'from-cyan-500 to-blue-500' },
  { key: 'rune_b', name: 'Blaze Rune',   symbol: '🔥', effect: '+0.004 Money Multiplier',             dropRate: 0.22,  cap: 300, color: 'from-orange-500 to-red-500' },
  { key: 'rune_c', name: 'Chrono Rune',  symbol: '⏰', effect: '+0.0005 Luck & +0.001 Money',         dropRate: 0.18,  cap: 400, color: 'from-purple-500 to-pink-500' },
  { key: 'rune_d', name: 'Dusk Rune',    symbol: '🌙', effect: '+0.25% Emoji Luck bonus',             dropRate: 0.12,  cap: 200, color: 'from-indigo-500 to-purple-500' },
  { key: 'rune_e', name: 'Ember Rune',   symbol: '💎', effect: '+0.25% Emoji Money bonus',            dropRate: 0.12,  cap: 200, color: 'from-yellow-500 to-orange-500' },
  // Tailwind: 'from-gold' is not standard, use from-amber-400
  { key: 'rune_f', name: 'Fate Rune',    symbol: '⭐', effect: '+1 Rank Shard',                       dropRate: 0.06,  cap: null, color: 'from-amber-400 to-yellow-500' },
  
  // 7 new themed runes + Joke (sum = 0.0191)
  { key: 'rune_g', name: 'Shadow Rune',  symbol: '🌑', effect: '+0.01 Critical Chance',               dropRate: 0.005,  cap: 100, color: 'from-gray-900 to-gray-700' },
  { key: 'rune_h', name: 'Phoenix Rune', symbol: '🔆', effect: '+0.015 Revival Bonus',                dropRate: 0.004,  cap: 80,  color: 'from-red-600 to-orange-400' },
  { key: 'rune_i', name: 'Void Rune',    symbol: '🕳️', effect: '+0.02 Void Power',                   dropRate: 0.003,  cap: 60,  color: 'from-purple-900 to-black' },
  { key: 'rune_j', name: 'Storm Rune',   symbol: '⚡', effect: '+0.025 Lightning Strike',             dropRate: 0.0025, cap: 50,  color: 'from-blue-400 to-cyan-300' },
  { key: 'rune_k', name: 'Prism Rune',   symbol: '🌈', effect: '+0.03 Rainbow Luck',                  dropRate: 0.002,  cap: 40,  color: 'from-pink-400 via-purple-400 to-blue-400' },
  { key: 'rune_l', name: 'Omega Rune',   symbol: '⚛️', effect: '+0.04 Quantum Flux',                 dropRate: 0.0015, cap: 30,  color: 'from-indigo-600 to-purple-800' },
  { key: 'rune_m', name: 'Genesis Rune', symbol: '🌟', effect: '+0.05 Creation Energy',              dropRate: 0.001,  cap: 20,  color: 'from-yellow-300 to-amber-500' },
  // Use a single 'via-*' in gradients
  { key: 'rune_joke', name: 'The Joke Rune', symbol: '🃏', effect: 'Collectible (Exchange for rewards)', dropRate: 0.0001, cap: null, color: 'from-pink-500 via-purple-500 to-cyan-500' },
];

// Normalize: scale the original 6 runes group to occupy (1 - specials)
// while keeping specials untouched and overall sum = 1.0
function normalizeRunes(input: BaseRuneRow[]): RuneData[] {
  const baseKeys = new Set<RuneKey>(['rune_a','rune_b','rune_c','rune_d','rune_e','rune_f']);
  const sumBase = input.filter(r => baseKeys.has(r.key)).reduce((s, r) => s + r.dropRate, 0);
  const sumSpecial = input.filter(r => !baseKeys.has(r.key)).reduce((s, r) => s + r.dropRate, 0);

  const targetBase = Math.max(0, 1 - sumSpecial); // 0.9809
  const factor = sumBase > 0 ? targetBase / sumBase : 1;

  const scaled = input.map(r => ({
    ...r,
    dropRate: baseKeys.has(r.key) ? r.dropRate * factor : r.dropRate,
  }));

  // Fix tiny floating error so the final sum is exactly 1.0
  const sum = scaled.reduce((s, r) => s + r.dropRate, 0);
  const diff = 1 - sum;
  if (Math.abs(diff) > 1e-12) {
    const i = scaled.findIndex(r => r.key === 'rune_a');
    if (i >= 0) scaled[i] = { ...scaled[i], dropRate: scaled[i].dropRate + diff };
  }
  return scaled;
}

export const RUNE_DATA: RuneData[] = normalizeRunes(BASE_RUNES);

// Warn if unexpected sum drift
(function checkSum() {
  const total = RUNE_DATA.reduce((s, r) => s + r.dropRate, 0);
  if (Math.abs(total - 1.0) > 1e-8) {
    console.warn(`WARNING: Rune drop rates sum to ${(total * 100).toFixed(6)}% (should be 100%).`);
  }
})();

// All rank data
export const RANK_DATA: RankData[] = [
  { key: 'nova_cadet',         name: 'Nova Cadet',         badge: '🌠', luckMult: 1.0,  moneyMult: 1.0,  gradient: 'from-blue-400 to-cyan-300' },
  { key: 'quantum_ranger',     name: 'Quantum Ranger',     price: 5_000,   badge: '⚡', luckMult: 1.05, moneyMult: 1.1,  gradient: 'from-purple-500 to-pink-400' },
  { key: 'cyber_warden',       name: 'Cyber Warden',       price: 25_000,  badge: '🔮', luckMult: 1.1,  moneyMult: 1.25, gradient: 'from-indigo-500 to-purple-600' },
  { key: 'celestial_overlord', name: 'Celestial Overlord', price: 100_000, badge: '👑', luckMult: 1.2,  moneyMult: 1.5,  gradient: 'from-yellow-400 to-orange-500' },
  { key: 'eclipse_titan',      name: 'Eclipse Titan',      price: 500_000, badge: '🌙', luckMult: 1.35, moneyMult: 2.0,  gradient: 'from-gray-800 to-purple-900' },
  
  // New rank tiers (shard-based)
  { key: 'starlight_scout',    name: 'Starlight Scout',    shardCost: 100,  badge: '✨', luckMult: 1.5, moneyMult: 2.5, gradient: 'from-cyan-400 to-blue-600' },
  { key: 'nebula_ranger',      name: 'Nebula Ranger',      shardCost: 300,  badge: '🌌', luckMult: 1.7, moneyMult: 3.0, gradient: 'from-purple-600 to-pink-500' },
  { key: 'quasar_sentinel',    name: 'Quasar Sentinel',    shardCost: 600,  badge: '💫', luckMult: 2.0, moneyMult: 3.5, gradient: 'from-orange-500 to-red-600' },
  { key: 'pulsar_warden',      name: 'Pulsar Warden',      shardCost: 1000, badge: '⭐', luckMult: 2.5, moneyMult: 4.0, gradient: 'from-yellow-300 to-orange-600' },
  { key: 'eventide_herald',    name: 'Eventide Herald',    shardCost: 2000, badge: '🌅', luckMult: 3.0, moneyMult: 5.0, gradient: 'from-pink-400 to-purple-700' },
  { key: 'cosmic_arbiter',     name: 'Cosmic Arbiter',     shardCost: 5000, badge: '🔱', luckMult: 4.0, moneyMult: 6.0, gradient: 'from-indigo-400 to-cyan-600' },
  
  // The Joke rank (special: requires 1000 Joke Runes)
  { key: 'the_joke',           name: 'The Joke',           badge: '🃏', luckMult: 1000.0, moneyMult: 100.0, gradient: 'from-pink-500 via-purple-500 to-cyan-500' },
];

// Lookup helpers
export const getRuneData = (key: RuneKey): RuneData | undefined => RUNE_DATA.find(r => r.key === key);
export const getRankData = (key: UserRank): RankData | undefined => RANK_DATA.find(r => r.key === key);
export const getRunesByDropRate = (): RuneData[] => [...RUNE_DATA].sort((a, b) => b.dropRate - a.dropRate);
