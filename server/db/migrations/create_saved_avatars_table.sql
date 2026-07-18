-- saved_avatars: stores named avatar configurations per user
create table if not exists saved_avatars (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS: users can only see and modify their own rows
alter table saved_avatars enable row level security;

create policy "saved_avatars: owner select"
  on saved_avatars for select
  using (auth.uid() = user_id);

create policy "saved_avatars: owner insert"
  on saved_avatars for insert
  with check (auth.uid() = user_id);

create policy "saved_avatars: owner update"
  on saved_avatars for update
  using (auth.uid() = user_id);

create policy "saved_avatars: owner delete"
  on saved_avatars for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at on every row change
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger saved_avatars_updated_at
  before update on saved_avatars
  for each row execute procedure set_updated_at();
