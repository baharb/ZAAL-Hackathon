-- In-app account deletion (App Store guideline 5.1.1(v)).
--
-- Run this ONCE in the Supabase dashboard -> SQL Editor for the project the
-- app's EXPO_PUBLIC_SUPABASE_URL points at. The app calls it via
-- supabase.rpc('delete_my_account') from Settings -> Delete account
-- (src/services/accountActivation.ts). Without it, deletion fails with a
-- "function not found" error and the app shows "couldn't reach the server".
--
-- SECURITY DEFINER lets an authenticated user delete their OWN auth.users
-- row (and only that row: id = auth.uid()); anon cannot call it at all.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
