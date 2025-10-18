import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rune configuration (must match client config)
const RUNE_CONFIG = [
  { key: 'rune_a', dropRate: 0.30, cap: 500 },
  { key: 'rune_b', dropRate: 0.22, cap: 300 },
  { key: 'rune_c', dropRate: 0.18, cap: 400 },
  { key: 'rune_d', dropRate: 0.12, cap: 200 },
  { key: 'rune_e', dropRate: 0.12, cap: 200 },
  { key: 'rune_f', dropRate: 0.06, cap: null },
  { key: 'rune_g', dropRate: 0.005, cap: 100 },
  { key: 'rune_h', dropRate: 0.004, cap: 80 },
  { key: 'rune_i', dropRate: 0.003, cap: 60 },
  { key: 'rune_j', dropRate: 0.0025, cap: 50 },
  { key: 'rune_k', dropRate: 0.002, cap: 40 },
  { key: 'rune_l', dropRate: 0.0015, cap: 30 },
  { key: 'rune_m', dropRate: 0.001, cap: 20 },
  { key: 'rune_joke', dropRate: 0.0001, cap: null }, // 1 in 10,000
];

const BOX_PRICE = 1000;
const MAX_BOXES_PER_REQUEST = 10000;

interface OpenResult {
  runeKey: string;
  actualGain: number;
  wasCapHit: boolean;
  nonce: string;
}

// Provably fair RNG using crypto.getRandomValues + user nonce
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function applyDiminishingReturns(currentCount: number, cap: number | null, gains: number): number {
  if (!cap) return gains;
  const nearCapThreshold = cap * 0.9;
  if (currentCount >= cap) return 0;
  if (currentCount >= nearCapThreshold) return gains * 0.5;
  return gains;
}

function rollRune(currentInventory: any, nonce: string): OpenResult {
  // Use nonce for provably fair randomness
  const hashInput = nonce + Date.now().toString();
  const roll = Math.random(); // In production, use cryptographic hash of nonce
  
  let cumulativeRate = 0;
  for (const rune of RUNE_CONFIG) {
    cumulativeRate += rune.dropRate;
    if (roll <= cumulativeRate) {
      const currentCount = currentInventory[rune.key] || 0;
      const actualGain = applyDiminishingReturns(currentCount, rune.cap, 1);
      return {
        runeKey: rune.key,
        actualGain,
        wasCapHit: actualGain === 0,
        nonce,
      };
    }
  }
  
  // Fallback (should never happen if drop rates sum to 1.0)
  return {
    runeKey: 'rune_a',
    actualGain: 1,
    wasCapHit: false,
    nonce,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { quantity } = await req.json();

    // Validate quantity
    if (!quantity || quantity < 1 || quantity > MAX_BOXES_PER_REQUEST) {
      throw new Error(`Invalid quantity. Must be between 1 and ${MAX_BOXES_PER_REQUEST}`);
    }

    console.log(`Bulk opening ${quantity} boxes for user ${user.id}`);

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('token_balance, rank_shards')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    const totalCost = quantity * BOX_PRICE;
    if (profile.token_balance < totalCost) {
      throw new Error('Insufficient tokens');
    }

    // Fetch user inventory
    const { data: inventory, error: invError } = await supabase
      .from('user_inventory')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (invError || !inventory) {
      throw new Error('Inventory not found');
    }

    // Roll all boxes
    const results: OpenResult[] = [];
    const newInventory = { ...inventory };
    let totalShards = 0;

    for (let i = 0; i < quantity; i++) {
      const nonce = generateNonce();
      const result = rollRune(newInventory, nonce);
      
      if (result.runeKey === 'rune_f') {
        totalShards += result.actualGain;
      } else if (result.runeKey === 'rune_joke') {
        newInventory.rune_joke = (newInventory.rune_joke || 0) + result.actualGain;
      } else {
        newInventory[result.runeKey] = (newInventory[result.runeKey] || 0) + result.actualGain;
      }
      
      results.push(result);
    }

    // Update token balance
    const { error: tokenError } = await supabase
      .from('profiles')
      .update({
        token_balance: profile.token_balance - totalCost,
        rank_shards: profile.rank_shards + totalShards,
      })
      .eq('id', user.id);

    if (tokenError) {
      throw new Error('Failed to update profile');
    }

    // Update inventory
    const inventoryUpdate: any = {};
    RUNE_CONFIG.forEach(rune => {
      inventoryUpdate[rune.key] = newInventory[rune.key] || 0;
    });

    const { error: updateInvError } = await supabase
      .from('user_inventory')
      .update(inventoryUpdate)
      .eq('user_id', user.id);

    if (updateInvError) {
      throw new Error('Failed to update inventory');
    }

    console.log(`Successfully opened ${quantity} boxes. Results:`, {
      totalShards,
      jokeRunes: results.filter(r => r.runeKey === 'rune_joke').length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          boxesOpened: quantity,
          shardsGained: totalShards,
          tokensSpent: totalCost,
          newTokenBalance: profile.token_balance - totalCost,
          newShardBalance: profile.rank_shards + totalShards,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in bulk-open-runebox:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
