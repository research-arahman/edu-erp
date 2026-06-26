import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

// ── constants ─────────────────────────────────────────────────────────────────

const EMPTY_CREATE = {
  full_name:      '',
  email:          '',
  password:       '',
  role:           'staff',
  team:           '',
  position:       '',
  phone:          '',
  team_leader_id: '',
};

const ROLE_OPTIONS = [
  { value: 'owner',       label: 'Owner' },
  { value: 'manager',     label: 'Manager' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'counselor',   label: 'Counselor' },
  { value: 'accountant',  label: 'Accountant' },
  { value: 'staff',       label: 'Staff' },
];

const ROLE_COLORS = {
  owner:       'bg-purple-100 text-purple-800',
  manager:     'bg-indigo-100 text-indigo-800',
  team_leader: 'bg-blue-100 text-blue-800',
  counselor:   'bg-teal-100 text-teal-800',
  accountant:  'bg-amber-100 text-amber-800',
  staff:       'bg-gray-100 text-gray-600',
};

// ── shared input styles ───────────────────────────────────────────────────────

const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
              'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
              'disabled:bg-gray-50 disabled:text-gray-400';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';

// ── sub-components ────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const colors = ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600';
  const label  = ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors}`}>
      {label}
    </span>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className={LABEL}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ── payload builders ──────────────────────────────────────────────────────────

function buildCreatePayload(form) {
  const p = {
    email:          form.email.trim(),
    password:       form.password,
    full_name:      form.full_name.trim(),
    role:           form.role || 'staff',
    team_leader_id: form.team_leader_id || null,
  };
  if (form.team.trim())     p.team     = form.team.trim();
  if (form.position.trim()) p.position = form.position.trim();
  if (form.phone.trim())    p.phone    = form.phone.trim();
  return p;
}

function buildEditPayload(form) {
  return {
    full_name:      form.full_name.trim(),
    role:           form.role,
    team:           form.team.trim()     || null,
    position:       form.position.trim() || null,
    phone:          form.phone.trim()    || null,
    team_leader_id: form.team_leader_id  || null,
    is_active:      form.is_active,
  };
}

// ── main component ────────────────────────────────────────────────────────────

export default function Staff() {
  const [staff,     setStaff]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [query,     setQuery]     = useState('');

  const [panel,     setPanel]     = useState(null); // null | 'add' | 'edit'
  const [selected,  setSelected]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_CREATE);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState(null);

  // ── data loading ───────────────────────────────────────────────────────────

  function loadStaff() {
    return api.get('/admin/users').then(setStaff);
  }

  useEffect(() => {
    api.get('/admin/users')
      .then(setStaff)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // client-side search filter
  const filtered = useMemo(() => {
    if (!query.trim()) return staff;
    const q = query.toLowerCase();
    return staff.filter(
      (s) =>
        (s.full_name ?? '').toLowerCase().includes(q) ||
        (s.email     ?? '').toLowerCase().includes(q)
    );
  }, [staff, query]);

  // ── panel helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_CREATE);
    setFormError(null);
    setSelected(null);
    setPanel('add');
  }

  function openEdit(member) {
    setForm({
      full_name:      member.full_name      ?? '',
      role:           member.role           ?? 'staff',
      team:           member.team           ?? '',
      position:       member.position       ?? '',
      phone:          member.phone          ?? '',
      team_leader_id: member.team_leader_id ?? '',
      is_active:      member.is_active      ?? true,
    });
    setFormError(null);
    setSelected(member);
    setPanel('edit');
  }

  function closePanel() {
    setPanel(null);
    setSelected(null);
    setFormError(null);
  }

  // ── form handlers ──────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (panel === 'add') {
      if (!form.email.trim()) { setFormError('Email is required.'); return; }
      if (!form.password)     { setFormError('Password is required.'); return; }
    }
    setSaving(true);
    setFormError(null);
    try {
      if (panel === 'add') {
        await api.post('/admin/users', buildCreatePayload(form));
      } else {
        await api.patch(`/admin/users/${selected.id}`, buildEditPayload(form));
      }
      await loadStaff();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Staff</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{staff.length} team members</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-56 rounded-md border border-gray-300 px-3 py-2 text-sm
                       focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={openAdd}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                       hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
          >
            + Add Staff
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">
          Loading staff…
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Email', 'Role', 'Team', 'Position', 'Reports To', 'Status'].map((col) => (
                  <th
                    key={col}
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-gray-400">
                    {staff.length === 0
                      ? 'No staff yet — add one above.'
                      : 'No matches for your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => openEdit(member)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{member.full_name}</td>
                    <td className="px-5 py-3 text-gray-600">{member.email}</td>
                    <td className="px-5 py-3">
                      <RoleBadge role={member.role} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">{member.team ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{member.position ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{member.team_leader_name ?? '—'}</td>
                    <td className="px-5 py-3">
                      {member.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Slide-in panel ─────────────────────────────────────────────────── */}
      {panel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closePanel}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-[480px] flex-col bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'Add Staff Member' : `Edit: ${selected?.full_name}`}
              </h3>
              <button
                onClick={closePanel}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Form error */}
            {formError && (
              <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            {/* Form body — scrollable */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-4 px-6 py-5">

                <Field label="Full Name" required>
                  <input
                    className={INPUT}
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. Rafiqul Islam"
                  />
                </Field>

                {panel === 'add' ? (
                  <Field label="Email" required>
                    <input
                      className={INPUT}
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="staff@example.com"
                    />
                  </Field>
                ) : (
                  <div>
                    <p className={LABEL}>Email</p>
                    <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                      {selected?.email}
                    </p>
                  </div>
                )}

                {panel === 'add' && (
                  <Field
                    label="Password"
                    required
                    hint="They can change it after logging in."
                  >
                    <input
                      className={INPUT}
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="Initial password…"
                      autoComplete="new-password"
                    />
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Role" required>
                    <select
                      className={INPUT}
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Team">
                    <input
                      className={INPUT}
                      name="team"
                      value={form.team}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g. application"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Position">
                    <input
                      className={INPUT}
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g. Senior Counselor"
                    />
                  </Field>

                  <Field label="Phone">
                    <input
                      className={INPUT}
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="+880 1700-000000"
                    />
                  </Field>
                </div>

                <Field label="Reports To">
                  <select
                    className={INPUT}
                    name="team_leader_id"
                    value={form.team_leader_id}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">— none —</option>
                    {staff
                      .filter((s) => panel === 'add' || s.id !== selected?.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                  </select>
                </Field>

                {panel === 'edit' && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        checked={form.is_active}
                        onChange={handleChange}
                        disabled={saving}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label
                        htmlFor="is_active"
                        className="text-sm text-gray-700 cursor-pointer select-none"
                      >
                        Active
                      </label>
                    </div>
                    {!form.is_active && (
                      <p className="mt-1.5 text-xs text-amber-600">
                        Inactive users cannot log in.
                      </p>
                    )}
                  </div>
                )}

              </div>

              {/* Drawer footer */}
              <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={closePanel}
                  disabled={saving}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium
                             text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                             hover:bg-indigo-700 disabled:opacity-50 focus:outline-none
                             focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                >
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Staff Member' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
