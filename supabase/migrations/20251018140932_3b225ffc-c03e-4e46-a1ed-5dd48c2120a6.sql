-- ============================================================================
-- Schema v2 (safe, backwards-compatible behavior)
-- - เปลี่ยนคอลัมน์เงินจาก INTEGER -> NUMERIC(38,0) (กัน overflow)
-- - เพิ่ม CHECK กันค่าติดลบ
-- - คง RLS / Policies เดิม เพื่อไม่ให้ front-end พัง
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum for user roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('user', 'admin');
  END IF;
END $$;

-- Create rank enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_rank') THEN
    CREATE TYPE public.user_rank AS ENUM ('nova_cadet', 'quantum_ranger', 'cyber_warden', 'celestial_overlord', 'eclipse_titan');
  END IF;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  token_balance NUMERIC(38,0) NOT NULL DEFAULT 1000,  -- << เปลี่ยนเป็น NUMERIC
  rank user_rank NOT NULL DEFAULT 'nova_cadet',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT chk_profiles_balance_nonneg CHECK (token_balance >= 0) -- กันค่าติดลบ
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create game_history table
CREATE TABLE IF NOT EXISTS public.game_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bet_amount NUMERIC(38,0) NOT NULL,      -- << เปลี่ยนเป็น NUMERIC
  multiplier DECIMAL(10, 2) NOT NULL,
  profit NUMERIC(38,0) NOT NULL,          -- << เปลี่ยนเป็น NUMERIC
  difficulty TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT chk_game_history_bet_nonneg CHECK (bet_amount >= 0),
  CONSTRAINT chk_game_history_profit_nonneg CHECK (profit >= 0)
);

-- Useful indexes (ไม่กระทบพฤติกรรมเดิม)
CREATE INDEX IF NOT EXISTS idx_game_history_user_created
  ON public.game_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_roles_user
  ON public.user_roles (user_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (คงพฤติกรรมเดิม)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can view their own profile'
      AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can update their own profile'
      AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;

-- RLS Policies for user_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can view their own roles'
      AND tablename = 'user_roles'
  ) THEN
    CREATE POLICY "Users can view their own roles"
      ON public.user_roles FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS Policies for game_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can view their own game history'
      AND tablename = 'game_history'
  ) THEN
    CREATE POLICY "Users can view their own game history"
      ON public.game_history FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can insert their own game history'
      AND tablename = 'game_history'
  ) THEN
    CREATE POLICY "Users can insert their own game history"
      ON public.game_history FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, token_balance, rank)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    1000,
    'nova_cadet'
  );

  -- Give user role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at'
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Function to check if user has a role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =====================================================================
-- If you already created the original schema and want a migration-only:
--   รันเฉพาะบล็อก ALTER ด้านล่างแทนการสร้างตารางใหม่
-- =====================================================================
-- ALTER TABLE public.profiles
--   ALTER COLUMN token_balance TYPE NUMERIC(38,0) USING token_balance::numeric;
-- ALTER TABLE public.game_history
--   ALTER COLUMN bet_amount TYPE NUMERIC(38,0) USING bet_amount::numeric;
-- ALTER TABLE public.game_history
--   ALTER COLUMN profit TYPE NUMERIC(38,0) USING profit::numeric;
-- ALTER TABLE public.profiles
--   ADD CONSTRAINT IF NOT EXISTS chk_profiles_balance_nonneg CHECK (token_balance >= 0);
-- ALTER TABLE public.game_history
--   ADD CONSTRAINT IF NOT EXISTS chk_game_history_bet_nonneg CHECK (bet_amount >= 0);
-- ALTER TABLE public.game_history
--   ADD CONSTRAINT IF NOT EXISTS chk_game_history_profit_nonneg CHECK (profit >= 0);
-- CREATE INDEX IF NOT EXISTS idx_game_history_user_created ON public.game_history (user_id, created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id);
