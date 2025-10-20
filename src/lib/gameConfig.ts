// src/lib/gameConfig.ts
// Centralized Game Configuration — two-phase drop model (easier rates)
// ✅ Increased special group chance from 1.91% → 3.00%

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
  effect: string;    // human-readable; do actual math in effectRegistry.ts
  dropRate: number;  // in-group rate (sums to 1.0 inside its group)
  cap: number | null;
  color: string;     // Tailwind gradient utilities
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

// Economy constants
export const BOX_PRICE = 1000;
export const MAX_TOKEN_BALANCE = 1_000_000_000_000; // 1e12
export const MAX_SHARD_BALANCE = 1_000_000_000_000; // 1e12

// Exchange rates for The Joke Rune (fixed to match comments)
export const EXCHANGE_RATES: ExchangeRate = {
  jokeRuneToTokens: 100_000, // 1 Joke Rune = 100k tokens
  jokeRuneToShards: 10,      // 1 Joke Rune = 10 shards
  jokeRuneForTheJokeRank: 1000, // Need 1000 Joke Runes for The Joke rank
};

// =========================
// Two-phase drop parameters
// =========================
export type RuneGroup = 'base' | 'special';

// ✅ Easier: bump special group quota from 0.0191 → 0.03
export const GROUP_WEIGHTS = {
  base: 0.97,     // 97.00%
  special: 0.03,  // 3.00%  (↑ easier to get rare runes)
} as const;

// ----- Base runes (original 6) — raw weights (normalized within group) -----
type BaseRow = Omit<RuneData, 'dropRate'> & { dropRate: number };

const BASE_RUNES_RAW: (BaseRow & { group?: RuneGroup })[] = [
  { key:'rune_a', name:'Aether Rune',  symbol:'✨', effect:'+0.001 Luck',                         dropRate:0.30,  cap:500,  color:'from-cyan-500 to-blue-500' },
  { key:'rune_b', name:'Blaze Rune',   symbol:'🔥', effect:'+0.004 Money Multiplier',             dropRate:0.22,  cap:300,  color:'from-orange-500 to-red-500' },
  { key:'rune_c', name:'Chrono Rune',  symbol:'⏰', effect:'+0.0005 Luck & +0.001 Money',         dropRate:0.18,  cap:400,  color:'from-purple-500 to-pink-500' },
  { key:'rune_d', name:'Dusk Rune',    symbol:'🌙', effect:'+0.25% Emoji Luck bonus',             dropRate:0.12,  cap:200,  color:'from-indigo-500 to-purple-500' },
  { key:'rune_e', name:'Ember Rune',   symbol:'💎', effect:'+0.25% Emoji Money bonus',            dropRate:0.12,  cap:200,  color:'from-yellow-500 to-orange-500' },
  // Tailwind: 'from-gold' is not standard → use from-amber-400
  { key:'rune_f', name:'Fate Rune',    symbol:'⭐', effect:'+1 Rank Shard',                       dropRate:0.06,  cap:null, color:'from-amber-400 to-yellow-500' },
];

// ----- Special runes (7 + Joke) — raw weights (normalized within group) -----
const SPECIAL_RUNES_RAW: (BaseRow & { group?: RuneGroup })[] = [
  { key:'rune_g', name:'Shadow Rune',   symbol:'🌑', effect:'+0.01 Critical Chance',    dropRate:0.005,  cap:100, color:'from-gray-900 to-gray-700' },
  { key:'rune_h', name:'Phoenix Rune',  symbol:'🔆', effect:'+0.015 Revival Bonus',     dropRate:0.004,  cap:80,  color:'from-red-600 to-orange-400' },
  { key:'rune_i', name:'Void Rune',     symbol:'🕳️', effect:'+0.02 Void Power',        dropRate:0.003,  cap:60,  color:'from-purple-900 to-black' },
  { key:'rune_j', name:'Storm Rune',    symbol:'⚡', effect:'+0.025 Lightning Strike',  dropRate:0.0025, cap:50,  color:'from-blue-400 to-cyan-300' },
  { key:'rune_k', name:'Prism Rune',    symbol:'🌈', effect:'+0.03 Rainbow Luck',       dropRate:0.002,  cap:40,  color:'from-pink-400 via-purple-400 to-blue-400' },
  { key:'rune_l', name:'Omega Rune',    symbol:'⚛️', effect:'+0.04 Quantum Flux',      dropRate:0.0015, cap:30,  color:'from-indigo-600 to-purple-800' },
  { key:'rune_m', name:'Genesis Rune',  symbol:'🌟', effect:'+0.05 Creation Energy',    dropRate:0.001,  cap:20,  color:'from-yellow-300 to-amber-500' },
  { key:'rune_joke', name:'The Joke Rune', symbol:'🃏', effect:'Collectible (Exchange)', dropRate:0.0001, cap:null, color:'from-pink-500 via-purple-500 to-cyan-500' },
];

