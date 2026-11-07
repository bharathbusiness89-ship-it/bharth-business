create table if not exists public.enquiries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text not null,
  product text,
  message text
);
alter table public.enquiries enable row level security;
