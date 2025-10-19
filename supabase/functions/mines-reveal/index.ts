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

    const { gameId, tileIndex } = await req.json();

    if (!gameId || tileIndex === undefined) {
      throw new Error('Invalid request');
    }

    if (tileIndex < 0 || tileIndex > 24) {
      throw new Error('Invalid tile index');
    }

    const session = activeSessions.get(gameId);
    if (!session || session.userId !== user.id || !session.isActive) {
      throw new Error('Invalid or inactive game session');
    }

    if (session.revealedTiles.includes(tileIndex)) {
      throw new Error('Tile already revealed');
    }

    const isMine = session.minePositions.includes(tileIndex);

    if (isMine) {
      session.isActive = false;
      activeSessions.delete(gameId);

      await supabase.from('game_history').insert({
        user_id: user.id,
        bet_amount: session.betAmount,
        multiplier: 0,
        profit: -session.betAmount,
        difficulty: 'hard',
      });

      console.log(`[Mines Reveal] User: ${user.id}, GameId: ${gameId}, Result: MINE, Tile: ${tileIndex}`);

      return new Response(
        JSON.stringify({
          result: 'mine',
          minePositions: session.minePositions,
          serverSeed: session.serverSeed,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    session.revealedTiles.push(tileIndex);
    const multiplier = calculateMultiplier(session.mineCount, session.revealedTiles.length);
    const potentialPayout = Math.floor(session.betAmount * multiplier);

    console.log(`[Mines Reveal] User: ${user.id}, GameId: ${gameId}, Result: SAFE, Tile: ${tileIndex}, Multiplier: ${multiplier.toFixed(2)}x`);

    return new Response(
      JSON.stringify({
        result: 'safe',
        gameState: {
          gameId: session.gameId,
          betAmount: session.betAmount,
          mineCount: session.mineCount,
          revealedTiles: session.revealedTiles,
          currentMultiplier: multiplier,
          potentialPayout,
          serverSeedHash: session.serverSeedHash,
          clientSeed: session.clientSeed,
          nonce: session.nonce,
          isActive: true,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Mines Reveal Error]', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
