-- Drop the security definer view and recreate without security definer
DROP VIEW IF EXISTS public.leaderboard_stats;

CREATE OR REPLACE VIEW public.leaderboard_stats AS
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
  (COALESCE(i.rune_a, 0) * 0.001 + COALESCE(i.rune_c, 0) * 0.0005) as rune_luck,
  (COALESCE(i.rune_b, 0) * 0.004 + COALESCE(i.rune_c, 0) * 0.001) as rune_money,
  (1 + (COALESCE(i.rune_a, 0) * 0.001 + COALESCE(i.rune_c, 0) * 0.0005)) as luck_score,
  (1 + (COALESCE(i.rune_b, 0) * 0.004 + COALESCE(i.rune_c, 0) * 0.001)) as money_score,
  (1 + (COALESCE(i.rune_a, 0) * 0.001 + COALESCE(i.rune_c, 0) * 0.0005)) * 
  (1 + (COALESCE(i.rune_b, 0) * 0.004 + COALESCE(i.rune_c, 0) * 0.001)) as power_score
FROM public.profiles p
LEFT JOIN public.user_inventory i ON p.id = i.user_id;