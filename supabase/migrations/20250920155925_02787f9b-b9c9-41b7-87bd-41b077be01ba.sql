-- Move pg_trgm extension from public schema to extensions schema
ALTER EXTENSION "pg_trgm" SET SCHEMA extensions;