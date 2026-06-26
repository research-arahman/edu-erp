import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// ── constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLORS = {
  low:    'bg-green-100 text-green-700',
  normal: 'bg-blue-100 text-blue-700',
  high:   'bg-red-100 text-red-700',
};

const STATUS_COLORS = {
  todo:        'bg-gray-100 text-gray-600',
  in_progress: 'bg-yellow-100 text-yellow-700',
  done:        'bg-green-100 text-green-700',
};

const STATUS_LABELS = {
  todo:        'To Do',
  in_progress: 'In Progress',
  done:        'Done',
};

const EMPTY_ASSIGN = {
  title:                '',
  description:          '',
  assigned_to:          '',
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
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function roleLabel(role) {
  const map = {
    owner:       'Owner',
    manager:     'Manager',
    team_leader: 'Team Leader',
    counselor:   'Counselor',
    accountant:  'Accountant',
    staff:       'Staff',
  };
  return map[role] ?? role;
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
  const text = priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Normal';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {text}
    </span>
  );
}

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {STATUS_LABELS[status] ?? status}
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

// ── Assign / Edit Drawer ──────────────────────────────────────────────────────

function TaskDrawer({
  mode,           // 'assign' | 'edit'
  form,
  setField,
  onSubmit,
  onDelete,
  onClose,
  saving,
  deleting,
  assignableUsers,
  students,
  candidates,
}) {
  const isEdit = mode === 'edit';
  const title  = isEdit ? 'Edit Task' : 'Assign Task';

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
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

            <Field label="Assign To" required>
              <select
                className={INPUT}
                value={form.assigned_to}
                onChange={(e) => setField('assigned_to', e.target.value)}
                required
              >
                <option value="">— Select person —</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({roleLabel(u.role)})
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
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
            </div>

            {isEdit && (
              <Field label="Status">
                <select
                  className={INPUT}
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </Field>
            )}

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
              {saving ? (isEdit ? 'Saving…' : 'Assigning…') : (isEdit ? 'Save Changes' : 'Assign Task')}
            </button>
            {isEdit && onDelete && (
              <button
                type="button"
                disabled={deleting}
                onClick={onDelete}
                className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ManageTasks() {
  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [statusFilter, setFilter]   = useState('all');
  const [assignableUsers, setUsers] = useState([]);
  const [students, setStudents]     = useState([]);
  const [candidates, setCandidates] = useState([]);

  // Drawer state
  const [drawerMode, setDrawerMode] = useState(null);  // null | 'assign' | 'edit'
  const [editTask, setEditTask]     = useState(null);
  const [form, setForm]             = useState(EMPTY_ASSIGN);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/tasks/assigned');
      setTasks(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadLookups() {
    try {
      const [users, s, c] = await Promise.all([
        api.get('/tasks/assignable-users'),
        api.get('/students'),
        api.get('/candidates'),
      ]);
      setUsers(users);
      setStudents(s);
      setCandidates(c);
    } catch (_) {}
  }

  useEffect(() => {
    load();
    loadLookups();
  }, []);

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // ── Open drawers ──

  function openAssign() {
    setEditTask(null);
    setForm({ ...EMPTY_ASSIGN, assigned_to: assignableUsers[0]?.id ?? '' });
    setDrawerMode('assign');
  }

  function openEdit(task) {
    setEditTask(task);
    let relatedType = 'none';
    if (task.related_student_id)   relatedType = 'student';
    else if (task.related_candidate_id) relatedType = 'candidate';

    setForm({
      title:                task.title ?? '',
      description:          task.description ?? '',
      assigned_to:          task.assigned_to ?? '',
      priority:             task.priority ?? 'normal',
      due_date:             task.due_date ?? '',
      status:               task.status ?? 'todo',
      relatedType,
      related_student_id:   task.related_student_id ?? '',
      related_candidate_id: task.related_candidate_id ?? '',
    });
    setDrawerMode('edit');
  }

  function closeDrawer() {
    setDrawerMode(null);
    setEditTask(null);
  }

  // ── Submit assign ──

  async function submitAssign(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.assigned_to) return;
    setSaving(true);
    try {
      const payload = {
        title:       form.title.trim(),
        assigned_to: form.assigned_to,
        priority:    form.priority,
      };
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.due_date)           payload.due_date    = form.due_date;
      if (form.relatedType === 'student' && form.related_student_id) {
        payload.related_student_id   = form.related_student_id;
        payload.related_candidate_id = null;
      } else if (form.relatedType === 'candidate' && form.related_candidate_id) {
        payload.related_candidate_id = form.related_candidate_id;
        payload.related_student_id   = null;
      }
      await api.post('/tasks', payload);
      await load();
      closeDrawer();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Submit edit ──

  async function submitEdit(e) {
    e.preventDefault();
    if (!editTask) return;
    setSaving(true);
    try {
      const payload = {};

      if (form.title.trim() !== editTask.title)
        payload.title = form.title.trim();

      const newDesc = form.description.trim() || null;
      if (newDesc !== (editTask.description ?? null))
        payload.description = newDesc;

      if (form.assigned_to !== (editTask.assigned_to ?? ''))
        payload.assigned_to = form.assigned_to;

      if (form.priority !== (editTask.priority ?? 'normal'))
        payload.priority = form.priority;

      if (form.status !== editTask.status)
        payload.status = form.status;

      const newDue = form.due_date || null;
      if (newDue !== (editTask.due_date ?? null))
        payload.due_date = newDue;

      // Related person — explicit-null pattern
      const newStudent   = form.relatedType === 'student'    ? form.related_student_id   || null : null;
      const newCandidate = form.relatedType === 'candidate'  ? form.related_candidate_id || null : null;
      if (newStudent   !== (editTask.related_student_id   ?? null)) payload.related_student_id   = newStudent;
      if (newCandidate !== (editTask.related_candidate_id ?? null)) payload.related_candidate_id = newCandidate;

      if (Object.keys(payload).length > 0) {
        await api.patch(`/tasks/${editTask.id}`, payload);
      }
      await load();
      closeDrawer();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──

  async function handleDelete() {
    if (!editTask) return;
    if (!window.confirm(`Delete task "${editTask.title}"?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/tasks/${editTask.id}`);
      await load();
      closeDrawer();
    } catch (e) {
      if (e.message.includes('403')) {
        alert('You do not have permission to delete this task.');
      } else {
        alert(e.message);
      }
    } finally {
      setDeleting(false);
    }
  }

  // ── Filter ──

  const filtered = statusFilter === 'all'
    ? tasks
    : tasks.filter((t) => t.status === statusFilter);

  const FILTERS = [
    { key: 'all',        label: 'All' },
    { key: 'todo',       label: 'To Do' },
    { key: 'in_progress',label: 'In Progress' },
    { key: 'done',       label: 'Done' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assign / Manage Tasks</h1>
          <p className="mt-0.5 text-sm text-gray-500">Tasks you manage or oversee</p>
        </div>
        <button
          onClick={openAssign}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Assign Task
        </button>
      </div>

      {/* Status filter bar */}
      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f.key
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
            {f.key === 'all' ? ` (${tasks.length})` : ` (${tasks.filter(t => t.status === f.key).length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading tasks…</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
          <p className="text-sm font-medium text-gray-500">
            {statusFilter === 'all' ? 'No tasks yet.' : `No ${STATUS_LABELS[statusFilter]} tasks.`}
          </p>
          <p className="mt-1 text-xs text-gray-400">Assign a task using the button above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Title', 'Assigned To', 'Related To', 'Priority', 'Status', 'Due Date', 'Assigned By'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((task) => {
                const relatedName = task.related_student_name
                  ? `Student: ${task.related_student_name}`
                  : task.related_candidate_name
                  ? `Candidate: ${task.related_candidate_name}`
                  : null;
                const overdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();

                return (
                  <tr
                    key={task.id}
                    onClick={() => openEdit(task)}
                    className="cursor-pointer hover:bg-indigo-50 transition-colors"
                  >
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate font-medium text-gray-900">{task.title}</p>
                      {task.description && (
                        <p className="mt-0.5 truncate text-xs text-gray-400">{task.description}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {task.assigned_to_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {relatedName ? (
                        <span className={`text-xs ${task.related_student_name ? 'text-indigo-600' : 'text-purple-600'}`}>
                          {relatedName}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-xs ${overdue ? 'font-medium text-red-600' : 'text-gray-500'}`}>
                      {formatDate(task.due_date)}
                      {overdue && ' · Overdue'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {task.assigned_by_name ?? <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      {drawerMode && (
        <TaskDrawer
          mode={drawerMode}
          form={form}
          setField={setField}
          onSubmit={drawerMode === 'assign' ? submitAssign : submitEdit}
          onDelete={drawerMode === 'edit' ? handleDelete : null}
          onClose={closeDrawer}
          saving={saving}
          deleting={deleting}
          assignableUsers={assignableUsers}
          students={students}
          candidates={candidates}
        />
      )}
    </div>
  );
}
