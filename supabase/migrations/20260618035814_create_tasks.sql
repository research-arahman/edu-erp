-- ============================================================
-- Task Management: daily recurring tasks + assigned tasks
-- ============================================================

-- ---------- DAILY TASK TEMPLATES ----------
-- Recurring tasks that rotate every day, labeled by role.
-- Manually added; the system generates a daily instance from each template.
CREATE TABLE daily_task_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  role_label    user_role,            -- which role this daily task is for
  start_time    time,                 -- time frame start
  end_time      time,                 -- time frame end
  is_active     boolean DEFAULT true,
  created_by    uuid REFERENCES profiles(id),
  created_at    timestamptz DEFAULT now()
);

-- ---------- TASKS ----------
-- Holds BOTH the daily-generated instances and one-off assigned tasks.
CREATE TABLE tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  title         text NOT NULL,
  description   text,
  task_type     text NOT NULL DEFAULT 'assigned',  -- 'daily' | 'assigned'

  -- For daily tasks: which template generated it, and for which date
  template_id   uuid REFERENCES daily_task_templates(id),
  task_date     date,                 -- the day this instance belongs to

  -- Assignment
  assigned_to   uuid REFERENCES profiles(id),       -- the named staff member
  assigned_by   uuid REFERENCES profiles(id),       -- owner/manager/team_leader
  role_label    user_role,            -- task for manager/counselor/instructor/accountant...

  -- Status workflow
  status        text DEFAULT 'todo',  -- 'todo','in_progress','done'
  priority      text DEFAULT 'normal',-- 'low','normal','high'
  due_date      date,
  completed_at  timestamptz,

  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),

  CONSTRAINT valid_task_type CHECK (task_type IN ('daily','assigned')),
  CONSTRAINT valid_task_status CHECK (status IN ('todo','in_progress','done')),
  CONSTRAINT valid_priority CHECK (priority IN ('low','normal','high'))
);

-- ---------- NOTIFICATIONS ----------
-- When a task is assigned, the assignee gets a notification.
CREATE TABLE notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  uuid NOT NULL REFERENCES profiles(id),
  type          text DEFAULT 'task_assigned',  -- 'task_assigned','task_done','general'
  title         text NOT NULL,
  body          text,
  related_task_id uuid REFERENCES tasks(id),
  is_read       boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_date ON tasks(task_date);
CREATE INDEX idx_tasks_type ON tasks(task_type);
CREATE INDEX idx_notif_recipient ON notifications(recipient_id, is_read);

-- ============================================================
-- RLS for tasks
-- ============================================================

-- Helper: can the current user assign/manage tasks for others?
CREATE OR REPLACE FUNCTION can_manage_tasks()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT current_user_role() IN ('owner','manager','team_leader');
$$;

-- Daily templates: only task-managers create/edit; everyone can view.
ALTER TABLE daily_task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY dtt_select ON daily_task_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY dtt_insert ON daily_task_templates FOR INSERT TO authenticated WITH CHECK (can_manage_tasks());
CREATE POLICY dtt_update ON daily_task_templates FOR UPDATE TO authenticated USING (can_manage_tasks());
CREATE POLICY dtt_delete ON daily_task_templates FOR DELETE TO authenticated USING (can_delete());

-- Tasks: everyone sees tasks (so managers get the full report);
-- assignees can update their own task status; task-managers can do all.
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_select ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY tasks_insert ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY tasks_update ON tasks
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR can_manage_tasks());
CREATE POLICY tasks_delete ON tasks FOR DELETE TO authenticated USING (can_delete());

-- Notifications: you only see your own.
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_select ON notifications
  FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY notif_insert ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY notif_update ON notifications
  FOR UPDATE TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY notif_delete ON notifications FOR DELETE TO authenticated USING (can_delete());