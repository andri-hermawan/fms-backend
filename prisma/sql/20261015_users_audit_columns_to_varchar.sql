ALTER TABLE users
  ALTER COLUMN created_by TYPE VARCHAR(50) USING created_by::text,
  ALTER COLUMN updated_by TYPE VARCHAR(50) USING updated_by::text;
