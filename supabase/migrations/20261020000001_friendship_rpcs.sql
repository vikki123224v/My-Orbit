-- ====================================================================
-- Helper RPC functions for robust, transactional friendship operations
-- ====================================================================

-- Function to accept a friend request and create a canonical friendship in a single transaction
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_request RECORD;
  v_user_a UUID;
  v_user_b UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch request ensuring the caller is the intended receiver
  SELECT * INTO v_request
  FROM public.friend_requests
  WHERE id = p_request_id AND receiver_id = v_caller_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not pending for this user';
  END IF;

  -- Mark request accepted
  UPDATE public.friend_requests
  SET status = 'accepted', updated_at = timezone('utc'::text, now())
  WHERE id = p_request_id;

  -- Determine canonical order (user_a < user_b)
  IF v_request.sender_id < v_caller_id THEN
    v_user_a := v_request.sender_id;
    v_user_b := v_caller_id;
  ELSE
    v_user_a := v_caller_id;
    v_user_b := v_request.sender_id;
  END IF;

  -- Insert canonical friendship row if not already existing
  INSERT INTO public.friendships (user_a_id, user_b_id, created_at)
  VALUES (v_user_a, v_user_b, timezone('utc'::text, now()))
  ON CONFLICT (user_a_id, user_b_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'user_a_id', v_user_a, 'user_b_id', v_user_b);
END;
$$;

-- Function to safely remove a friendship and clean up directional permissions
CREATE OR REPLACE FUNCTION public.remove_friendship(p_friend_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_user_a UUID;
  v_user_b UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller_id < p_friend_id THEN
    v_user_a := v_caller_id;
    v_user_b := p_friend_id;
  ELSE
    v_user_a := p_friend_id;
    v_user_b := v_caller_id;
  END IF;

  -- Delete friendship
  DELETE FROM public.friendships
  WHERE user_a_id = v_user_a AND user_b_id = v_user_b;

  -- Clean up any location permissions between these two users
  DELETE FROM public.location_sharing_permissions
  WHERE (owner_id = v_caller_id AND viewer_id = p_friend_id)
     OR (owner_id = p_friend_id AND viewer_id = v_caller_id);

  -- Clean up any friend requests between these two users
  DELETE FROM public.friend_requests
  WHERE (sender_id = v_caller_id AND receiver_id = p_friend_id)
     OR (sender_id = p_friend_id AND receiver_id = v_caller_id);

  RETURN jsonb_build_object('success', true);
END;
$$;
