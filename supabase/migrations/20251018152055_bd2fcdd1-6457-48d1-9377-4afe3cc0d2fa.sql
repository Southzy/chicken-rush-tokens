-- Enable realtime for profiles table to track leaderboard changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;