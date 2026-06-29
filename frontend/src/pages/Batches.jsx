import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const FINANCE_ROLES = ['owner', 'manager', 'accountant'];
const CAN_DELETE    = ['owner', 'manager'];

const BATCH_STATUS_PALETTE = {
  planned:   'bg-gray-100 text-gray-600',
  running:   'bg-green-100 text-green-700',
  completed: 'bg-indigo-100 text-indigo-700',
  cancelled: 'bg-red-100 text-red-600',
};

const PAYMENT_PALETTE = {
  pending: 'bg-amber-50 text-amber-700',
  partial: 'bg-blue-50 text-blue-700',
  paid:    'bg-emerald-50 text-emerald-700',
};

const EMPTY_FORM = {
  course_id:     '',
  name:          '',
  start_date:    '',
  end_date:      '',
  status:        'planned',
  instructor_id: '',
  notes:         '',
};

const INPUT =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-400';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';

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

function fmt(amount, currency = 'BDT') {
  if (amount == null || amount === '') return '—';
  return `${currency === 'BDT' ? '৳' : currency} ${Number(amount).toLocaleString('en-IN')}`;
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        BATCH_STATUS_PALETTE[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status ?? '—'}
    </span>
  );
}

function PayBadge({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        PAYMENT_PALETTE[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status ?? '—'}
    </span>
  );
}

