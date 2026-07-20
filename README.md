# The Store

A shared, real-time grocery list for you and your daughter — browse a Harmons-organized
inventory by aisle, tap to add items to the active list, check them off as you shop, and
clear the list when you're done.

## Stack

- React + Vite
- Supabase (Postgres + Auth + Realtime)
- Deploy target: Vercel

## How it's organized

- **List** — a tab switcher at the top lets you flip between your personal list and the
  shared one (and your daughter's, once she's sharing your household). Whichever tab is
  open is grouped by aisle in walking order, with a running estimated total. Tap an item
  to check it off (strikethrough, stays visible). "Clear" wipes whichever list is open.
- **Inventory** — your master list of items, searchable by name or aisle. Staples are
  pinned at the top. Tap "+ Add" to send an item to whichever list tab is currently open
  on the List page.
- **Manage** — add new items/aisles, edit names, aisles, and prices. Prices older than
  60 days get a "recheck price" nudge.

### Personal vs. shared lists

Every household automatically gets one **Shared** list, and every person in the household
automatically gets their own **personal** list ("My List") the moment they join. Both
behave identically — same aisle grouping, same totals, same checkoff behavior — the only
difference is who can see and edit them:

- The **Shared** list is visible and editable by everyone in the household.
- A **personal** list is only usable by the person it belongs to.

## Setup

### 1. Create a Supabase project

Go to supabase.com, create a new project, and grab your **Project URL** and **anon public
key** from Settings → API.

### 2. Run the schema

In the Supabase SQL Editor, run `supabase/schema.sql`. This creates:

- `households` / `household_members` — every new signup automatically gets their own
  household. **To share with your daughter**, once you've both signed up, insert a row
  into `household_members` linking her `user_id` to *your* `household_id`. This
  automatically gives her a personal list inside your shared household (via a trigger),
  and gives both of you access to the same Shared list — no app code changes needed.
- `lists` — every household gets one auto-created "Shared" list, and every member gets
  their own auto-created personal list. Both are scoped by household via RLS; personal
  lists are additionally locked to their owner.
- `store_sections`, `inventory_items`, `list_items` — the core data, all scoped by
  household (or by list, for `list_items`) via Row Level Security.
- Realtime is enabled on `list_items`, which is what makes checks/adds sync live between
  you and your daughter on the Shared list once you share a household.

### 3. Seed starter data (optional but recommended)

Sign up for an account in the running app first (see step 5), then run `supabase/seed.sql`
in the SQL Editor **while authenticated as that user** (the SQL Editor runs as you, so
this should work automatically once you're signed in via the app at least once — it looks
up your own household automatically).

This seeds a generic set of aisles and common grocery items with rough estimated prices.
Prices are **not Harmons-verified** — edit them as you go, or delete what doesn't apply to
your store.

### 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key:

```
cp .env.example .env.local
```

### 5. Run locally

```
npm install
npm run dev
```

### 6. Deploy

Push to a GitHub repo, then import it into Vercel. Add the same two environment variables
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings.

## Roadmap / not yet built

- **Household sharing UI** — right now sharing with your daughter requires one manual SQL
  insert (see step 2 above). A proper "invite by email" flow would be a nice follow-up.
- **Viewing each other's personal lists** — currently each person's personal list is
  private to them, even within a shared household. If you ever want to peek at your
  daughter's personal list (not just the Shared one), that's a small RLS policy change.
- **Receipt scanning** — photograph a receipt, extract line items + prices via an AI
  vision call, fuzzy-match against inventory, and update prices after a confirm step.
  Deliberately left for a phase 2 once the core app and inventory are in real use.
