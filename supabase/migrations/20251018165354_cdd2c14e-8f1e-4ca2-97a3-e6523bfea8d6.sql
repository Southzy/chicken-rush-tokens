-- Add user_inventory table for Rune storage
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rune_a integer DEFAULT 0 NOT NULL,
  rune_b integer DEFAULT 0 NOT NULL,
  rune_c integer DEFAULT 0 NOT NULL,
  rune_d integer DEFAULT 0 NOT NULL,
  rune_e integer DEFAULT 0 NOT NULL,
  rune_f integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own inventory"
  ON public.user_inventory
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory"
  ON public.user_inventory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
  ON public.user_inventory
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add 6 new rank tiers to user_rank enum
ALTER TYPE public.user_rank ADD VALUE IF NOT EXISTS 'starlight_scout';
ALTER TYPE public.user_rank ADD VALUE IF NOT EXISTS 'nebula_ranger';
ALTER TYPE public.user_rank ADD VALUE IF NOT EXISTS 'quasar_sentinel';
ALTER TYPE public.user_rank ADD VALUE IF NOT EXISTS 'pulsar_warden';
ALTER TYPE public.user_rank ADD VALUE IF NOT EXISTS 'eventide_herald';
ALTER TYPE public.user_rank ADD VALUE IF NOT EXISTS 'cosmic_arbiter';

-- Add rank_shards column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rank_shards integer DEFAULT 0 NOT NULL;

-- Create leaderboard view with Rune-enhanced stats
CREATE OR REPLACE VIEW public.leaderboard_stats AS
SELECT 
  p.id,
  p.username,
  p.rank,
  p.token_balance,
  COALESCE(i.rune_a, 0) as rune_a,
  COALESCE(i.rune_b, 0) as rune_b,
  COALESCE(i.rune_c, 0) as rune_c,
  COALESCE(i.rune_d, 0) as rune_d,
  COALESCE(i.rune_e, 0) as rune_e,
  COALESCE(i.rune_f, 0) as rune_f,
  -- Calculate Rune bonuses
  (COALESCE(i.rune_a, 0) * 0.001 + COALESCE(i.rune_c, 0) * 0.0005) as rune_luck,
  (COALESCE(i.rune_b, 0) * 0.004 + COALESCE(i.rune_c, 0) * 0.001) as rune_money,
  -- Calculate total stats (simplified - would be enhanced with actual emoji and rank multipliers)
  (1 + (COALESCE(i.rune_a, 0) * 0.001 + COALESCE(i.rune_c, 0) * 0.0005)) as luck_score,
  (1 + (COALESCE(i.rune_b, 0) * 0.004 + COALESCE(i.rune_c, 0) * 0.001)) as money_score,
  (1 + (COALESCE(i.rune_a, 0) * 0.001 + COALESCE(i.rune_c, 0) * 0.0005)) * 
  (1 + (COALESCE(i.rune_b, 0) * 0.004 + COALESCE(i.rune_c, 0) * 0.001)) as power_score
FROM public.profiles p
LEFT JOIN public.user_inventory i ON p.id = i.user_id;

-- Function to initialize user inventory on profile creation
CREATE OR REPLACE FUNCTION public.initialize_user_inventory()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_inventory (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create inventory when profile is created
DROP TRIGGER IF EXISTS on_profile_created_init_inventory ON public.profiles;
CREATE TRIGGER on_profile_created_init_inventory
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_inventory();

-- Add trigger for updated_at on user_inventory
CREATE TRIGGER update_user_inventory_updated_at
  BEFORE UPDATE ON public.user_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();