import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// ── constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  country_id: '',
  type: '',
  ownership: '',
  city: '',
  global_ranking: '',
  living_expense_est: '',
  living_expense_cur: '',
  has_dormitory: false,
  services: '',
  notes: '',
};

const TYPE_META = {
  university:      { label: 'University',      cls: 'bg-indigo-50 text-indigo-700' },
  language_school: { label: 'Language School', cls: 'bg-emerald-50 text-emerald-700' },
  diploma:         { label: 'Diploma',         cls: 'bg-amber-50 text-amber-700' },
};

// Build the POST body (omit truly-empty optional fields).
// Build the PATCH body the same way; clearing optional fields would require
// a backend change to accept explicit nulls — deferred.
function buildPayload(form) {
  const p = {
    name: form.name.trim(),
    country_id: Number(form.country_id),
    type: form.type,
    has_dormitory: form.has_dormitory,
  };
  if (form.ownership)                p.ownership           = form.ownership;
  if (form.city.trim())              p.city                = form.city.trim();
  if (form.global_ranking !== '')    p.global_ranking      = Number(form.global_ranking);
  if (form.living_expense_est !== '') p.living_expense_est = Number(form.living_expense_est);
  if (form.living_expense_cur.trim()) p.living_expense_cur = form.living_expense_cur.trim();
  if (form.services.trim())          p.services            = form.services.trim();
  if (form.notes.trim())             p.notes               = form.notes.trim();
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

function TypeBadge({ type }) {
  const m = TYPE_META[type] ?? { label: type, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function Institutes() {
  const [institutes, setInstitutes] = useState([]);
  const [countries,  setCountries]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const [panel,      setPanel]      = useState(null); // null | 'add' | 'edit'
  const [selected,   setSelected]   = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState(null);

  // ── data loading ───────────────────────────────────────────────────────────

  function loadInstitutes() {
    return api.get('/institutes').then(setInstitutes);
  }

  useEffect(() => {
    Promise.all([api.get('/institutes'), api.get('/countries')])
      .then(([insts, cntrs]) => { setInstitutes(insts); setCountries(cntrs); })
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

  function openEdit(inst) {
    setForm({
      name:               inst.name               ?? '',
      country_id:         inst.country_id?.toString() ?? '',
      type:               inst.type               ?? '',
      ownership:          inst.ownership           ?? '',
      city:               inst.city               ?? '',
      global_ranking:     inst.global_ranking?.toString()     ?? '',
      living_expense_est: inst.living_expense_est?.toString() ?? '',
      living_expense_cur: inst.living_expense_cur ?? '',
      has_dormitory:      inst.has_dormitory       ?? false,
      services:           inst.services            ?? '',
      notes:              inst.notes               ?? '',
    });
    setFormError(null);
    setSelected(inst);
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
    if (!form.name.trim() || !form.country_id || !form.type) {
      setFormError('Name, country, and type are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = buildPayload(form);
      if (panel === 'add') {
        await api.post('/institutes', payload);
      } else {
        await api.patch(`/institutes/${selected.id}`, payload);
      }
      await loadInstitutes();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, inst) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${inst.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/institutes/${inst.id}`);
      setInstitutes((prev) => prev.filter((i) => i.id !== inst.id));
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
          <h2 className="text-2xl font-semibold text-gray-900">Institutes</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{institutes.length} institutes</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Institute
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
          Loading institutes…
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Type', 'Country', 'City', 'Dormitory', ''].map((col) => (
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
              {institutes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-gray-400">
                    No institutes yet — add one above.
                  </td>
                </tr>
              ) : (
                institutes.map((inst) => (
                  <tr
                    key={inst.id}
                    onClick={() => openEdit(inst)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{inst.name}</td>
                    <td className="px-5 py-3">
                      <TypeBadge type={inst.type} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {countryMap[inst.country_id] ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{inst.city ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {inst.has_dormitory ? (
                        <span className="font-medium text-emerald-600">Yes</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td
                      className="px-5 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => handleDelete(e, inst)}
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
          <div className="fixed inset-y-0 right-0 z-50 flex w-[480px] flex-col bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'Add Institute' : `Edit: ${selected?.name}`}
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
                    placeholder="e.g. University of Tokyo"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Country" required>
                    <select
                      className={INPUT}
                      name="country_id"
                      value={form.country_id}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">Select country…</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Type" required>
                    <select
                      className={INPUT}
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">Select type…</option>
                      <option value="university">University</option>
                      <option value="language_school">Language School</option>
                      <option value="diploma">Diploma</option>
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ownership">
                    <select
                      className={INPUT}
                      name="ownership"
                      value={form.ownership}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— optional —</option>
                      <option value="national">National</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </Field>

                  <Field label="City">
                    <input
                      className={INPUT}
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g. Tokyo"
                    />
                  </Field>
                </div>

                <Field label="Global Ranking">
                  <input
                    className={INPUT}
                    type="number"
                    name="global_ranking"
                    value={form.global_ranking}
                    onChange={handleChange}
                    disabled={saving}
                    min={1}
                    placeholder="e.g. 35"
                  />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Field label="Living Expense (est. monthly)">
                      <input
                        className={INPUT}
                        type="number"
                        name="living_expense_est"
                        value={form.living_expense_est}
                        onChange={handleChange}
                        disabled={saving}
                        min={0}
                        placeholder="e.g. 80000"
                      />
                    </Field>
                  </div>
                  <Field label="Currency">
                    <input
                      className={INPUT}
                      name="living_expense_cur"
                      value={form.living_expense_cur}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="JPY"
                      maxLength={3}
                    />
                  </Field>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="has_dormitory"
                    name="has_dormitory"
                    checked={form.has_dormitory}
                    onChange={handleChange}
                    disabled={saving}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="has_dormitory" className="text-sm text-gray-700 cursor-pointer">
                    Has dormitory
                  </label>
                </div>

                <Field label="Services">
                  <textarea
                    className={INPUT}
                    name="services"
                    value={form.services}
                    onChange={handleChange}
                    disabled={saving}
                    rows={2}
                    placeholder="e.g. Airport pickup, job support, language training…"
                  />
                </Field>

                <Field label="Notes">
                  <textarea
                    className={INPUT}
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    disabled={saving}
                    rows={2}
                    placeholder="Internal notes…"
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
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Institute' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
