create table if not exists businesses (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  owner_email  text not null,
  created_at   timestamptz default now()
);

create table if not exists qr_codes (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  label        text not null,
  created_at   timestamptz default now()
);
