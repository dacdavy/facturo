-- Facturo Migration V2: Providers table + invoice enhancements
-- Run this in the Supabase SQL Editor AFTER migration.sql

-- 1. Providers table (replaces hardcoded provider list)
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  sender_email text not null,
  invoice_url text,
  logo_url text,
  search_query text not null,
  is_default boolean default false,
  created_at timestamptz default now() not null
);

alter table public.providers enable row level security;

create policy "Anyone can view default providers"
  on public.providers for select
  using (is_default = true);

create policy "Users can view own custom providers"
  on public.providers for select
  using (auth.uid() = user_id);

create policy "Users can insert own providers"
  on public.providers for insert
  with check (auth.uid() = user_id and is_default = false);

create policy "Users can update own providers"
  on public.providers for update
  using (auth.uid() = user_id and is_default = false);

create policy "Users can delete own providers"
  on public.providers for delete
  using (auth.uid() = user_id and is_default = false);

-- 2. Seed default providers with billing page URLs
insert into public.providers (name, sender_email, invoice_url, search_query, is_default) values
  ('Spotify', 'no-reply@spotify.com', 'https://www.spotify.com/account/subscription/', 'from:spotify.com subject:(receipt OR invoice OR payment OR reçu)', true),
  ('Cursor', 'no-reply@cursor.com', 'https://www.cursor.com/settings', 'from:cursor.com subject:(receipt OR invoice OR payment)', true),
  ('Figma', 'no-reply@figma.com', 'https://www.figma.com/billing/', 'from:figma.com subject:(receipt OR invoice OR payment)', true),
  ('Claude / Anthropic', 'billing@anthropic.com', 'https://console.anthropic.com/settings/billing', 'from:anthropic.com subject:(receipt OR invoice OR payment OR billing)', true),
  ('Free', 'noreply@free.fr', 'https://subscribe.free.fr/login/', 'from:free.fr subject:(facture OR invoice)', true),
  ('Total Energies', 'noreply@totalenergies.fr', 'https://www.totalenergies.fr/clients/mon-espace-client', 'from:totalenergies subject:(facture OR invoice OR échéance)', true),
  ('Netflix', 'info@account.netflix.com', 'https://www.netflix.com/BillingActivity', 'from:netflix.com subject:(receipt OR invoice OR payment OR reçu)', true),
  ('AWS', 'aws-receivables-support@email.amazon.com', 'https://console.aws.amazon.com/billing/home#/bills', 'from:amazon.com subject:(invoice OR billing)', true),
  ('Google', 'payments-noreply@google.com', 'https://payments.google.com/payments/home', 'from:payments-noreply@google.com subject:(receipt OR invoice OR payment)', true),
  ('Apple', 'no_reply@email.apple.com', 'https://reportaproblem.apple.com/', 'from:apple.com subject:(receipt OR invoice OR reçu)', true),
  ('GitHub', 'noreply@github.com', 'https://github.com/settings/billing/summary', 'from:github.com subject:(receipt OR invoice OR payment)', true),
  ('Vercel', 'ship@vercel.com', 'https://vercel.com/dashboard/settings/billing', 'from:vercel.com subject:(receipt OR invoice OR payment)', true),
  ('Adobe', 'adobeid-noreply@adobe.com', 'https://account.adobe.com/plans', 'from:adobe.com subject:(receipt OR invoice OR payment)', true),
  ('Notion', 'notify@notion.so', 'https://www.notion.so/my-account/plans', 'from:notion.so subject:(receipt OR invoice OR payment)', true),
  ('Slack', 'feedback@slack.com', 'https://slack.com/intl/en/account/billing', 'from:slack.com subject:(receipt OR invoice OR payment)', true),
  ('OpenAI', 'noreply@openai.com', 'https://platform.openai.com/settings/organization/billing/overview', 'from:openai.com subject:(receipt OR invoice OR payment OR billing)', true),
  ('Microsoft 365', 'microsoft-noreply@microsoft.com', 'https://account.microsoft.com/services', 'from:microsoft.com subject:(receipt OR invoice OR payment OR order)', true),
  ('Dropbox', 'no-reply@dropbox.com', 'https://www.dropbox.com/account/billing', 'from:dropbox.com subject:(receipt OR invoice OR payment)', true),
  ('LinkedIn', 'messages-noreply@linkedin.com', 'https://www.linkedin.com/mypreferences/d/manage-subscription', 'from:linkedin.com subject:(receipt OR invoice OR payment OR premium)', true),
  ('Zoom', 'no-reply@zoom.us', 'https://zoom.us/account/billing', 'from:zoom.us subject:(receipt OR invoice OR payment)', true)
on conflict do nothing;

-- 3. Alter invoices table
alter table public.invoices add column if not exists invoice_url text;

-- Drop old status constraint and add new one with needs_pdf and added
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check
  check (status in ('processed', 'pending', 'error', 'needs_pdf', 'added'));

-- Allow gmail_message_id to be null for manual entries
alter table public.invoices alter column gmail_message_id drop not null;

-- 4. Index for providers
create index if not exists idx_providers_user_id on public.providers(user_id);
create index if not exists idx_providers_is_default on public.providers(is_default);
