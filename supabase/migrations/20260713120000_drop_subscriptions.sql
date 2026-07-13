-- Polar.sh billing was removed from the app; nothing reads or writes
-- public.subscriptions anymore, so drop it along with its trigger and policies.
drop table if exists public.subscriptions cascade;

-- set_updated_at() was only ever attached to public.subscriptions.
drop function if exists public.set_updated_at();
