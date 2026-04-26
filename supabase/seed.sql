insert into businesses (name, slug, owner_email) values
  ('Wild & The Barre', 'wild-barre', 'contact@wildthebarre.com'),
  ('Blue Bottle Coffee', 'blue-bottle', 'hello@bluebottle.com'),
  ('Casa Azteca', 'casa-azteca', 'info@casaazteca.com')
on conflict (slug) do nothing;

insert into qr_codes (business_id, label)
select id, 'Front Door' from businesses where slug = 'wild-barre'
on conflict do nothing;

insert into qr_codes (business_id, label)
select id, 'Front Door' from businesses where slug = 'blue-bottle'
on conflict do nothing;

insert into qr_codes (business_id, label)
select id, 'Front Door' from businesses where slug = 'casa-azteca'
on conflict do nothing;
