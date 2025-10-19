import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
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

    // Fetch session from database
    const { data: session, error: sessionError } = await supabaseClient
      .from('game_sessions')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      throw new Error('Invalid or inactive game session');
    }

    if (session.revealed_tiles.length === 0) {
      throw new Error('No tiles revealed');
    }

    // Mark session as inactive
    await supabaseClient
      .from('game_sessions')
      .update({ is_active: false })
      .eq('game_id', gameId);

    const multiplier = calculateMultiplier(session.mine_count, session.revealed_tiles.length);
    const payout = Math.floor(session.bet_amount * multiplier);
    const profit = payout - session.bet_amount;

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
      bet_amount: session.bet_amount,
      multiplier,
      profit,
      difficulty: 'hard',
    });

    console.log(`[Mines Cashout] User: ${user.id}, GameId: ${gameId}, Payout: ${payout}, Multiplier: ${multiplier.toFixed(2)}x`);

    return new Response(
      JSON.stringify({
        payout,
        multiplier,
        minePositions: session.mine_positions,
        serverSeed: session.server_seed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Mines Cashout Error]', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
