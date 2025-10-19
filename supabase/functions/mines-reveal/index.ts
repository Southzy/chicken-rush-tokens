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

    const { gameId, tileIndex } = await req.json();

    if (!gameId || tileIndex === undefined) {
      throw new Error('Invalid request');
    }

    if (tileIndex < 0 || tileIndex > 24) {
      throw new Error('Invalid tile index');
    }

    // Get session from database
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      throw new Error('Invalid or inactive game session');
    }

    if (session.revealed_tiles.includes(tileIndex)) {
      throw new Error('Tile already revealed');
    }

    const isMine = session.mine_positions.includes(tileIndex);

    if (isMine) {
      // Update session to inactive
      await supabase
        .from('game_sessions')
        .update({ is_active: false })
        .eq('game_id', gameId);

      await supabase.from('game_history').insert({
        user_id: user.id,
        bet_amount: session.bet_amount,
        multiplier: 0,
        profit: -session.bet_amount,
        difficulty: 'hard',
      });

      console.log(`[Mines Reveal] User: ${user.id}, GameId: ${gameId}, Result: MINE, Tile: ${tileIndex}`);

      return new Response(
        JSON.stringify({
          result: 'mine',
          minePositions: session.mine_positions,
          serverSeed: session.server_seed,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add tile to revealed tiles
    const newRevealedTiles = [...session.revealed_tiles, tileIndex];
    
    // Update session in database
    await supabase
      .from('game_sessions')
      .update({ revealed_tiles: newRevealedTiles })
      .eq('game_id', gameId);

    const multiplier = calculateMultiplier(session.mine_count, newRevealedTiles.length);
    const potentialPayout = Math.floor(session.bet_amount * multiplier);

    console.log(`[Mines Reveal] User: ${user.id}, GameId: ${gameId}, Result: SAFE, Tile: ${tileIndex}, Multiplier: ${multiplier.toFixed(2)}x`);

    return new Response(
      JSON.stringify({
        result: 'safe',
        gameState: {
          gameId: session.game_id,
          betAmount: session.bet_amount,
          mineCount: session.mine_count,
          revealedTiles: newRevealedTiles,
          currentMultiplier: multiplier,
          potentialPayout,
          serverSeedHash: session.server_seed_hash,
          clientSeed: session.client_seed,
          nonce: session.nonce,
          isActive: true,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Mines Reveal Error]', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
