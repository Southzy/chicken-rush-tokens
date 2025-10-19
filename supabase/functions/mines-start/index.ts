import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateMinePositions(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  mineCount: number
): Promise<number[]> {
  const positions: number[] = [];
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  
  for (let i = 0; i < mineCount && positions.length < mineCount; i++) {
    const hash = await sha256(`${combined}:${i}`);
    const position = parseInt(hash.substring(0, 8), 16) % 25;
    
    if (!positions.includes(position)) {
      positions.push(position);
    } else {
      i--;
    }
  }
  
  return positions.sort((a, b) => a - b);
}

function generateServerSeed(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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

    const { betAmount, mineCount, clientSeed } = await req.json();

    if (!betAmount || betAmount < 10) {
      throw new Error('Invalid bet amount');
    }

    if (!mineCount || mineCount < 1 || mineCount > 24) {
      throw new Error('Mine count must be between 1 and 24');
    }

    if (!clientSeed || clientSeed.length < 10) {
      throw new Error('Invalid client seed');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('token_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    if (profile.token_balance < betAmount) {
      throw new Error('Insufficient balance');
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ token_balance: profile.token_balance - betAmount })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('Failed to deduct bet amount');
    }

    const gameId = crypto.randomUUID();
    const serverSeed = generateServerSeed();
    const serverSeedHash = await sha256(serverSeed);
    const nonce = 0;
    const minePositions = await generateMinePositions(serverSeed, clientSeed, nonce, mineCount);

    // Store session in database
    const { error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        game_id: gameId,
        user_id: user.id,
        bet_amount: betAmount,
        mine_count: mineCount,
        server_seed: serverSeed,
        server_seed_hash: serverSeedHash,
        client_seed: clientSeed,
        nonce,
        mine_positions: minePositions,
        revealed_tiles: [],
        is_active: true
      });

    if (sessionError) {
      // Refund the bet
      await supabase
        .from('profiles')
        .update({ token_balance: profile.token_balance })
        .eq('id', user.id);
      throw new Error('Failed to create game session');
    }

    console.log(`[Mines Start] User: ${user.id}, GameId: ${gameId}, Bet: ${betAmount}, Mines: ${mineCount}`);

    return new Response(
      JSON.stringify({
        gameState: {
          gameId,
          betAmount,
          mineCount,
          revealedTiles: [],
          currentMultiplier: 1.0,
          potentialPayout: betAmount,
          serverSeedHash,
          clientSeed,
          nonce,
          isActive: true,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Mines Start Error]', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
