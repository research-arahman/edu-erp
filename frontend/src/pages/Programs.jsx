import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// ── constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  institute_id: '',
  level_category: '',
  level_label: '',
  department: '',
  course_name: '',
  tuition_fee: '',
  admission_cost: '',
  enrollment_cost: '',
  currency: '',
  duration_months: '',
  language_test_accepted: '',
  min_language_level: '',
  moi_accepted: false,
};

const LEVEL_CATEGORY_META = {
  bachelors:      { label: 'Bachelor\'s', cls: 'bg-indigo-50 text-indigo-700' },
  masters:        { label: 'Master\'s',   cls: 'bg-violet-50 text-violet-700' },
  phd:            { label: 'PhD',         cls: 'bg-purple-50 text-purple-700' },
  diploma:        { label: 'Diploma',     cls: 'bg-amber-50 text-amber-700' },
  jlpt:           { label: 'JLPT',        cls: 'bg-rose-50 text-rose-700' },
  english:        { label: 'English',     cls: 'bg-emerald-50 text-emerald-700' },
  topik:          { label: 'TOPIK',       cls: 'bg-sky-50 text-sky-700' },
};

function buildPayload(form) {
  const p = {
    institute_id: form.institute_id,
    level_category: form.level_category,
    course_name: form.course_name.trim(),
    moi_accepted: form.moi_accepted,
  };
  if (form.level_label.trim())            p.level_label             = form.level_label.trim();
  if (form.department.trim())             p.department               = form.department.trim();
  if (form.tuition_fee !== '')            p.tuition_fee              = Number(form.tuition_fee);
  if (form.admission_cost !== '')         p.admission_cost           = Number(form.admission_cost);
  if (form.enrollment_cost !== '')        p.enrollment_cost          = Number(form.enrollment_cost);
  if (form.currency.trim())               p.currency                 = form.currency.trim().toUpperCase();
  if (form.duration_months !== '')        p.duration_months          = Number(form.duration_months);
  if (form.language_test_accepted.trim()) p.language_test_accepted   = form.language_test_accepted.trim();
  if (form.min_language_level.trim())     p.min_language_level       = form.min_language_level.trim();
  return p;
}

// ── shared input styles ───────────────────────────────────────────────────────

const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
              'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
              'disabled:bg-gray-50 disabled:text-gray-400';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';

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

