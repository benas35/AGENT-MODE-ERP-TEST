-- Fix security warning: Move extensions from public schema to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;