-- ============================================================
-- Activity Log: audit trail of all significant actions
-- ============================================================

CREATE TABLE activity_log (
  id            bigserial PRIMARY KEY,

  -- Who did it
  actor_id      uuid REFERENCES profiles(id),
  actor_name    text,          -- snapshot of name at time of action

  -- What they did
  action        text NOT NULL, -- 'create','update','delete','stage_change','login','assign'
  entity_type   text NOT NULL, -- 'student','application','inquiry','institute','task', etc.
  entity_id     text,          -- id of the affected record (text to allow any id type)

  -- Optional detail
  description   text,          -- human-readable summary, e.g. "Moved app to visa_processing"
  metadata      jsonb,         -- structured before/after or extra context

  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_actor ON activity_log(actor_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- RLS: everyone can read the log; the system inserts entries.
-- No one edits or deletes log entries (immutable audit trail) — not even managers.
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_select ON activity_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY activity_insert ON activity_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Deliberately NO update or delete policies → log entries are permanent.