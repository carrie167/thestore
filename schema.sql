-- The Store: schema setup
-- Run this in the Supabase SQL Editor for your new project.

-- ───────────────────────────────────────────
-- 0. Households
-- For now, every user gets their own household automatically (see trigger
-- below), so behavior matches "everyone gets their own private list."
-- Later, to share with your daughter: add her user_id to YOUR household_id
-- in household_members, and have her stop using her own auto-created
-- household. All the RLS policies below already check household
-- membership, not direct ownership, so sharing "just works" once that's
-- in place — no table changes needed.
-- ───────────────────────────────────────────
create table households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_id_idx on household_members(user_id);

-- Auto-create a household for every new user, so existing code that
-- creates inventory/list items immediately has a household_id to use.
create or replace function public.handle_new_user_household()
returns trigger as $$
declare
  new_household_id uuid;
begin
  insert into households default values returning id into new_household_id;
  insert into household_members (household_id, user_id) values (new_household_id, new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_household
  after insert on auth.users
  for each row execute function public.handle_new_user_household();

-- Helper: all household_ids the current user belongs to
create or replace function public.my_household_ids()
returns setof uuid as $$
  select household_id from household_members where user_id = auth.uid();
$$ language sql security definer stable;

-- ───────────────────────────────────────────
-- 1. Store sections (walking order through Harmons)
-- ───────────────────────────────────────────
create table store_sections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  sort_order int not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────────────────────────
-- 2. Inventory items (the master list)
-- ───────────────────────────────────────────
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  section_id uuid references store_sections(id) on delete set null,
  est_price numeric(10,2),
  price_updated_at timestamptz,
  price_is_estimate boolean not null default true,
  is_staple boolean not null default false,
  created_at timestamptz not null default now()
);

create index inventory_items_household_id_idx on inventory_items(household_id);
create index inventory_items_section_id_idx on inventory_items(section_id);

-- ───────────────────────────────────────────
-- 3. Lists
-- A household can have multiple lists: one "Shared" list everyone in the
-- household can see and edit, plus one personal list per member that only
-- that member (and anyone else explicitly given access) uses. This is what
-- lets you and your daughter each have your own list AND a shared one.
--
-- kind = 'shared'   → owner_id is null, visible to the whole household
-- kind = 'personal' → owner_id is the user it belongs to
-- ───────────────────────────────────────────
create table lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('shared', 'personal')),
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint personal_lists_have_owner check (
    (kind = 'personal' and owner_id is not null) or
    (kind = 'shared' and owner_id is null)
  )
);

create index lists_household_id_idx on lists(household_id);

-- Every household gets one "Shared" list as soon as it's created.
create or replace function public.handle_new_household_shared_list()
returns trigger as $$
begin
  insert into lists (household_id, name, kind) values (new.id, 'Shared', 'shared');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_household_created_shared_list
  after insert on households
  for each row execute function public.handle_new_household_shared_list();

-- Every household member gets their own personal list as soon as they join.
-- NOTE: if you move your daughter from her own auto-created household into
-- yours (the sharing step), this trigger fires again and gives her a fresh
-- "My List" inside your household — that's intended, since her personal
-- list should live wherever her current household is. Her old household
-- (and its now-orphaned personal list) can be left alone or cleaned up;
-- it won't be reachable once she's no longer a member of it.
create or replace function public.handle_new_member_personal_list()
returns trigger as $$
begin
  insert into lists (household_id, name, kind, owner_id)
  values (new.household_id, 'My List', 'personal', new.user_id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_member_joined_personal_list
  after insert on household_members
  for each row execute function public.handle_new_member_personal_list();

-- ───────────────────────────────────────────
-- 4. Items on a list (shared or personal)
-- ───────────────────────────────────────────
create table list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  inventory_item_id uuid references inventory_items(id) on delete set null,
  -- snapshot fields so the list still reads fine even if the inventory item changes later
  name text not null,
  section_id uuid references store_sections(id) on delete set null,
  est_price numeric(10,2),
  is_checked boolean not null default false,
  added_by uuid references auth.users(id),
  added_at timestamptz not null default now()
);

create index list_items_list_id_idx on list_items(list_id);

-- ───────────────────────────────────────────
-- Row Level Security
-- Scoped to household membership (via my_household_ids()), not direct
-- ownership — this is what makes sharing with your daughter later just
-- a matter of adding her to household_members, with zero policy changes.
--
-- Lists add one more wrinkle: a personal list should only be usable by its
-- owner, even though everyone in the household can technically see it's
-- there (e.g. to eventually support "view a family member's list"). For now
-- we keep it simple: household members can see all lists in the household,
-- but can only insert/update/delete items on a personal list if they own
-- it, or on a shared list (kind = 'shared').
-- ───────────────────────────────────────────
alter table households enable row level security;
alter table household_members enable row level security;
alter table store_sections enable row level security;
alter table inventory_items enable row level security;
alter table lists enable row level security;
alter table list_items enable row level security;

create policy "view own household" on households
  for select using (id in (select my_household_ids()));

create policy "view own membership rows" on household_members
  for select using (user_id = auth.uid() or household_id in (select my_household_ids()));

create policy "household sections" on store_sections
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy "household inventory" on inventory_items
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy "view household lists" on lists
  for select using (household_id in (select my_household_ids()));

create policy "edit accessible lists" on lists
  for update using (
    household_id in (select my_household_ids())
    and (kind = 'shared' or owner_id = auth.uid())
  );

create policy "delete own personal lists" on lists
  for delete using (kind = 'personal' and owner_id = auth.uid());

-- Helper: list_ids the current user is allowed to add/check/remove items on
-- (the household's shared list, plus their own personal list).
create or replace function public.my_accessible_list_ids()
returns setof uuid as $$
  select id from lists
  where household_id in (select my_household_ids())
    and (kind = 'shared' or owner_id = auth.uid());
$$ language sql security definer stable;

create policy "accessible list items" on list_items
  for all using (list_id in (select my_accessible_list_ids()))
  with check (list_id in (select my_accessible_list_ids()));

-- ───────────────────────────────────────────
-- Real-time: enable on list_items so checks/adds sync live
-- ───────────────────────────────────────────
alter publication supabase_realtime add table list_items;
