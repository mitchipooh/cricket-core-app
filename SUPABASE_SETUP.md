# Supabase Setup Guide for Cricket Core 2026

Follow these steps to properly connect your application to your Supabase backend. This will enable cross-device login and data persistence.

## 1. Get Your Credentials
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Settings** (Gear icon) -> **API**.
3. Find the **Project URL** and **anon public** key.

## 2. Update Environment Variables
Open the `.env` file in your project root and replace the values:

```env
VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG... (Your long Anon Public Key)
```

> **Note:** The key MUST start with `eyJ...`.

## 3. Initialize the Database
1. In Supabase Dashboard, go to **SQL Editor**.
2. Click **New Query**.
3. Copy and paste the script below:

```sql
-- Create User Profiles Table
-- NOTE: We use text for id to support the app's handle-based system
create table if not exists public.user_profiles (
  id text primary key, 
  name text,
  handle text unique,
  password text,
  email text,
  role text,
  avatar_url text,
  settings jsonb default '{}'::jsonb,
  following jsonb default '{"teams": [], "players": [], "orgs": []}'::jsonb,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Create App State Table
create table if not exists public.app_state (
  id text primary key,
  payload jsonb,
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.user_profiles enable row level security;
alter table public.app_state enable row level security;

-- Create Policies
create policy "Public profiles are viewable by everyone." on public.user_profiles for select using ( true );
-- In production, you would restrict this, but for now we'll allow upserts via handle
create policy "Anyone can upsert profiles." on public.user_profiles for all using ( true );

create policy "Global state viewable by everyone" on public.app_state for select using ( true );
create policy "Authenticated users can update global state" on public.app_state for all using ( auth.role() = 'authenticated' );

-- Create Storage (Optional)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
create policy "Avatar images are publicly accessible." on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Anyone can upload an avatar." on storage.objects for insert with check ( bucket_id = 'avatars' );
```

## 4. Restart Application
Restart your local server:
```bash
npm run dev
```