export default function Batches() {
  const { user }  = useAuth();
  const isFinance = FINANCE_ROLES.includes(user?.role);
  const canDelete = CAN_DELETE.includes(user?.role);

  const [batches,       setBatches]       = useState([]);
  const [courses,       setCourses]       = useState([]);
  const [instructors,   setInstructors]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [filterCourse,  setFilterCourse]  = useState('');

  const [panel,         setPanel]         = useState(null); // null | 'add' | 'detail'
  const [selected,      setSelected]      = useState(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [saving,        setSaving]        = useState(false);
  const [formError,     setFormError]     = useState(null);

  const [detailData,    setDetailData]    = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError,   setDetailError]   = useState(null);
  const [editMode,      setEditMode]      = useState(false);
  const [editForm,      setEditForm]      = useState({});
  const [editSaving,    setEditSaving]    = useState(false);
  const [editError,     setEditError]     = useState(null);

  function loadBatches(courseId) {
    const url = courseId ? `/batches?course_id=${courseId}` : '/batches';
    return api.get(url).then(setBatches);
  }

  useEffect(() => {
    Promise.all([api.get('/courses'), api.get('/batches'), api.get('/instructors')])
      .then(([cs, bs, is_]) => { setCourses(cs); setBatches(bs); setInstructors(is_); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleFilterChange(e) {
    const courseId = e.target.value;
    setFilterCourse(courseId);
    try {
      await loadBatches(courseId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function openDetail(batch) {
    setSelected(batch);
    setPanel('detail');
    setDetailData(null);
    setDetailError(null);
    setDetailLoading(true);
    setEditMode(false);
    setEditError(null);
    try {
      const data = await api.get(`/batches/${batch.id}`);
      setDetailData(data);
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setPanel('add');
  }

  function closePanel() {
    setPanel(null);
    setSelected(null);
    setDetailData(null);
    setDetailError(null);
    setEditMode(false);
    setEditError(null);
    setFormError(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.course_id)    { setFormError('Please select a course.'); return; }
    if (!form.name.trim())  { setFormError('Batch name is required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload = { course_id: form.course_id, name: form.name.trim(), status: form.status };
      if (form.start_date)     payload.start_date    = form.start_date;
      if (form.end_date)       payload.end_date      = form.end_date;
      if (form.notes.trim())   payload.notes         = form.notes.trim();
      payload.instructor_id = form.instructor_id || null;
      await api.post('/batches', payload);
      await loadBatches(filterCourse);
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, batch) {
    e.stopPropagation();
    if (!window.confirm(
      'Delete this batch? Students will be un-assigned (their enrollments remain).'
    )) return;
    try {
      await api.delete(`/batches/${batch.id}`);
      setBatches((prev) => prev.filter((b) => b.id !== batch.id));
      if (panel === 'detail' && selected?.id === batch.id) closePanel();
    } catch (err) {
      alert(err.message || 'Delete failed.');
    }
  }

  function startEdit() {
    setEditForm({
      name:          detailData?.name          ?? '',
      start_date:    detailData?.start_date    ?? '',
      end_date:      detailData?.end_date      ?? '',
      status:        detailData?.status        ?? 'planned',
      instructor_id: detailData?.instructor_id ?? '',
      notes:         detailData?.notes         ?? '',
    });
    setEditError(null);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setEditError(null);
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSaveEdit() {
    if (!editForm.name.trim()) { setEditError('Batch name is required.'); return; }
    setEditSaving(true);
    setEditError(null);
    try {
      const payload = {
        name:          editForm.name.trim(),
        status:        editForm.status,
        start_date:    editForm.start_date    || null,
        end_date:      editForm.end_date      || null,
        notes:         editForm.notes.trim()  || null,
        instructor_id: editForm.instructor_id || null,
      };
      const updated = await api.patch(`/batches/${selected.id}`, payload);
      setDetailData((prev) => ({ ...prev, ...updated }));
      setBatches((prev) => prev.map((b) => b.id === selected.id ? { ...b, ...updated } : b));
      setSelected((prev) => ({ ...prev, ...updated }));
      setEditMode(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  const roster = detailData?.roster ?? [];

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Batches</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">
              {batches.length} batch{batches.length !== 1 ? 'es' : ''}
            </p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Batch
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">
          Loading batches…
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Course filter */}
          <div className="mb-4 flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600">Filter by course:</label>
            <select
              value={filterCourse}
              onChange={handleFilterChange}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm
                         focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Batch Name', 'Course', 'Instructor', 'Start Date', 'Status', 'Students', ''].map((col) => (
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
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-sm text-gray-400">
                      No batches yet — add one above.
                    </td>
                  </tr>
                ) : (
                  batches.map((batch) => (
                    <tr
                      key={batch.id}
                      onClick={() => openDetail(batch)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">{batch.name}</td>
                      <td className="px-5 py-3 text-gray-600">{batch.course_name ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{batch.instructor_name ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{batch.start_date ?? '—'}</td>
                      <td className="px-5 py-3"><StatusBadge status={batch.status} /></td>
                      <td className="px-5 py-3 font-medium text-gray-700">{batch.student_count ?? 0}</td>
                      <td
                        className="px-5 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canDelete && (
                          <button
                            onClick={(e) => handleDelete(e, batch)}
                            className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Add Batch drawer ─────────────────────────────────────────────── */}
      {panel === 'add' && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />

          <div className="fixed inset-y-0 right-0 z-50 flex w-[480px] flex-col bg-white shadow-2xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">Add Batch</h3>
              <button
                onClick={closePanel}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-4 px-6 py-5">
                <Field label="Course" required>
                  <select
                    className={INPUT}
                    name="course_id"
                    value={form.course_id}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">— select a course —</option>
                    {courses.filter((c) => c.is_active).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Batch Name" required>
                  <input
                    className={INPUT}
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. April 2026 JLPT N5"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start Date">
                    <input
                      className={INPUT}
                      type="date"
                      name="start_date"
                      value={form.start_date}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </Field>
                  <Field label="End Date">
                    <input
                      className={INPUT}
                      type="date"
                      name="end_date"
                      value={form.end_date}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </Field>
                </div>

                <Field label="Status">
                  <select
                    className={INPUT}
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="planned">Planned</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </Field>

                <Field label="Instructor (optional)">
                  <select
                    className={INPUT}
                    name="instructor_id"
                    value={form.instructor_id}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">— none —</option>
                    {instructors.filter((i) => i.is_active).map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.full_name}{i.specialization ? ` (${i.specialization})` : ''}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Notes">
                  <textarea
                    className={INPUT}
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    disabled={saving}
                    rows={3}
                    placeholder="Internal notes…"
                  />
                </Field>
              </div>

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
                  {saving ? 'Saving…' : 'Add Batch'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Batch Detail drawer ──────────────────────────────────────────── */}
      {panel === 'detail' && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />

          <div className="fixed inset-y-0 right-0 z-50 flex w-[640px] flex-col bg-white shadow-2xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="truncate text-base font-semibold text-gray-900">{selected?.name}</h3>
              <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                {canDelete && (
                  <button
                    onClick={(e) => handleDelete(e, selected)}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={closePanel}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto">
              {detailLoading && (
                <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                  Loading batch details…
                </div>
              )}
              {detailError && (
                <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {detailError}
                </div>
              )}

              {detailData && !detailLoading && (
                <>
                  {/* Batch info section */}
                  <div className="border-b border-gray-100 px-6 py-5">
                    {!editMode ? (
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={detailData.status} />
                            <span className="text-xs text-gray-500">{detailData.course_name ?? '—'}</span>
                            {detailData.instructor_name && (
                              <span className="text-xs text-indigo-600">· {detailData.instructor_name}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            {detailData.start_date && <span>Start: {detailData.start_date}</span>}
                            {detailData.end_date   && <span>End: {detailData.end_date}</span>}
                          </div>
                          {detailData.notes && (
                            <p className="text-xs text-gray-500">{detailData.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={startEdit}
                          className="ml-4 flex-shrink-0 rounded-md border border-gray-300 px-3 py-1.5
                                     text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {editError && (
                          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            {editError}
                          </div>
                        )}
                        <Field label="Batch Name" required>
                          <input
                            className={INPUT}
                            name="name"
                            value={editForm.name}
                            onChange={handleEditChange}
                            disabled={editSaving}
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Start Date">
                            <input
                              className={INPUT}
                              type="date"
                              name="start_date"
                              value={editForm.start_date}
                              onChange={handleEditChange}
                              disabled={editSaving}
                            />
                          </Field>
                          <Field label="End Date">
                            <input
                              className={INPUT}
                              type="date"
                              name="end_date"
                              value={editForm.end_date}
                              onChange={handleEditChange}
                              disabled={editSaving}
                            />
                          </Field>
                        </div>
                        <Field label="Status">
                          <select
                            className={INPUT}
                            name="status"
                            value={editForm.status}
                            onChange={handleEditChange}
                            disabled={editSaving}
                          >
                            <option value="planned">Planned</option>
                            <option value="running">Running</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </Field>
                        <Field label="Instructor (optional)">
                          <select
                            className={INPUT}
                            name="instructor_id"
                            value={editForm.instructor_id}
                            onChange={handleEditChange}
                            disabled={editSaving}
                          >
                            <option value="">— none —</option>
                            {instructors.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.full_name}{i.specialization ? ` (${i.specialization})` : ''}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Notes">
                          <textarea
                            className={INPUT}
                            name="notes"
                            value={editForm.notes}
                            onChange={handleEditChange}
                            disabled={editSaving}
                            rows={2}
                          />
                        </Field>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={editSaving}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium
                                       text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={editSaving}
                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium
                                       text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {editSaving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Headcount + finance strip */}
                  <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{detailData.headcount ?? 0}</p>
                        <p className="text-xs text-gray-500">students</p>
                      </div>
                      {isFinance && detailData.roster_total_fees != null && (
                        <>
                          <div className="h-8 w-px bg-gray-200" />
                          <div>
                            <p className="text-xs text-gray-500">Total Fees</p>
                            <p className="text-sm font-semibold text-gray-800">
                              {fmt(detailData.roster_total_fees)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total Paid</p>
                            <p className="text-sm font-semibold text-emerald-700">
                              {fmt(detailData.roster_total_paid)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Remaining</p>
                            <p
                              className={`text-sm font-semibold ${
                                (detailData.roster_total_remaining ?? 0) > 0
                                  ? 'text-amber-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {fmt(detailData.roster_total_remaining)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Roster */}
                  <div className="px-6 py-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Roster
                    </p>
                    {roster.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        No students assigned to this batch yet.
                      </p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Student
                              </th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Phone
                              </th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Payment
                              </th>
                              {isFinance && (
                                <>
                                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Fee
                                  </th>
                                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Paid
                                  </th>
                                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Remaining
                                  </th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {roster.map((row) => (
                              <tr key={row.enrollment_id} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 font-medium text-gray-800">
                                  {row.course_student_name ?? '—'}
                                </td>
                                <td className="px-4 py-2.5 text-gray-600">
                                  {row.course_student_phone ?? '—'}
                                </td>
                                <td className="px-4 py-2.5">
                                  <PayBadge status={row.payment_status} />
                                </td>
                                {isFinance && (
                                  <>
                                    <td className="px-4 py-2.5 text-right text-gray-700">
                                      {fmt(row.agreed_fee, row.currency ?? 'BDT')}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-emerald-700">
                                      {fmt(row.total_paid, row.currency ?? 'BDT')}
                                    </td>
                                    <td
                                      className={`px-4 py-2.5 text-right font-medium ${
                                        (row.remaining ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-700'
                                      }`}
                                    >
                                      {fmt(row.remaining, row.currency ?? 'BDT')}
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-shrink-0 items-center justify-end border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={closePanel}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium
                           text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
