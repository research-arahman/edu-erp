-- ============================================================
-- Core CRM Tables (Part 1): Countries & Institutes
-- ============================================================

-- Destinations (40-50 countries)
CREATE TABLE countries (
  id            serial PRIMARY KEY,
  name          text UNIQUE NOT NULL,
  iso_code      text,              -- e.g. 'JP', 'GB', 'US'
  region        text,              -- e.g. 'East Asia', 'Europe'
  currency      text,              -- default tuition currency, e.g. 'JPY'
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Institutes: universities AND language schools AND diploma providers
CREATE TABLE institutes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id          int NOT NULL REFERENCES countries(id),
  name                text NOT NULL,
  type                text NOT NULL,        -- 'university' | 'language_school' | 'diploma'
  ownership           text,                 -- 'national' | 'public' | 'private'
  city                text,
  global_ranking      int,
  -- Side-panel info shown when an institute is selected:
  living_expense_est  numeric,              -- estimated monthly living cost
  living_expense_cur  text,                 -- currency for the above
  has_dormitory       boolean DEFAULT false,
  services            text,                 -- free text: airport pickup, job support, etc.
  notes               text,
  is_active           boolean DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  CONSTRAINT valid_type CHECK (type IN ('university','language_school','diploma'))
);

-- Helpful indexes for the cascading selector
CREATE INDEX idx_institutes_country ON institutes(country_id);
CREATE INDEX idx_institutes_type ON institutes(type);