-- Facturo Database Migration
-- Run this in the Supabase SQL Editor

-- 1. Email Accounts table
create table if not exists public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null default 'gmail',
  email text not null,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz default now() not null,
  unique(user_id, email)
);

-- 2. Invoices table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  email_account_id uuid references public.email_accounts(id) on delete set null,
  provider text not null default 'Unknown',
  amount decimal(10,2),
  currency text default 'EUR',
  invoice_date date,
  pdf_path text,
  pdf_filename text,
  email_subject text,
  email_date timestamptz,
  gmail_message_id text,
  status text default 'pending' check (status in ('processed', 'pending', 'error')),
  created_at timestamptz default now() not null,
  unique(user_id, gmail_message_id)
);

-- 3. Row Level Security
alter table public.email_accounts enable row level security;
alter table public.invoices enable row level security;

create policy "Users can view own email accounts"
  on public.email_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert own email accounts"
  on public.email_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own email accounts"
  on public.email_accounts for update
  using (auth.uid() = user_id);

create policy "Users can delete own email accounts"
  on public.email_accounts for delete
  using (auth.uid() = user_id);

create policy "Users can view own invoices"
  on public.invoices for select
  using (auth.uid() = user_id);

create policy "Users can insert own invoices"
  on public.invoices for insert
  with check (auth.uid() = user_id);

create policy "Users can update own invoices"
  on public.invoices for update
  using (auth.uid() = user_id);

create policy "Users can delete own invoices"
  on public.invoices for delete
  using (auth.uid() = user_id);

-- 4. Storage bucket for invoice PDFs
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

create policy "Users can upload invoice PDFs"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view own invoice PDFs"
  on storage.objects for select
  using (
    bucket_id = 'invoices' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own invoice PDFs"
  on storage.objects for delete
  using (
    bucket_id = 'invoices' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Indexes for performance
create index if not exists idx_invoices_user_id on public.invoices(user_id);
create index if not exists idx_invoices_gmail_message_id on public.invoices(gmail_message_id);
create index if not exists idx_email_accounts_user_id on public.email_accounts(user_id);
