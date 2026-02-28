-- ============================================================
-- FitCore — Fix handle_new_user trigger
-- Prevents coach row creation when a CLIENT auth user is created
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Skip coach creation if user has role='client' in metadata
  IF new.raw_user_meta_data->>'role' = 'client' THEN
    RETURN new;
  END IF;
  INSERT INTO public.coaches (id, email, name)
  VALUES (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
