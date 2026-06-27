import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const CAN_DELETE = ['owner', 'manager'];

const EMPTY_FORM = {
  name: '',
  description: '',
  default_fee: '',
  currency: 'BDT',
  is_active: true,
};

function buildPayload(form) {
  const p = { name: form.name.trim(), is_active: form.is_active };
  if (form.description.trim()) p.description = form.description.trim();
  if (form.default_fee !== '') p.default_fee = Number(form.default_fee);
  if (form.currency.trim()) p.currency = form.currency.trim();
  return p;
}

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

export default function Courses() {
  const { user } = useAuth();
  const canDelete = CAN_DELETE.includes(user?.role);

  const [courses,   setCourses]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const [panel,     setPanel]     = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState(null);

  function loadCourses() {
    return api.get('/courses').then(setCourses);
  }

  useEffect(() => {
    api.get('/courses')
      .then(setCourses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setPanel('add');
  }

  function openEdit(course) {
    setForm({
      name:        course.name        ?? '',
      description: course.description ?? '',
      default_fee: course.default_fee != null ? String(course.default_fee) : '',
      currency:    course.currency    ?? 'BDT',
      is_active:   course.is_active   ?? true,
    });
    setFormError(null);
    setSelected(course);
    setPanel('edit');
  }

  function closePanel() {
    setPanel(null);
    setSelected(null);
    setFormError(null);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Course name is required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload = buildPayload(form);
      if (panel === 'add') {
        await api.post('/courses', payload);
      } else {
        await api.patch(`/courses/${selected.id}`, payload);
      }
      await loadCourses();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, course) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${course.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/courses/${course.id}`);
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    } catch (err) {
      alert(err.message || 'Delete failed.');
    }
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Courses</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">
              {courses.length} course{courses.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Course
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">
          Loading courses…
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Description', 'Default Fee', 'Active', ''].map((col) => (
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
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-gray-400">
                    No courses yet — add one above.
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr
                    key={course.id}
                    onClick={() => openEdit(course)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{course.name}</td>
                    <td className="max-w-xs truncate px-5 py-3 text-gray-600">
                      {course.description
                        ? course.description.slice(0, 70) + (course.description.length > 70 ? '…' : '')
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {fmt(course.default_fee, course.currency)}
                    </td>
                    <td className="px-5 py-3">
                      {course.is_active ? (
                        <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td
                      className="px-5 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canDelete && (
                        <button
                          onClick={(e) => handleDelete(e, course)}
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
      )}

      {/* Slide-in panel */}
      {panel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />

          <div className="fixed inset-y-0 right-0 z-50 flex w-[480px] flex-col bg-white shadow-2xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'Add Course' : `Edit: ${selected?.name}`}
              </h3>
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
                <Field label="Course Name" required>
                  <input
                    className={INPUT}
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. JLPT N5"
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    className={INPUT}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    disabled={saving}
                    rows={3}
                    placeholder="Brief description of what this course covers…"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Default Fee (৳)">
                    <input
                      className={INPUT}
                      type="number"
                      min="0"
                      step="any"
                      name="default_fee"
                      value={form.default_fee}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Currency">
                    <input
                      className={INPUT}
                      name="currency"
                      value={form.currency}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="BDT"
                    />
                  </Field>
                </div>

                <div className="flex items-center gap-2 pt-1">
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
                    className="cursor-pointer select-none text-sm text-gray-700"
                  >
                    Active
                  </label>
                </div>
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
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Course' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
