-- Migration: Fix Google OAuth users missing presence_preferences and current_locations rows
-- Also adds missing INSERT RLS policy for presence_preferences

-- Ensure INSERT policy exists for presence_preferences (previously only SELECT/UPDATE were defined)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'presence_preferences' AND policyname = 'Owner can insert own presence preferences'
  ) THEN
    EXECUTE 'CREATE POLICY "Owner can insert own presence preferences"
      ON public.presence_preferences FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = owner_id)';
  END IF;
END $$;

-- Ensure INSERT policy exists for current_locations (upsert requires insert + update)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'current_locations' AND policyname = 'Owner can insert own location'
  ) THEN
    EXECUTE 'CREATE POLICY "Owner can insert own location"
      ON public.current_locations FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = owner_id)';
  END IF;
END $$;

-- Update handle_new_user trigger to also handle Google OAuth metadata fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Build username: prefer explicit metadata, fall back to email prefix or random suffix
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    regexp_replace(
      COALESCE(
        split_part(NEW.email, '@', 1),
        'user'
      ),
      '[^a-z0-9_]', '_', 'g'
    )
  );
  -- Ensure minimum length and uniqueness suffix
  IF char_length(v_username) < 3 THEN
    v_username := v_username || '_' || substr(NEW.id::text, 1, 6);
  END IF;
  -- Truncate to 20 chars
  v_username := substr(lower(v_username), 1, 20);

  -- Display name from Google OAuth full_name or name, fallback to email prefix
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1),
    v_username
  );

  -- Avatar from Google OAuth picture field
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at, updated_at)
  VALUES (NEW.id, v_username, v_display_name, v_avatar_url, timezone('utc'::text, now()), timezone('utc'::text, now()))
  ON CONFLICT (id) DO UPDATE SET
    avatar_url = EXCLUDED.avatar_url,
    display_name = CASE 
      WHEN profiles.display_name = profiles.username THEN EXCLUDED.display_name 
      ELSE profiles.display_name 
    END,
    updated_at = timezone('utc'::text, now());

  -- Default presence preferences row
  INSERT INTO public.presence_preferences (owner_id, morphed_presence_enabled, updated_at)
  VALUES (NEW.id, false, timezone('utc'::text, now()))
  ON CONFLICT (owner_id) DO NOTHING;

  -- Default location row (sharing OFF)
  INSERT INTO public.current_locations (owner_id, sharing_enabled, updated_at)
  VALUES (NEW.id, false, timezone('utc'::text, now()))
  ON CONFLICT (owner_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Back-fill presence_preferences and current_locations for any existing users missing them
INSERT INTO public.presence_preferences (owner_id, morphed_presence_enabled, updated_at)
SELECT id, false, timezone('utc'::text, now())
FROM public.profiles
WHERE id NOT IN (SELECT owner_id FROM public.presence_preferences)
ON CONFLICT (owner_id) DO NOTHING;

INSERT INTO public.current_locations (owner_id, sharing_enabled, updated_at)
SELECT id, false, timezone('utc'::text, now())
FROM public.profiles
WHERE id NOT IN (SELECT owner_id FROM public.current_locations)
ON CONFLICT (owner_id) DO NOTHING;
