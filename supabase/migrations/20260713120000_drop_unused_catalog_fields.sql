-- Drop catalog columns nothing on the site reads anymore.
alter table public.collections drop column readme;
alter table public.collections drop column install_count;
alter table public.skills drop column example;
alter table public.skills drop column external_links;
