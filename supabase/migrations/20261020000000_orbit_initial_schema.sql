-- ====================================================================
-- Orbit — Find Your People
-- PostgreSQL Database Schema & Security Architecture
-- ====================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT username_length_check CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT username_format_check CHECK (username ~* '^[a-z0-9_]+$')
);

-- Index for fast user search
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING btree (username);

-- 2. Friend Requests Table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT no_self_request CHECK (sender_id <> receiver_id),
  CONSTRAINT unique_pending_request UNIQUE (sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id, status);

-- 3. Canonical Friendships Table
-- Canonical invariant: user_a_id < user_b_id always enforced
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT friendship_canonical_order CHECK (user_a_id < user_b_id),
  CONSTRAINT unique_friendship UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON public.friendships(user_a_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON public.friendships(user_b_id);

-- 4. Location Sharing Permissions (Directional: owner_id grants to viewer_id)
CREATE TABLE IF NOT EXISTS public.location_sharing_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT no_self_permission CHECK (owner_id <> viewer_id),
  CONSTRAINT unique_owner_viewer_permission UNIQUE (owner_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_loc_perms_owner ON public.location_sharing_permissions(owner_id);
CREATE INDEX IF NOT EXISTS idx_loc_perms_viewer ON public.location_sharing_permissions(viewer_id);

-- 5. Current Locations (Strictly Protected: 1 row per owner)
CREATE TABLE IF NOT EXISTS public.current_locations (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy_meters DOUBLE PRECISION,
  sharing_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT valid_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT valid_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

-- 6. Presence Preferences (Morphed Presence Privacy Mode)
CREATE TABLE IF NOT EXISTS public.presence_preferences (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  morphed_presence_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Automatic Profile Creation Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
BEGIN
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || substr(NEW.id::text, 1, 8)
  );
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    v_username
  );

  INSERT INTO public.profiles (id, username, display_name, created_at, updated_at)
  VALUES (NEW.id, v_username, v_display_name, timezone('utc'::text, now()), timezone('utc'::text, now()))
  ON CONFLICT (id) DO NOTHING;

  -- Default presence preferences
  INSERT INTO public.presence_preferences (owner_id, morphed_presence_enabled, updated_at)
  VALUES (NEW.id, false, timezone('utc'::text, now()))
  ON CONFLICT (owner_id) DO NOTHING;

  -- Default location entry (OFF by default)
  INSERT INTO public.current_locations (owner_id, sharing_enabled, updated_at)
  VALUES (NEW.id, false, timezone('utc'::text, now()))
  ON CONFLICT (owner_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS) across all user tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_sharing_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence_preferences ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Friend Requests Policies
CREATE POLICY "Users can view requests they sent or received"
  ON public.friend_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create requests sent by themselves"
  ON public.friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can update request status"
  ON public.friend_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "Senders can cancel their own outgoing requests"
  ON public.friend_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Friendships Policies
CREATE POLICY "Participants can view their friendships"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Participants can remove a friendship"
  ON public.friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Location Sharing Permissions Policies
CREATE POLICY "Owners and viewers can see directional permission status"
  ON public.location_sharing_permissions FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = viewer_id);

CREATE POLICY "Only the owner can insert or grant permission"
  ON public.location_sharing_permissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Only the owner can update or revoke permission"
  ON public.location_sharing_permissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Only the owner can delete permission"
  ON public.location_sharing_permissions FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Current Locations Policies
-- The raw table is strictly accessible ONLY by the owner for writes & own reads
CREATE POLICY "Owner can view own raw location"
  ON public.current_locations FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner can update own location"
  ON public.current_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can insert own location"
  ON public.current_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Presence Preferences Policies
CREATE POLICY "Owner can view own presence preferences"
  ON public.presence_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner can update own presence preferences"
  ON public.presence_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Secure RPC: Fetch Authorized Friend Locations
-- Returns coordinates ONLY IF:
-- 1. Mutual friendship exists
-- 2. Owner granted explicit permission to caller
-- 3. Owner currently has sharing_enabled = true
-- 4. Location is not stale (< 15 mins)
-- If morphed_presence is active, coordinates are masked to NULL to guarantee zero leak.
CREATE OR REPLACE FUNCTION public.get_authorized_friend_locations()
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy_meters DOUBLE PRECISION,
  last_updated TIMESTAMPTZ,
  sharing_enabled BOOLEAN,
  morphed_presence BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS friend_id,
    p.username,
    p.display_name,
    p.avatar_url,
    -- Strict zero leak: if morphed presence is enabled, coordinates are replaced with NULL
    CASE
      WHEN COALESCE(pp.morphed_presence_enabled, false) = true THEN NULL
      ELSE loc.latitude
    END AS latitude,
    CASE
      WHEN COALESCE(pp.morphed_presence_enabled, false) = true THEN NULL
      ELSE loc.longitude
    END AS longitude,
    CASE
      WHEN COALESCE(pp.morphed_presence_enabled, false) = true THEN NULL
      ELSE loc.accuracy_meters
    END AS accuracy_meters,
    loc.updated_at AS last_updated,
    COALESCE(loc.sharing_enabled, false) AS sharing_enabled,
    COALESCE(pp.morphed_presence_enabled, false) AS morphed_presence
  FROM public.friendships f
  -- Identify friend ID
  JOIN public.profiles p ON (
    p.id = CASE WHEN f.user_a_id = v_caller_id THEN f.user_b_id ELSE f.user_a_id END
  )
  -- Must have explicit permission granted by the friend to caller
  JOIN public.location_sharing_permissions perm ON (
    perm.owner_id = p.id AND perm.viewer_id = v_caller_id AND perm.enabled = true
  )
  -- Join friend's current location (must be actively sharing and within 15 minutes)
  JOIN public.current_locations loc ON (
    loc.owner_id = p.id AND loc.sharing_enabled = true
  )
  LEFT JOIN public.presence_preferences pp ON pp.owner_id = p.id
  WHERE (f.user_a_id = v_caller_id OR f.user_b_id = v_caller_id)
    AND loc.updated_at >= (now() - INTERVAL '15 minutes');
END;
$$;
