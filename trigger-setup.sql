-- Run this in Supabase SQL Editor to add the trigger for auto profile creation

-- First check if profiles table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'profiles';

-- Create the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, trial_end, plan, chars_used)
  VALUES (
    NEW.id,
    NOW() + INTERVAL '3 days',
    'trial',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
