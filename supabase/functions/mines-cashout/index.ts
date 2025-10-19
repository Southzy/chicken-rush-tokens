import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GameSession {
  gameId: string;
  userId: string;
  betAmount: number;
  mineCount: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  minePositions: number[];
  revealedTiles: number[];
  isActive: boolean;
  createdAt: number;
}

const activeSessions = new Map<string, GameSession>();

function calculateMultiplier(mineCount: number, revealedCount: number): number {
  const totalTiles = 25;
  const safeTiles = totalTiles - mineCount;
  
  let multiplier = 1.0;
  const houseEdge = 0.99;
  
  for (let i = 0; i < revealedCount; i++) {
    const probSafe = (safeTiles - i) / (totalTiles - i);
    multiplier *= (houseEdge / probSafe);
  }
  
  return multiplier;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { gameId } = await req.json();

    if (!gameId) {
      throw new Error('Invalid request');
    }

    const session = activeSessions.get(gameId);
    if (!session || session.userId !== user.id || !session.isActive) {
      throw new Error('Invalid or inactive game session');
    }

    if (session.revealedTiles.length === 0) {
      throw new Error('No tiles revealed');
    }

    session.isActive = false;
    const multiplier = calculateMultiplier(session.mineCount, session.revealedTiles.length);
    const payout = Math.floor(session.betAmount * multiplier);
    const profit = payout - session.betAmount;

    activeSessions.delete(gameId);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('token_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ token_balance: profile.token_balance + payout })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('Failed to credit payout');
    }

    await supabase.from('game_history').insert({
      user_id: user.id,
      bet_amount: session.betAmount,
      multiplier,
      profit,
      difficulty: 'hard',
    });

    console.log(`[Mines Cashout] User: ${user.id}, GameId: ${gameId}, Payout: ${payout}, Multiplier: ${multiplier.toFixed(2)}x`);

    return new Response(
      JSON.stringify({
        payout,
        multiplier,
        minePositions: session.minePositions,
        serverSeed: session.serverSeed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Mines Cashout Error]', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
