-- Enable Supabase Realtime for the profiles table.
-- Required so the AuthContext subscription (profile-sync channel) receives
-- UPDATE events when an admin changes a user's role from another session.
-- RLS remains active: each client only subscribes to its own row
-- (filter: id=eq.<user_id>), so no cross-user data leaks.
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
