insert into system_status (id, status, current_fault, confidence, last_updated)
values (
  gen_random_uuid(),
  'Normal',
  'Normal',
  1,
  now()
);