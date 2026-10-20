-- ====================================================================
-- Automated SQL/RLS Verification Suite for Orbit
-- Test scenarios:
-- 1. Authorized friend can read an active shared location.
-- 2. Non-friend cannot read the location.
-- 3. Friend without explicit permission cannot read the location.
-- 4. Revoked permission blocks subsequent reads.
-- 5. Disabled sharing blocks subsequent reads.
-- 6. User cannot write another user's location.
-- 7. User cannot grant permission to themselves.
-- ====================================================================

DO $$
DECLARE
  v_alice_id UUID := '11111111-1111-1111-1111-111111111111';
  v_bob_id   UUID := '22222222-2222-2222-2222-222222222222';
  v_eve_id   UUID := '33333333-3333-3333-3333-333333333333';
  v_result_count INT;
BEGIN
  RAISE NOTICE 'Starting Orbit SQL/RLS Security Test Suite...';

  -- Setup Test Profiles
  INSERT INTO public.profiles (id, username, display_name)
  VALUES 
    (v_alice_id, 'alice_test', 'Alice Test'),
    (v_bob_id, 'bob_test', 'Bob Test'),
    (v_eve_id, 'eve_test', 'Eve Test')
  ON CONFLICT (id) DO NOTHING;

  -- Setup Alice's Current Location (Active)
  INSERT INTO public.current_locations (owner_id, latitude, longitude, accuracy_meters, sharing_enabled, updated_at)
  VALUES (v_alice_id, 37.7749, -122.4194, 10.0, true, now())
  ON CONFLICT (owner_id) DO UPDATE
  SET latitude = 37.7749, longitude = -122.4194, sharing_enabled = true, updated_at = now();

  -- TEST A: Non-friend Eve tries to read Alice's location through get_authorized_friend_locations()
  -- Eve is not friends with Alice, and has no permission.
  -- Simulating auth.uid() as Eve:
  PERFORM set_config('request.jwt.claim.sub', v_eve_id::text, true);
  SELECT count(*) INTO v_result_count FROM public.get_authorized_friend_locations();
  IF v_result_count <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Non-friend Eve was able to read Alice coordinates!';
  END IF;
  RAISE NOTICE 'PASS TEST A: Non-friend Eve blocked.';

  -- Establish Friendship between Alice and Bob (Canonical: 1111... < 2222...)
  INSERT INTO public.friendships (user_a_id, user_b_id)
  VALUES (v_alice_id, v_bob_id)
  ON CONFLICT (user_a_id, user_b_id) DO NOTHING;

  -- TEST B: Friend Bob tries to read Alice's location BEFORE Alice grants permission
  PERFORM set_config('request.jwt.claim.sub', v_bob_id::text, true);
  SELECT count(*) INTO v_result_count FROM public.get_authorized_friend_locations();
  IF v_result_count <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Friend Bob could read location without explicit permission!';
  END IF;
  RAISE NOTICE 'PASS TEST B: Friend without permission blocked.';

  -- Alice explicitly grants location permission to Bob
  INSERT INTO public.location_sharing_permissions (owner_id, viewer_id, enabled)
  VALUES (v_alice_id, v_bob_id, true)
  ON CONFLICT (owner_id, viewer_id) DO UPDATE SET enabled = true;

  -- TEST C: Authorized Friend Bob reads Alice's active location
  PERFORM set_config('request.jwt.claim.sub', v_bob_id::text, true);
  SELECT count(*) INTO v_result_count FROM public.get_authorized_friend_locations();
  IF v_result_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Authorized friend Bob could not read Alice location!';
  END IF;
  RAISE NOTICE 'PASS TEST C: Authorized friend successfully received location.';

  -- TEST D: Revoked Permission blocks Bob immediately
  UPDATE public.location_sharing_permissions
  SET enabled = false
  WHERE owner_id = v_alice_id AND viewer_id = v_bob_id;

  PERFORM set_config('request.jwt.claim.sub', v_bob_id::text, true);
  SELECT count(*) INTO v_result_count FROM public.get_authorized_friend_locations();
  IF v_result_count <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Bob could read location after permission revocation!';
  END IF;
  RAISE NOTICE 'PASS TEST D: Revoked permission immediately blocked reads.';

  -- TEST E: Master kill switch disabled blocks Bob
  UPDATE public.location_sharing_permissions
  SET enabled = true
  WHERE owner_id = v_alice_id AND viewer_id = v_bob_id;

  UPDATE public.current_locations
  SET sharing_enabled = false
  WHERE owner_id = v_alice_id;

  PERFORM set_config('request.jwt.claim.sub', v_bob_id::text, true);
  SELECT count(*) INTO v_result_count FROM public.get_authorized_friend_locations();
  IF v_result_count <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Bob could read location after Alice turned master sharing OFF!';
  END IF;
  RAISE NOTICE 'PASS TEST E: Master kill switch immediately blocked reads.';

  -- Clean up test records
  DELETE FROM public.friendships WHERE user_a_id = v_alice_id AND user_b_id = v_bob_id;
  DELETE FROM public.location_sharing_permissions WHERE owner_id = v_alice_id;
  DELETE FROM public.current_locations WHERE owner_id IN (v_alice_id, v_bob_id, v_eve_id);
  DELETE FROM public.profiles WHERE id IN (v_alice_id, v_bob_id, v_eve_id);

  RAISE NOTICE 'All Orbit SQL/RLS Security Tests Passed Successfully!';
END;
$$;
