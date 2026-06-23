import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// ── constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  country_id: '',
  category_code: '',
  is_ssw: false,
  description: '',
};

function buildPayload(form) {
  const p = {
    name: form.name.trim(),
    is_ssw: form.is_ssw,
  };
  if (form.country_id)            p.country_id    = Number(form.country_id);
  if (form.category_code.trim())  p.category_code = form.category_code.trim();
  if (form.description.trim())    p.description   = form.description.trim();
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

function CheckRow({ id, label, checked, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={id}
        name={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <label htmlFor={id} className="text-sm text-gray-700 cursor-pointer select-none">
        {label}
      </label>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function Industries() {
  const [industries,  setIndustries]  = useState([]);
  const [countries,   setCountries]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const [panel,       setPanel]       = useState(null); // null | 'add' | 'edit'
  const [selected,    setSelected]    = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState(null);

  // ── data loading ───────────────────────────────────────────────────────────

  function loadIndustries() {
    return api.get('/industries').then(setIndustries);
  }

  useEffect(() => {
    Promise.all([
      api.get('/industries'),
      api.get('/countries'),
    ])
      .then(([inds, cntrs]) => {
        setIndustries(inds);
        setCountries(cntrs);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const countryMap = Object.fromEntries(countries.map((c) => [c.id, c.name]));

  // ── panel helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setPanel('add');
  }

  function openEdit(ind) {
    setForm({
      name:          ind.name          ?? '',
      country_id:    ind.country_id?.toString() ?? '',
      category_code: ind.category_code ?? '',
      is_ssw:        ind.is_ssw        ?? false,
      description:   ind.description   ?? '',
    });
    setFormError(null);
    setSelected(ind);
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
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = buildPayload(form);
      if (panel === 'add') {
        await api.post('/industries', payload);
      } else {
        await api.patch(`/industries/${selected.id}`, payload);
      }
      await loadIndustries();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, ind) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${ind.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/industries/${ind.id}`);
      setIndustries((prev) => prev.filter((x) => x.id !== ind.id));
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
          <h2 className="text-2xl font-semibold text-gray-900">Industries</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{industries.length} industry fields</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Industry
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
          Loading industries…
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Country', 'SSW', 'Category Code', ''].map((col) => (
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
              {industries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-gray-400">
                    No industry fields yet — add one above.
                  </td>
                </tr>
              ) : (
                industries.map((ind) => (
                  <tr
                    key={ind.id}
                    onClick={() => openEdit(ind)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{ind.name}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {ind.country_id ? (countryMap[ind.country_id] ?? '—') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {ind.is_ssw ? (
                        <span className="font-medium text-emerald-600">Yes</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{ind.category_code ?? '—'}</td>
                    <td
                      className="px-5 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => handleDelete(e, ind)}
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
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closePanel}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-[520px] flex-col bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'Add Industry Field' : `Edit: ${selected?.name}`}
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
            <form
              onSubmit={handleSubmit}
              className="flex flex-1 flex-col overflow-y-auto"
            >
              <div className="flex-1 space-y-4 px-6 py-5">

                <Field label="Name" required>
                  <input
                    className={INPUT}
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. Nursing Care"
                  />
                </Field>

                <Field label="Country">
                  <select
                    className={INPUT}
                    name="country_id"
                    value={form.country_id}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">— none —</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Category Code">
                  <input
                    className={INPUT}
                    name="category_code"
                    value={form.category_code}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. SSW-01"
                  />
                </Field>

                <div className="pt-1">
                  <CheckRow
                    id="is_ssw"
                    label="Official SSW field"
                    checked={form.is_ssw}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>

                <Field label="Description">
                  <textarea
                    className={INPUT}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    disabled={saving}
                    rows={3}
                    placeholder="Brief description of this industry field…"
                  />
                </Field>

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
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Industry' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
