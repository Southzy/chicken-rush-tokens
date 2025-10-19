-- Create game sessions table for Mines game
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_amount INTEGER NOT NULL,
  mine_count INTEGER NOT NULL CHECK (mine_count BETWEEN 1 AND 24),
  server_seed TEXT NOT NULL,
  server_seed_hash TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  nonce INTEGER NOT NULL DEFAULT 0,
  mine_positions INTEGER[] NOT NULL,
  revealed_tiles INTEGER[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own game sessions
CREATE POLICY "Users can view their own game sessions"
  ON public.game_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions"
  ON public.game_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game sessions"
  ON public.game_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own game sessions"
  ON public.game_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_game_sessions_game_id ON public.game_sessions(game_id);
CREATE INDEX idx_game_sessions_user_id ON public.game_sessions(user_id, is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_game_sessions_updated_at
  BEFORE UPDATE ON public.game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Clean up old inactive sessions (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_game_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.game_sessions
  WHERE is_active = false
    AND updated_at < NOW() - INTERVAL '1 hour';
END;
$$;