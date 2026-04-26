alter table customers
  add column if not exists business_id uuid references businesses(id);

alter table check_ins
  add column if not exists business_id uuid references businesses(id);

alter table campaigns
  add column if not exists business_id uuid references businesses(id);

alter table rewards_milestones
  add column if not exists business_id uuid references businesses(id);

alter table customer_segments
  add column if not exists business_id uuid references businesses(id);

-- Update unique constraint to include business_id
alter table customer_segments
  drop constraint if exists customer_segments_customer_id_segment_key;

alter table customer_segments
  add constraint customer_segments_customer_business_segment_key
  unique (customer_id, business_id, segment);
