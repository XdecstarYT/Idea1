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

-- ============================================================
-- Client accounts (added for the client portal at /account.html)
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '' check (char_length(full_name) <= 120),
  business text not null default '' check (char_length(business) <= 160),
  phone text not null default '' check (char_length(phone) <= 40),
  created_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  url text not null default '',
  mockup_url text not null default '',
  package text not null default '',
  status text not null default 'mockup' check (status in ('mockup', 'building', 'review', 'live', 'paused')),
  plan text not null default 'monthly' check (plan in ('monthly', 'upfront')),
  price integer,
  next_payment date,
  client_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sites_client_idx on public.sites (client_id);

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  details text not null default '' check (char_length(details) <= 4000),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  owner_reply text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index change_requests_client_idx on public.change_requests (client_id);
create index change_requests_site_idx on public.change_requests (site_id);

create trigger sites_touch before update on public.sites
  for each row execute function public.touch_updated_at();
create trigger change_requests_touch before update on public.change_requests
  for each row execute function public.touch_updated_at();

-- Create a profile automatically when someone signs up
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, business, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 120),
    left(coalesce(new.raw_user_meta_data ->> 'business', ''), 160),
    left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.change_requests enable row level security;

create policy "Users read own profile, admins read all" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select private.is_admin()));
create policy "Users update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Clients read own sites, admins read all" on public.sites
  for select to authenticated using (client_id = (select auth.uid()) or (select private.is_admin()));
create policy "Admins add sites" on public.sites
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins edit sites" on public.sites
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete sites" on public.sites
  for delete to authenticated using ((select private.is_admin()));

create policy "Clients read own requests, admins read all" on public.change_requests
  for select to authenticated using (client_id = (select auth.uid()) or (select private.is_admin()));
create policy "Clients request changes to their own sites" on public.change_requests
  for insert to authenticated with check (
    client_id = (select auth.uid())
    and status = 'open'
    and owner_reply = ''
    and exists (select 1 from public.sites s where s.id = site_id and s.client_id = (select auth.uid()))
  );
create policy "Admins update requests" on public.change_requests
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete requests" on public.change_requests
  for delete to authenticated using ((select private.is_admin()));

revoke all on public.profiles, public.sites, public.change_requests from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, business, phone) on public.profiles to authenticated;
grant select, insert, update, delete on public.sites to authenticated;
grant select, insert, update, delete on public.change_requests to authenticated;

-- ============================================================
-- Site builder designs and client chat
-- ============================================================

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Homepage' check (char_length(name) between 1 and 120),
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'changes_requested')),
  client_feedback text not null default '' check (char_length(client_feedback) <= 4000),
  sent_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index designs_site_idx on public.designs (site_id);
create index designs_client_idx on public.designs (client_id);
create trigger designs_touch before update on public.designs
  for each row execute function public.touch_updated_at();

-- Clients may only record their decision on a design that's waiting for their review
create or replace function private.guard_design_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select private.is_admin()) then
    return new;
  end if;
  if old.status <> 'in_review'
     or new.status not in ('approved', 'changes_requested')
     or new.content is distinct from old.content
     or new.name is distinct from old.name
     or new.site_id is distinct from old.site_id
     or new.client_id is distinct from old.client_id
     or new.sent_at is distinct from old.sent_at then
    raise exception 'Clients can only approve or request changes on a design under review';
  end if;
  new.reviewed_at = now();
  return new;
end;
$$;
create trigger designs_guard before update on public.designs
  for each row execute function private.guard_design_review();

alter table public.designs enable row level security;
create policy "Clients read designs sent to them, admins read all" on public.designs
  for select to authenticated using ((client_id = (select auth.uid()) and status <> 'draft') or (select private.is_admin()));
create policy "Admins add designs" on public.designs
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins edit designs, clients review theirs" on public.designs
  for update to authenticated
  using ((select private.is_admin()) or (client_id = (select auth.uid()) and status = 'in_review'))
  with check ((select private.is_admin()) or (client_id = (select auth.uid()) and status in ('approved', 'changes_requested')));
