// src/lib/effectRegistry.ts
// Map rune effects to executable logic (example aggregation).
// You can adapt this to your actual profile/inventory models.

import { RuneKey } from './gameConfig';

// Basic clamp helpers
export const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// Example diminishing returns: f(x) = x / (1 + kx)
export function diminishingReturns(x: number, k = 0.5) {
  return x / (1 + k * x);
}

export interface AggregateBuffs {
  luckAdd: number;            // additive luck (e.g., +0.001)
  moneyMult: number;          // multiplicative money multiplier (stack multiplicatively)
  emojiLuckBonusPct: number;  // %
  emojiMoneyBonusPct: number; // %
  critChanceAdd: number;      // additive
  revivalBonus: number;       // additive
  voidPower: number;          // additive
  lightningStrike: number;    // additive
  rainbowLuck: number;        // additive
  quantumFlux: number;        // additive
  creationEnergy: number;     // additive
  shardGain: number;          // extra shards from Fate
}

// Counts of runes the user currently holds (after cap)
export type RuneCounts = Partial<Record<RuneKey, number>>;

export function computeAggregateBuffs(counts: RuneCounts): AggregateBuffs {
  const c = (k: RuneKey) => counts[k] ?? 0;

  // Base aggregates
  let luckAdd = 0;
  let moneyMult = 1;
  let emojiLuckBonusPct = 0;
  let emojiMoneyBonusPct = 0;
  let critChanceAdd = 0;
  let revivalBonus = 0;
  let voidPower = 0;
  let lightningStrike = 0;
  let rainbowLuck = 0;
  let quantumFlux = 0;
  let creationEnergy = 0;
  let shardGain = 0;

  // Map effects
  luckAdd            += 0.001  * c('rune_a');                     // Aether
  moneyMult          *= 1 + (0.004 * c('rune_b'));                // Blaze
  luckAdd            += 0.0005 * c('rune_c');                     // Chrono (luck)
  moneyMult          *= 1 + (0.001 * c('rune_c'));                // Chrono (money)
  emojiLuckBonusPct  += 0.25   * c('rune_d');                     // Dusk
  emojiMoneyBonusPct += 0.25   * c('rune_e');                     // Ember
  shardGain          += 1      * c('rune_f');                     // Fate

  // Special runes (use diminishing returns where sensible)
  critChanceAdd      += diminishingReturns(0.01 * c('rune_g'), 0.2);
  revivalBonus       += diminishingReturns(0.015 * c('rune_h'), 0.25);
  voidPower          += diminishingReturns(0.02 * c('rune_i'), 0.3);
  lightningStrike    += diminishingReturns(0.025 * c('rune_j'), 0.35);
  rainbowLuck        += diminishingReturns(0.03 * c('rune_k'), 0.4);
  quantumFlux        += diminishingReturns(0.04 * c('rune_l'), 0.45);
  creationEnergy     += diminishingReturns(0.05 * c('rune_m'), 0.5);

  // No direct stat from rune_joke here; it's a collectible for exchange.

  // Safety clamps (tune caps as you wish)
  luckAdd            = clamp(luckAdd, -1,  10);
  moneyMult          = clamp(moneyMult, 0,  1e6);
  emojiLuckBonusPct  = clamp(emojiLuckBonusPct, 0, 1000);
  emojiMoneyBonusPct = clamp(emojiMoneyBonusPct, 0, 1000);
  critChanceAdd      = clamp(critChanceAdd, 0, 1);
  revivalBonus       = clamp(revivalBonus, 0, 1);
  // Other stats can also be clamped if they influence gameplay outcomes

  return {
    luckAdd, moneyMult, emojiLuckBonusPct, emojiMoneyBonusPct,
    critChanceAdd, revivalBonus, voidPower, lightningStrike,
    rainbowLuck, quantumFlux, creationEnergy, shardGain,
  };
}
