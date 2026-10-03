-- ==============================================================================
-- BionicText - Supabase Database Schema
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. PROFILES TABLE (Linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. USER SETTINGS TABLE (Bionic reading preferences)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  font_family text default 'sans' not null,
  font_size text default 'base' not null,
  bionic_fixation integer default 3 not null,
  bionic_weight text default 'bold' not null,
  bionic_color text default 'black' not null,
  line_height text default 'relaxed' not null,
  default_wpm integer default 350 not null,
  tts_speed numeric default 1.0 not null,
  saccade_step integer default 1 not null,
  dark_mode boolean default false not null,
  updated_at timestamptz default now() not null
);

-- 3. READING TESTS TABLE (Speed test history and benchmark results)
create table if not exists public.reading_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  test_number integer default 1 not null,
  title text not null,
  normal_wpm integer not null,
  bionic_wpm integer not null,
  improvement_percentage numeric not null,
  accuracy numeric default 95 not null,
  duration_seconds integer not null,
  created_at timestamptz default now() not null
);

-- 4. LIBRARY DOCUMENTS TABLE (Saved texts & reading materials)
create table if not exists public.library_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  text text not null,
  words integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 5. READING LOGS TABLE (Translations & reading conversion history)
create table if not exists public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  source_lang text not null,
  target_lang text not null,
  word_count integer not null,
  is_bionic boolean default true not null,
  text_snippet text,
  created_at timestamptz default now() not null
);

-- 6. AI CONVERSATIONS TABLE (Groq AI chats & reading assistance logs)
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('system', 'user', 'assistant')),
  prompt text not null,
  response text,
  model text,
  created_at timestamptz default now() not null
);

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.reading_tests enable row level security;
alter table public.library_documents enable row level security;
alter table public.reading_logs enable row level security;
alter table public.ai_conversations enable row level security;

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================

-- Profiles Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- User Settings Policies
create policy "Users can select own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Reading Tests Policies
create policy "Users can view own reading tests"
  on public.reading_tests for select
  using (auth.uid() = user_id or user_id is null);

create policy "Users can insert reading tests"
  on public.reading_tests for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "Users can delete own reading tests"
  on public.reading_tests for delete
  using (auth.uid() = user_id);

-- Library Documents Policies
create policy "Users can view own documents"
  on public.library_documents for select
  using (auth.uid() = user_id or user_id is null);

create policy "Users can insert documents"
  on public.library_documents for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "Users can update own documents"
  on public.library_documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on public.library_documents for delete
  using (auth.uid() = user_id);

-- Reading Logs Policies
create policy "Users can view own reading logs"
  on public.reading_logs for select
  using (auth.uid() = user_id or user_id is null);

create policy "Users can insert reading logs"
  on public.reading_logs for insert
  with check (true);

-- AI Conversations Policies
create policy "Users can view own AI conversations"
  on public.ai_conversations for select
  using (auth.uid() = user_id or user_id is null);

create policy "Users can insert AI conversations"
  on public.ai_conversations for insert
  with check (true);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
create index if not exists idx_reading_tests_user on public.reading_tests(user_id, created_at desc);
create index if not exists idx_library_docs_user on public.library_documents(user_id, updated_at desc);
create index if not exists idx_reading_logs_user on public.reading_logs(user_id, created_at desc);
create index if not exists idx_ai_conversations_user on public.ai_conversations(user_id, created_at desc);