create policy "Admins delete designs" on public.designs
  for delete to authenticated using ((select private.is_admin()));
revoke all on public.designs from anon, authenticated;
grant select, insert, update, delete on public.designs to authenticated;

-- Chat between the owner and each client (one conversation per client)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_client_created_idx on public.messages (client_id, created_at);

alter table public.messages enable row level security;
create policy "Clients read their conversation, admins read all" on public.messages
  for select to authenticated using (client_id = (select auth.uid()) or (select private.is_admin()));
create policy "Clients and admins send messages as themselves" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and read_at is null
    and (client_id = (select auth.uid()) or (select private.is_admin()))
  );
create policy "Mark messages in your conversation as read" on public.messages
  for update to authenticated
  using (client_id = (select auth.uid()) or (select private.is_admin()))
  with check (client_id = (select auth.uid()) or (select private.is_admin()));
revoke all on public.messages from anon, authenticated;
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

-- Live updates for chat and design reviews
alter publication supabase_realtime add table public.messages, public.designs;

-- ============================================================
-- Designs for prospects, shared by private review link
-- ============================================================

alter table public.designs alter column site_id drop not null;
alter table public.designs alter column client_id drop not null;
alter table public.designs add column prospect_name text not null default '' check (char_length(prospect_name) <= 120);
alter table public.designs add column prospect_contact text not null default '' check (char_length(prospect_contact) <= 120);
alter table public.designs add column prospect_email text not null default '' check (char_length(prospect_email) <= 200);
alter table public.designs add column share_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex');
alter table public.designs add column shared boolean not null default false;
alter table public.designs add column reviewer_name text not null default '' check (char_length(reviewer_name) <= 120);

-- The review guard (private.guard_design_review) also blocks clients from changing
-- share_token, shared, prospect_name, prospect_contact and prospect_email.

-- Anyone holding an active link can view that one design (intentionally callable without signing in)
create or replace function public.get_shared_design(p_token text)
returns table (name text, content jsonb, status text, prospect_name text, client_feedback text)
language sql
stable
security definer
set search_path = ''
as $$
  select d.name, d.content, d.status, d.prospect_name, d.client_feedback
  from public.designs d
  where d.share_token = p_token and d.shared and p_token is not null and char_length(p_token) = 36;
$$;

-- ...and approve it or request changes while it's waiting for review
create or replace function public.review_shared_design(p_token text, p_decision text, p_feedback text, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  d_id uuid;
begin
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'Invalid decision';
  end if;
  if p_decision = 'changes_requested' and char_length(btrim(coalesce(p_feedback, ''))) = 0 then
    raise exception 'Please describe the changes';
  end if;
  select id into d_id from public.designs
   where share_token = p_token and shared and status = 'in_review' and char_length(p_token) = 36
   for update;
  if d_id is null then
    raise exception 'This design is not waiting for review';
  end if;
  update public.designs
     set status = p_decision,
         client_feedback = left(coalesce(p_feedback, ''), 4000),
         reviewer_name = left(coalesce(p_name, ''), 120),
         reviewed_at = now()
   where id = d_id;
  return p_decision;
end;
$$;

revoke execute on function public.get_shared_design(text) from public;
revoke execute on function public.review_shared_design(text, text, text, text) from public;
grant execute on function public.get_shared_design(text) to anon, authenticated;
grant execute on function public.review_shared_design(text, text, text, text) to anon, authenticated;

-- ---------- Design emails (sent by the send-email edge function) ----------
create table if not exists public.design_emails (
  id uuid primary key default gen_random_uuid(),
  design_id uuid references public.designs(id) on delete cascade,
  kind text not null check (kind in ('share','portal')),
  to_email text not null,
  to_name text,
  status text not null default 'sent' check (status in ('sent','failed')),
  error text,
  provider_id text,
  sent_by uuid,
  created_at timestamptz not null default now()
);
alter table public.design_emails enable row level security;
create policy "owner reads email log" on public.design_emails for select to authenticated using (private.is_admin());
create index if not exists design_emails_design_idx on public.design_emails (design_id, created_at desc);
