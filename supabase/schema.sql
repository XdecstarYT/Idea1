-- Marshall Web Co. database (Supabase project "marshall-web-co", Sydney).
-- This is the schema as it stands in production, kept here so it can be recreated.
-- The owner login is NOT created here: create the user in Supabase (Authentication → Users → Add user),
-- then give them owner access with:
--   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';

-- Who may use the owner panel
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Admin check lives outside the API-exposed schema
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- Packages, care plans and add-ons shown on the public site
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind text not null check (kind in ('package', 'care', 'addon')),
  name text not null,
  tagline text not null default '',
  price_upfront integer,
  price_monthly integer,
  delivery text not null default '',
  features text[] not null default '{}',
  badge text,
  featured boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

-- One-row table of site-wide settings
create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  founding_seats_left integer not null default 5 check (founding_seats_left between 0 and 5),
  founding_discount integer not null default 40 check (founding_discount between 0 and 100),
  announcement text not null default '',
  show_announcement boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Enquiries from the contact form
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  business text not null check (char_length(business) between 1 and 160),
  phone text not null check (char_length(phone) between 6 and 40),
  email text check (email is null or char_length(email) <= 200),
  website text check (website is null or char_length(website) <= 300),
  industry text check (industry is null or char_length(industry) <= 60),
  package text check (package is null or char_length(package) <= 60),
  message text check (message is null or char_length(message) <= 4000),
  status text not null default 'new' check (status in ('new', 'contacted', 'mockup', 'proposal', 'won', 'lost')),
  notes text not null default ''
);

create index leads_created_at_idx on public.leads (created_at desc);
create index products_kind_sort_idx on public.products (kind, sort);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- Row level security
alter table public.admins enable row level security;
alter table public.products enable row level security;
alter table public.site_settings enable row level security;
alter table public.leads enable row level security;

create policy "Admins can see their own admin row" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Anyone can read active products" on public.products
  for select to anon, authenticated using (active or (select private.is_admin()));
create policy "Admins can add products" on public.products
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can edit products" on public.products
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete products" on public.products
  for delete to authenticated using ((select private.is_admin()));

create policy "Anyone can read site settings" on public.site_settings
  for select to anon, authenticated using (true);
create policy "Admins can edit site settings" on public.site_settings
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Anyone can submit a lead" on public.leads
  for insert to anon, authenticated with check (status = 'new' and notes = '');
create policy "Admins can read leads" on public.leads
  for select to authenticated using ((select private.is_admin()));
create policy "Admins can update leads" on public.leads
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete leads" on public.leads
  for delete to authenticated using ((select private.is_admin()));

-- Data API privileges (row level security still decides which rows)
revoke all on public.products, public.site_settings, public.leads, public.admins from anon, authenticated;
grant select on public.products, public.site_settings to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant update on public.site_settings to authenticated;
grant insert on public.leads to anon, authenticated;
grant select, update, delete on public.leads to authenticated;
grant select on public.admins to authenticated;

-- Starting data: see site/data.json for the same values
insert into public.site_settings (id, founding_seats_left, founding_discount, announcement)
values (1, 5, 40, 'Founding client offer: 40% off for our first 5 clients.');
