-- Create loot box types table
CREATE TABLE public.loot_boxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  emoji_pool_size INTEGER NOT NULL DEFAULT 20,
  secret_chance NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default loot boxes
INSERT INTO public.loot_boxes (name, price, emoji_pool_size, secret_chance) VALUES
('Silver Box', 500, 20, 0.01),
('Gold Box', 1000, 20, 0.03),
('Crytonium Box', 2000, 20, 0.07);

-- Create emojis table
CREATE TABLE public.emojis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji_symbol TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'secret')),
  effect_type TEXT NOT NULL CHECK (effect_type IN ('power', 'luck', 'secret')),
  bonus_percentage NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_emojis table (owned emojis)
CREATE TABLE public.user_emojis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  emoji_id UUID NOT NULL REFERENCES public.emojis(id) ON DELETE CASCADE,
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  obtained_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, emoji_id)
);

-- Enable RLS
ALTER TABLE public.loot_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emojis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_emojis ENABLE ROW LEVEL SECURITY;

-- Loot boxes are viewable by everyone
CREATE POLICY "Loot boxes are viewable by everyone"
ON public.loot_boxes
FOR SELECT
USING (true);

-- Emojis are viewable by everyone
CREATE POLICY "Emojis are viewable by everyone"
ON public.emojis
FOR SELECT
USING (true);

-- Users can view their own emojis
CREATE POLICY "Users can view their own emojis"
ON public.user_emojis
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own emojis
CREATE POLICY "Users can insert their own emojis"
ON public.user_emojis
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own emojis
CREATE POLICY "Users can update their own emojis"
ON public.user_emojis
FOR UPDATE
USING (auth.uid() = user_id);

-- Insert sample emojis
INSERT INTO public.emojis (name, emoji_symbol, rarity, effect_type, bonus_percentage) VALUES
('Thunder Chick', '⚡', 'epic', 'power', 10),
('Lucky Feather', '🍀', 'rare', 'luck', 5),
('Phoenix Egg', '🔥', 'secret', 'secret', 100),
('Star Dust', '✨', 'common', 'power', 3),
('Golden Wing', '🪙', 'rare', 'power', 7),
('Crystal Egg', '💎', 'epic', 'luck', 8),
('Mystic Orb', '🔮', 'rare', 'luck', 6),
('Cosmic Feather', '🌌', 'epic', 'power', 12),
('Rainbow Shell', '🌈', 'common', 'luck', 2),
('Thunder Bolt', '⚡', 'secret', 'power', 15);