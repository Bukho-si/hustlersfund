-- Allow admins to delete member profiles
CREATE POLICY "Admins can delete profiles"
ON public.member_profiles
FOR DELETE
USING (is_admin(auth.uid()));

-- Allow admins to delete user roles (for cleanup when deleting members)
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (is_admin(auth.uid()));