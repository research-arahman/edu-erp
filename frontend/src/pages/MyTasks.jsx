import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// ── constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLORS = {
  low:    'bg-green-100 text-green-700',
  normal: 'bg-blue-100 text-blue-700',
  high:   'bg-red-100 text-red-700',
};

const STATUS_COLS = [
  { key: 'todo',        label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
];

const STATUS_ADVANCE = {
  todo:        { label: 'Start',    next: 'in_progress' },
  in_progress: { label: 'Complete', next: 'done' },
  done:        { label: 'Reopen',   next: 'todo' },
};

const EMPTY_FORM = {
  title:                '',
  description:          '',
  priority:             'normal',
  due_date:             '',
  relatedType:          'none',
  related_student_id:   '',
  related_candidate_id: '',
};

// ── shared styles ─────────────────────────────────────────────────────────────

const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
              'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
              'disabled:bg-gray-50 disabled:text-gray-400';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return null;
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function isOverdue(task) {
  return task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
}

// ── sub-components ────────────────────────────────────────────────────────────

function Field({ label, required, children }) {
  return (
    <div>
      <label className={LABEL}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function PriorityBadge({ priority }) {
  const cls = PRIORITY_COLORS[priority] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {(priority ?? 'normal').charAt(0).toUpperCase() + (priority ?? 'normal').slice(1)}
    </span>
  );
}

function RelatedToggle({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {['none', 'student', 'candidate'].map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === t
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {t === 'none' ? 'None' : t === 'student' ? 'Student' : 'Candidate'}
        </button>
      ))}
    </div>
  );
}

function TaskCard({ task, onAdvance }) {
  const advance = STATUS_ADVANCE[task.status];
  const overdue = isOverdue(task);

  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm transition-opacity ${
        task.status === 'done' ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`text-sm font-medium text-gray-900 leading-snug ${
            task.status === 'done' ? 'line-through text-gray-400' : ''
          }`}
        >
          {task.title}
        </h3>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{task.description}</p>
      )}

      <div className="mt-2 space-y-0.5">
        {task.due_date && (
          <p className={`text-xs ${overdue ? 'font-medium text-red-600' : 'text-gray-400'}`}>
            Due: {formatDate(task.due_date)}{overdue ? ' · Overdue' : ''}
          </p>
        )}
        {task.assigned_by_name && (
          <p className="text-xs text-gray-400">Assigned by: {task.assigned_by_name}</p>
        )}
        {task.related_student_name && (
          <p className="text-xs text-indigo-600">Student: {task.related_student_name}</p>
        )}
        {task.related_candidate_name && (
          <p className="text-xs text-purple-600">Candidate: {task.related_candidate_name}</p>
        )}
      </div>

      {advance && (
        <button
          onClick={onAdvance}
          className="mt-3 w-full rounded-md border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
        >
          {advance.label} →
        </button>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function MyTasks() {
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [drawerOpen, setDrawer] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [students, setStudents] = useState([]);
  const [candidates, setCandidates] = useState([]);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/tasks/mine');
      setTasks(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadLookups() {
    try {
      const [s, c] = await Promise.all([api.get('/students'), api.get('/candidates')]);
      setStudents(s);
      setCandidates(c);
    } catch (_) {}
  }

  useEffect(() => {
    load();
    loadLookups();
  }, []);

  async function advanceStatus(task) {
    const next = STATUS_ADVANCE[task.status]?.next;
    if (!next) return;
    try {
      const updated = await api.patch(`/tasks/${task.id}`, { status: next });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...updated } : t)));
    } catch (e) {
      alert(e.message);
    }
  }

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function openDrawer() {
    setForm(EMPTY_FORM);
    setDrawer(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { title: form.title.trim(), priority: form.priority };
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.due_date)           payload.due_date    = form.due_date;
      if (form.relatedType === 'student' && form.related_student_id) {
        payload.related_student_id   = form.related_student_id;
        payload.related_candidate_id = null;
      } else if (form.relatedType === 'candidate' && form.related_candidate_id) {
        payload.related_candidate_id = form.related_candidate_id;
        payload.related_student_id   = null;
      }
      const created = await api.post('/tasks', payload);
      setTasks((prev) => [created, ...prev]);
      setDrawer(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  const byStatus = STATUS_COLS.reduce((acc, col) => {
    acc[col.key] = tasks.filter((t) => t.status === col.key);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="mt-0.5 text-sm text-gray-500">Tasks assigned to you</p>
        </div>
        <button
          onClick={openDrawer}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Personal Task
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
          <p className="text-sm font-medium text-gray-500">No tasks assigned to you.</p>
          <p className="mt-1 text-xs text-gray-400">Create a personal task to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {STATUS_COLS.map((col) => (
            <div key={col.key}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {col.label}
                </h2>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {byStatus[col.key].length}
                </span>
              </div>
              <div className="space-y-3">
                {byStatus[col.key].length === 0 ? (
                  <p className="text-xs italic text-gray-300">No tasks</p>
                ) : (
                  byStatus[col.key].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onAdvance={() => advanceStatus(task)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Personal Task Drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30"
            onClick={() => setDrawer(false)}
          />
          <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">New Personal Task</h2>
              <button
                onClick={() => setDrawer(false)}
                className="text-xl leading-none text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <Field label="Title" required>
                  <input
                    className={INPUT}
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="Task title"
                    required
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    className={INPUT}
                    rows={3}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="Optional details…"
                  />
                </Field>

                <Field label="Priority">
                  <select
                    className={INPUT}
                    value={form.priority}
                    onChange={(e) => setField('priority', e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </Field>

                <Field label="Due Date">
                  <input
                    type="date"
                    className={INPUT}
                    value={form.due_date}
                    onChange={(e) => setField('due_date', e.target.value)}
                  />
                </Field>

                <Field label="Related To">
                  <RelatedToggle
                    value={form.relatedType}
                    onChange={(t) => setField('relatedType', t)}
                  />
                  {form.relatedType === 'student' && (
                    <select
                      className={`${INPUT} mt-2`}
                      value={form.related_student_id}
                      onChange={(e) => setField('related_student_id', e.target.value)}
                    >
                      <option value="">— Select student —</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  )}
                  {form.relatedType === 'candidate' && (
                    <select
                      className={`${INPUT} mt-2`}
                      value={form.related_candidate_id}
                      onChange={(e) => setField('related_candidate_id', e.target.value)}
                    >
                      <option value="">— Select candidate —</option>
                      {candidates.map((c) => (
                        <option key={c.id} value={c.id}>{c.full_name}</option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>

              <div className="flex gap-3 border-t px-6 py-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Creating…' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={() => setDrawer(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