// Normalize helper (sum to 1.0 inside a group)
function normalizeGroup<T extends { dropRate: number }>(arr: T[]): T[] {
  const s = arr.reduce((x, r) => x + r.dropRate, 0);
  return s > 0 ? arr.map(r => ({ ...r, dropRate: r.dropRate / s })) : arr;
}

// Final in-group tables
export const RUNE_BASE: RuneData[] = normalizeGroup(BASE_RUNES_RAW as RuneData[]);
export const RUNE_SPECIAL: RuneData[] = normalizeGroup(SPECIAL_RUNES_RAW as RuneData[]);

// Effective rate (what players actually see) = groupWeight × in-group rate
export function getEffectiveDropRate(key: RuneKey): number {
  const b = RUNE_BASE.find(r => r.key === key);
  if (b) return GROUP_WEIGHTS.base * b.dropRate;
  const s = RUNE_SPECIAL.find(r => r.key === key);
  if (s) return GROUP_WEIGHTS.special * s.dropRate;
  return 0;
}

// For display (sorted by effective rate)
export const RUNE_DATA_FOR_DISPLAY: (RuneData & { group: RuneGroup, effectiveDropRate: number })[] = [
  ...RUNE_BASE.map(r => ({ ...r, group: 'base' as const,    effectiveDropRate: GROUP_WEIGHTS.base * r.dropRate })),
  ...RUNE_SPECIAL.map(r => ({ ...r, group: 'special' as const, effectiveDropRate: GROUP_WEIGHTS.special * r.dropRate })),
].sort((a, b) => b.effectiveDropRate - a.effectiveDropRate);

// Roll function (two-phase)
export function rollRuneTwoPhase(): RuneKey {
  const gate = Math.random();
  const pool = gate < GROUP_WEIGHTS.special ? RUNE_SPECIAL : RUNE_BASE;

  let cum = 0;
  const r = Math.random();
  for (const rune of pool) {
    cum += rune.dropRate;
    if (r <= cum) return rune.key;
  }
  return pool[pool.length - 1].key; // fallback guard
}

// ===== Ranks (unchanged) =====
export const RANK_DATA: RankData[] = [
  { key: 'nova_cadet',         name: 'Nova Cadet',         badge: '🌠', luckMult: 1.0,  moneyMult: 1.0,  gradient: 'from-blue-400 to-cyan-300' },
  { key: 'quantum_ranger',     name: 'Quantum Ranger',     price: 5_000,   badge: '⚡', luckMult: 1.05, moneyMult: 1.1,  gradient: 'from-purple-500 to-pink-400' },
  { key: 'cyber_warden',       name: 'Cyber Warden',       price: 25_000,  badge: '🔮', luckMult: 1.1,  moneyMult: 1.25, gradient: 'from-indigo-500 to-purple-600' },
  { key: 'celestial_overlord', name: 'Celestial Overlord', price: 100_000, badge: '👑', luckMult: 1.2,  moneyMult: 1.5,  gradient: 'from-yellow-400 to-orange-500' },
  { key: 'eclipse_titan',      name: 'Eclipse Titan',      price: 500_000, badge: '🌙', luckMult: 1.35, moneyMult: 2.0,  gradient: 'from-gray-800 to-purple-900' },

  { key: 'starlight_scout',    name: 'Starlight Scout',    shardCost: 100,  badge: '✨', luckMult: 1.5, moneyMult: 2.5, gradient: 'from-cyan-400 to-blue-600' },
  { key: 'nebula_ranger',      name: 'Nebula Ranger',      shardCost: 300,  badge: '🌌', luckMult: 1.7, moneyMult: 3.0, gradient: 'from-purple-600 to-pink-500' },
  { key: 'quasar_sentinel',    name: 'Quasar Sentinel',    shardCost: 600,  badge: '💫', luckMult: 2.0, moneyMult: 3.5, gradient: 'from-orange-500 to-red-600' },
  { key: 'pulsar_warden',      name: 'Pulsar Warden',      shardCost: 1000, badge: '⭐', luckMult: 2.5, moneyMult: 4.0, gradient: 'from-yellow-300 to-orange-600' },
  { key: 'eventide_herald',    name: 'Eventide Herald',    shardCost: 2000, badge: '🌅', luckMult: 3.0, moneyMult: 5.0, gradient: 'from-pink-400 to-purple-700' },
  { key: 'cosmic_arbiter',     name: 'Cosmic Arbiter',     shardCost: 5000, badge: '🔱', luckMult: 4.0, moneyMult: 6.0, gradient: 'from-indigo-400 to-cyan-600' },

  { key: 'the_joke',           name: 'The Joke',           badge: '🃏', luckMult: 1000.0, moneyMult: 100.0, gradient: 'from-pink-500 via-purple-500 to-cyan-500' },
];
