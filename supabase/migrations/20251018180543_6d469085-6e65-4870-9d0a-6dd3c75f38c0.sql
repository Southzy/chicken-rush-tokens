-- Fix: Add 'the_joke' rank to user_rank enum
ALTER TYPE public.user_rank ADD VALUE IF NOT EXISTS 'the_joke';

-- Add new rune columns to user_inventory for 7 new themed runes + The Joke Rune
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS rune_g integer DEFAULT 0 NOT NULL; -- Shadow Rune
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS rune_h integer DEFAULT 0 NOT NULL; -- Phoenix Rune
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS rune_i integer DEFAULT 0 NOT NULL; -- Void Rune
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS rune_j integer DEFAULT 0 NOT NULL; -- Storm Rune
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS rune_k integer DEFAULT 0 NOT NULL; -- Prism Rune
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS rune_l integer DEFAULT 0 NOT NULL; -- Omega Rune
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS rune_m integer DEFAULT 0 NOT NULL; -- Genesis Rune
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS rune_joke integer DEFAULT 0 NOT NULL; -- The Joke Rune (ultra-rare)

-- Add index for faster leaderboard queries on rank_shards
CREATE INDEX IF NOT EXISTS idx_profiles_rank_shards ON public.profiles(rank_shards DESC);

-- Create admin grant limits function to enforce 1 trillion cap
CREATE OR REPLACE FUNCTION public.enforce_balance_caps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cap token_balance at 1 trillion
  IF NEW.token_balance > 1000000000000 THEN
    NEW.token_balance = 1000000000000;
  END IF;
  
  -- Cap rank_shards at 1 trillion
  IF NEW.rank_shards > 1000000000000 THEN
    NEW.rank_shards = 1000000000000;
  END IF;
  
  -- Ensure no negative values
  IF NEW.token_balance < 0 THEN
    NEW.token_balance = 0;
  END IF;
  
  IF NEW.rank_shards < 0 THEN
    NEW.rank_shards = 0;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Replace existing token cap trigger with new comprehensive one
DROP TRIGGER IF EXISTS cap_token_balance_trigger ON public.profiles;

CREATE TRIGGER enforce_balance_caps_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_balance_caps();

-- Drop and recreate leaderboard view to include new rune data
DROP VIEW IF EXISTS public.leaderboard_stats;

CREATE VIEW public.leaderboard_stats AS
SELECT 
  p.id,
  p.username,
  p.rank,
  p.token_balance,
  p.rank_shards,
  COALESCE(i.rune_a, 0) as rune_a,
  COALESCE(i.rune_b, 0) as rune_b,
  COALESCE(i.rune_c, 0) as rune_c,
  COALESCE(i.rune_d, 0) as rune_d,
  COALESCE(i.rune_e, 0) as rune_e,
  COALESCE(i.rune_f, 0) as rune_f,
  COALESCE(i.rune_g, 0) as rune_g,
  COALESCE(i.rune_h, 0) as rune_h,
  COALESCE(i.rune_i, 0) as rune_i,
  COALESCE(i.rune_j, 0) as rune_j,
  COALESCE(i.rune_k, 0) as rune_k,
  COALESCE(i.rune_l, 0) as rune_l,
  COALESCE(i.rune_m, 0) as rune_m,
  COALESCE(i.rune_joke, 0) as rune_joke,
  (COALESCE(i.rune_a, 0) * 0.001 + 
   COALESCE(i.rune_c, 0) * 0.0005) as rune_luck,
  (COALESCE(i.rune_b, 0) * 0.004 + 
   COALESCE(i.rune_c, 0) * 0.001) as rune_money,
  (COALESCE(i.rune_a, 0) * 0.001 + 
   COALESCE(i.rune_c, 0) * 0.0005) as luck_score,
  (COALESCE(i.rune_b, 0) * 0.004 + 
   COALESCE(i.rune_c, 0) * 0.001) as money_score,
  (p.token_balance::numeric / 1000 + p.rank_shards * 10) as power_score
FROM public.profiles p
LEFT JOIN public.user_inventory i ON p.id = i.user_id;