function LevelBadge({ category }) {
  const m = LEVEL_CATEGORY_META[category] ?? { label: category, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function Programs() {
  const [programs,   setPrograms]   = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const [panel,     setPanel]     = useState(null); // null | 'add' | 'edit'
  const [selected,  setSelected]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState(null);

  // ── sessions sub-state (shown only in edit mode) ───────────────────────────
  const [sessions,        setSessions]        = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionForm,     setSessionForm]     = useState({
    session_name: '', start_date: '', application_deadline: '', seats: '', is_open: true,
  });
  const [addingSession,   setAddingSession]   = useState(false);
  const [sessionError,    setSessionError]    = useState(null);

  // ── data loading ───────────────────────────────────────────────────────────

  function loadPrograms() {
    return api.get('/programs').then(setPrograms);
  }

  useEffect(() => {
    Promise.all([api.get('/programs'), api.get('/institutes')])
      .then(([progs, insts]) => { setPrograms(progs); setInstitutes(insts); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const instituteMap = Object.fromEntries(institutes.map((i) => [i.id, i.name]));

  // ── panel helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setSessions([]);
    setSessionForm({ session_name: '', start_date: '', application_deadline: '', seats: '', is_open: true });
    setSessionError(null);
    setPanel('add');
  }

  function openEdit(prog) {
    setForm({
      institute_id:           prog.institute_id?.toString()     ?? '',
      level_category:         prog.level_category               ?? '',
      level_label:            prog.level_label                  ?? '',
      department:             prog.department                   ?? '',
      course_name:            prog.course_name                  ?? '',
      tuition_fee:            prog.tuition_fee?.toString()      ?? '',
      admission_cost:         prog.admission_cost?.toString()   ?? '',
      enrollment_cost:        prog.enrollment_cost?.toString()  ?? '',
      currency:               prog.currency                     ?? '',
      duration_months:        prog.duration_months?.toString()  ?? '',
      language_test_accepted: prog.language_test_accepted       ?? '',
      min_language_level:     prog.min_language_level           ?? '',
      moi_accepted:           prog.moi_accepted === true,
    });
    setFormError(null);
    setSelected(prog);
    setSessionError(null);
    setSessionForm({ session_name: '', start_date: '', application_deadline: '', seats: '', is_open: true });
    setPanel('edit');

    setSessionsLoading(true);
    api.get(`/programs/${prog.id}/sessions`)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }

  function closePanel() {
    setPanel(null);
    setSelected(null);
    setFormError(null);
    setSessions([]);
    setSessionError(null);
  }

  // ── form handlers ──────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.institute_id || !form.level_category || !form.course_name.trim()) {
      setFormError('Institute, level category, and course name are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = buildPayload(form);
      if (panel === 'add') {
        await api.post('/programs', payload);
      } else {
        await api.patch(`/programs/${selected.id}`, payload);
      }
      await loadPrograms();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, prog) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${prog.course_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/programs/${prog.id}`);
      setPrograms((prev) => prev.filter((p) => p.id !== prog.id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  // ── session handlers ───────────────────────────────────────────────────────

  function handleSessionChange(e) {
    const { name, value, type, checked } = e.target;
    setSessionForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleAddSession(e) {
    e.preventDefault();
    if (!sessionForm.session_name.trim()) {
      setSessionError('Session name is required.');
      return;
    }
    setAddingSession(true);
    setSessionError(null);
    try {
      const payload = { session_name: sessionForm.session_name.trim(), is_open: sessionForm.is_open };
      if (sessionForm.start_date)            payload.start_date            = sessionForm.start_date;
      if (sessionForm.application_deadline)  payload.application_deadline  = sessionForm.application_deadline;
      if (sessionForm.seats !== '')          payload.seats                 = Number(sessionForm.seats);

      const newSession = await api.post(`/programs/${selected.id}/sessions`, payload);
      setSessions((prev) => [...prev, newSession]);
      setSessionForm({ session_name: '', start_date: '', application_deadline: '', seats: '', is_open: true });
    } catch (err) {
      setSessionError(err.message);
    } finally {
      setAddingSession(false);
    }
  }

  async function handleDeleteSession(session) {
    if (!window.confirm(`Delete session "${session.session_name}"?`)) return;
    try {
      await api.delete(`/sessions/${session.id}`);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Programs</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{programs.length} programs</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Program
        </button>
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
          Loading programs…
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Institute', 'Level', 'Label', 'Course', 'Tuition', 'Currency', ''].map((col) => (
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
              {programs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-gray-400">
                    No programs yet — add one above.
                  </td>
                </tr>
              ) : (
                programs.map((prog) => (
                  <tr
                    key={prog.id}
                    onClick={() => openEdit(prog)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 text-gray-600">
                      {instituteMap[prog.institute_id] ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <LevelBadge category={prog.level_category} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">{prog.level_label ?? '—'}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{prog.course_name}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {prog.tuition_fee != null ? prog.tuition_fee.toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{prog.currency ?? '—'}</td>
                    <td
                      className="px-5 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => handleDelete(e, prog)}
                        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        Delete
                      </button>
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
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-[520px] flex-col bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'Add Program' : `Edit: ${selected?.course_name}`}
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

                <Field label="Institute" required>
                  <select
                    className={INPUT}
                    name="institute_id"
                    value={form.institute_id}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">Select institute…</option>
                    {institutes.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Level Category" required>
                    <select
                      className={INPUT}
                      name="level_category"
                      value={form.level_category}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">Select category…</option>
                      {Object.entries(LEVEL_CATEGORY_META).map(([value, { label }]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Level Label">
                    <input
                      className={INPUT}
                      name="level_label"
                      value={form.level_label}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g. N5, IELTS Prep"
                    />
                  </Field>
                </div>

                <Field label="Course Name" required>
                  <input
                    className={INPUT}
                    name="course_name"
                    value={form.course_name}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. Computer Science BSc"
                  />
                </Field>

                <Field label="Department">
                  <input
                    className={INPUT}
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. Faculty of Engineering"
                  />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Field label="Tuition Fee">
                      <input
                        className={INPUT}
                        type="number"
                        name="tuition_fee"
                        value={form.tuition_fee}
                        onChange={handleChange}
                        disabled={saving}
                        min={0}
                        placeholder="e.g. 800000"
                      />
                    </Field>
                  </div>
                  <Field label="Currency">
                    <input
                      className={INPUT}
                      name="currency"
                      value={form.currency}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="JPY"
                      maxLength={3}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Admission Cost">
                    <input
                      className={INPUT}
                      type="number"
                      name="admission_cost"
                      value={form.admission_cost}
                      onChange={handleChange}
                      disabled={saving}
                      min={0}
                      placeholder="e.g. 50000"
                    />
                  </Field>

                  <Field label="Enrollment Cost">
                    <input
                      className={INPUT}
                      type="number"
                      name="enrollment_cost"
                      value={form.enrollment_cost}
                      onChange={handleChange}
                      disabled={saving}
                      min={0}
                      placeholder="e.g. 30000"
                    />
                  </Field>
                </div>

                <Field label="Duration (months)">
                  <input
                    className={INPUT}
                    type="number"
                    name="duration_months"
                    value={form.duration_months}
                    onChange={handleChange}
                    disabled={saving}
                    min={1}
                    placeholder="e.g. 24"
                  />
                </Field>

                {/* Requirements section */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Requirements
                  </h4>

                  <Field label="Language Test Accepted">
                    <select
                      className={INPUT}
                      name="language_test_accepted"
                      value={form.language_test_accepted}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— none / not specified —</option>
                      {['IELTS','TOEFL','JLPT','JFT-Basic','Duolingo','PTE','TOEIC','MOI Accepted','Any','None'].map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Minimum Language Level">
                    <input
                      className={INPUT}
                      name="min_language_level"
                      value={form.min_language_level}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g. IELTS 6.5, N2, TOEFL 80"
                    />
                  </Field>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="moi_accepted"
                      checked={form.moi_accepted}
                      onChange={handleChange}
                      disabled={saving}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">
                      MOI (Medium of Instruction) letter accepted in lieu of a test
                    </span>
                  </label>
                </div>

                {/* Sessions section — edit mode only */}
                {panel === 'edit' && (
                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Sessions
                    </h4>

                    {sessionsLoading ? (
                      <p className="text-xs text-gray-400">Loading sessions…</p>
                    ) : sessions.length === 0 ? (
                      <p className="text-xs text-gray-400">No sessions yet.</p>
                    ) : (
                      <ul className="mb-3 space-y-2">
                        {sessions.map((s) => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-xs"
                          >
                            <div>
                              <span className="font-medium text-gray-800">{s.session_name}</span>
                              {s.start_date && (
                                <span className="ml-2 text-gray-500">Starts {s.start_date}</span>
                              )}
                              {s.application_deadline && (
                                <span className="ml-2 text-gray-500">Deadline {s.application_deadline}</span>
                              )}
                              {s.seats != null && (
                                <span className="ml-2 text-gray-500">{s.seats} seats</span>
                              )}
                              <span className={`ml-2 font-semibold ${s.is_open ? 'text-emerald-600' : 'text-gray-400'}`}>
                                {s.is_open ? 'Open' : 'Closed'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSession(s)}
                              className="ml-2 rounded px-1.5 py-0.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Add session form */}
                    {sessionError && (
                      <p className="mb-2 text-xs text-red-600">{sessionError}</p>
                    )}
                    <div className="space-y-3">
                      <Field label="Session Name" required>
                        <input
                          className={INPUT + ' text-xs'}
                          name="session_name"
                          value={sessionForm.session_name}
                          onChange={handleSessionChange}
                          placeholder="e.g. April 2025"
                          disabled={addingSession}
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Start Date">
                          <input
                            className={INPUT + ' text-xs'}
                            type="date"
                            name="start_date"
                            value={sessionForm.start_date}
                            onChange={handleSessionChange}
                            disabled={addingSession}
                          />
                        </Field>
                        <Field label="Application Deadline">
                          <input
                            className={INPUT + ' text-xs'}
                            type="date"
                            name="application_deadline"
                            value={sessionForm.application_deadline}
                            onChange={handleSessionChange}
                            disabled={addingSession}
                          />
                        </Field>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <span className={LABEL}>Seats</span>
                          <input
                            className={INPUT + ' text-xs'}
                            type="number"
                            name="seats"
                            value={sessionForm.seats}
                            onChange={handleSessionChange}
                            placeholder="—"
                            min={1}
                            disabled={addingSession}
                            style={{ maxWidth: '90px' }}
                          />
                        </div>
                        <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer mt-4">
                          <input
                            type="checkbox"
                            name="is_open"
                            checked={sessionForm.is_open}
                            onChange={handleSessionChange}
                            disabled={addingSession}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600"
                          />
                          Open
                        </label>
                        <button
                          type="button"
                          onClick={handleAddSession}
                          disabled={addingSession}
                          className="ml-auto mt-4 rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-white
                                     hover:bg-gray-800 disabled:opacity-50"
                        >
                          {addingSession ? 'Adding…' : '+ Add Session'}
                        </button>
                      </div>
                    </div>
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
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Program' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
