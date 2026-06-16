-- Custom enum types used across the schema

-- Staff and student roles
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'counselor', 'student');

-- Program levels offered
CREATE TYPE prog_level AS ENUM ('bachelors', 'masters', 'phd', 'language');

-- Stages in the application pipeline
CREATE TYPE app_stage AS ENUM (
  'inquiry',
  'profile_assessment',
  'shortlisting',
  'document_collection',
  'application_submitted',
  'offer_received',
  'visa_processing',
  'enrolled'
);