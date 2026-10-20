-- ====================================================================
-- Orbit Migration: Add Missing Profiles INSERT Policy & Backfill Trigger
-- ====================================================================

-- 1. Allow authenticated users to INSERT their own profile row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 2. Backfill existing auth.users into public.profiles if any are missing
INSERT INTO public.profiles (id, username, display_name, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'username',
    'user_' || substr(u.id::text, 1, 8)
  ) AS username,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1),
    'Orbit Explorer'
  ) AS display_name,
  timezone('utc'::text, now()),
  timezone('utc'::text, now())
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 3. Backfill current_locations default row
INSERT INTO public.current_locations (owner_id, sharing_enabled, updated_at)
SELECT u.id, false, timezone('utc'::text, now())
FROM auth.users u
ON CONFLICT (owner_id) DO NOTHING;

-- 4. Backfill presence_preferences default row
INSERT INTO public.presence_preferences (owner_id, morphed_presence_enabled, updated_at)
SELECT u.id, false, timezone('utc'::text, now())
FROM auth.users u
ON CONFLICT (owner_id) DO NOTHING;
