-- Update RLS policy for profiles to allow all users to view all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "All users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);