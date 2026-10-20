-- ====================================================================
-- Add missing INSERT policy for presence_preferences
-- ====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'presence_preferences' 
      AND policyname = 'Owner can insert own presence preferences'
  ) THEN
    CREATE POLICY "Owner can insert own presence preferences"
      ON public.presence_preferences FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;
