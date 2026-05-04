SELECT 
  'CREATE TABLE ' || table_name || ' (' ||
  string_agg(column_name || ' ' || data_type, ', ') || ');'
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name;