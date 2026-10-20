-- ====================================================================
-- Update get_authorized_friend_locations RPC:
-- 1. Extend staleness window to 24 hours so friends don't disappear if inactive for a few minutes
-- 2. Ensure non-null coordinates are returned when sharing_enabled = true
-- ====================================================================

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
  -- Join friend's current location (must have sharing_enabled = true and non-null coordinates)
  JOIN public.current_locations loc ON (
    loc.owner_id = p.id 
    AND loc.sharing_enabled = true 
    AND loc.latitude IS NOT NULL 
    AND loc.longitude IS NOT NULL
  )
  LEFT JOIN public.presence_preferences pp ON pp.owner_id = p.id
  WHERE (f.user_a_id = v_caller_id OR f.user_b_id = v_caller_id)
    AND loc.updated_at >= (now() - INTERVAL '24 hours');
END;
$$;
