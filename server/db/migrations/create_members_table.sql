create table if not exists members (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  role text default 'founding',
  badge text default 'founding_member',
  stripe_customer_id text,
  joined_at timestamp with time zone default now()
);
