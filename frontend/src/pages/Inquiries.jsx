import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// ── constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name:                '',
  phone:               '',
  email:               '',
  source:              '',
  interest_country_id: '',
  interest_level:      '',
  status:              'new',
  follow_up_date:      '',
  notes:               '',
};

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'converted', 'lost'];

const STATUS_LABELS = {
  new:       'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  lost:      'Lost',
};

const SOURCE_OPTIONS = [
  { value: 'facebook',  label: 'Facebook' },
  { value: 'walk_in',   label: 'Walk-in' },
  { value: 'referral',  label: 'Referral' },
  { value: 'website',   label: 'Website' },
  { value: 'other',     label: 'Other' },
];

const LEVEL_OPTIONS = [
  { value: 'bachelors', label: "Bachelor's" },
  { value: 'masters',   label: "Master's" },
  { value: 'phd',       label: 'PhD' },
  { value: 'language',  label: 'Language' },
];

function buildPayload(form) {
  const p = { name: form.name.trim(), status: form.status || 'new' };
  if (form.phone.trim())          p.phone               = form.phone.trim();
  if (form.email.trim())          p.email               = form.email.trim();
  if (form.source)                p.source              = form.source;
  if (form.interest_country_id)   p.interest_country_id = Number(form.interest_country_id);
  if (form.interest_level)        p.interest_level      = form.interest_level;
  if (form.follow_up_date)        p.follow_up_date      = form.follow_up_date;
  if (form.notes.trim())          p.notes               = form.notes.trim();
  return p;
}

// ── shared input styles ───────────────────────────────────────────────────────

const INPUT =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
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

function StatusBadge({ status }) {
  const palette = {
    new:       'bg-gray-100 text-gray-600',
    contacted: 'bg-blue-100 text-blue-700',
    qualified: 'bg-indigo-100 text-indigo-700',
    converted: 'bg-emerald-100 text-emerald-700',
    lost:      'bg-red-100 text-red-600',
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        palette[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function Inquiries() {
  const [inquiries,  setInquiries]  = useState([]);
  const [countries,  setCountries]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [filter,     setFilter]     = useState('all');

  const [panel,      setPanel]      = useState(null); // null | 'add' | 'edit'
  const [selected,   setSelected]   = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState(null);

  // ── data loading ───────────────────────────────────────────────────────────

  function loadInquiries() {
    return api.get('/inquiries').then(setInquiries);
  }

  useEffect(() => {
    Promise.all([api.get('/inquiries'), api.get('/countries')])
      .then(([inqs, cntrs]) => {
        setInquiries(inqs);
        setCountries(cntrs);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const countryMap = Object.fromEntries(countries.map((c) => [c.id, c.name]));

  const visible = filter === 'all'
    ? inquiries
    : inquiries.filter((i) => i.status === filter);

  // ── panel helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setPanel('add');
  }

  function openEdit(inquiry) {
    setForm({
      name:                inquiry.name                ?? '',
      phone:               inquiry.phone               ?? '',
      email:               inquiry.email               ?? '',
      source:              inquiry.source              ?? '',
      interest_country_id: inquiry.interest_country_id ?? '',
      interest_level:      inquiry.interest_level      ?? '',
      status:              inquiry.status              ?? 'new',
      follow_up_date:      inquiry.follow_up_date      ?? '',
      notes:               inquiry.notes               ?? '',
    });
    setFormError(null);
    setSelected(inquiry);
    setPanel('edit');
  }

  function closePanel() {
    setPanel(null);
    setSelected(null);
    setFormError(null);
  }

  // ── form handlers ──────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
        await api.post('/inquiries', payload);
      } else {
        await api.patch(`/inquiries/${selected.id}`, payload);
      }
      await loadInquiries();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, inquiry) {
    e.stopPropagation();
    if (!window.confirm(`Delete inquiry for "${inquiry.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/inquiries/${inquiry.id}`);
      setInquiries((prev) => prev.filter((i) => i.id !== inquiry.id));
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
          <h2 className="text-2xl font-semibold text-gray-900">Inquiries</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{inquiries.length} total</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Inquiry
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
          Loading inquiries…
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Status filter row */}
          <div className="mb-4 flex flex-wrap gap-2">
            {['all', ...STATUS_OPTIONS].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
                {s !== 'all' && (
                  <span className="ml-1 text-current opacity-70">
                    ({inquiries.filter((i) => i.status === s).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Phone', 'Source', 'Interest Country', 'Status', 'Follow-up Date', ''].map((col) => (
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
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-sm text-gray-400">
                      {filter === 'all'
                        ? 'No inquiries yet — add one above.'
                        : `No ${STATUS_LABELS[filter].toLowerCase()} inquiries.`}
                    </td>
                  </tr>
                ) : (
                  visible.map((inq) => (
                    <tr
                      key={inq.id}
                      onClick={() => openEdit(inq)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">{inq.name}</td>
                      <td className="px-5 py-3 text-gray-600">{inq.phone ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {inq.source
                          ? (SOURCE_OPTIONS.find((s) => s.value === inq.source)?.label ?? inq.source)
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {inq.interest_country_id
                          ? (countryMap[inq.interest_country_id] ?? '—')
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={inq.status} />
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {inq.follow_up_date ?? '—'}
                      </td>
                      <td
                        className="px-5 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleDelete(e, inq)}
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
        </>
      )}

      {/* ── Slide-in panel ──────────────────────────────────────────────────── */}
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
                {panel === 'add' ? 'Add Inquiry' : `Edit: ${selected?.name}`}
              </h3>
              <button
                onClick={closePanel}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Form error banner */}
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

                {/* Name */}
                <Field label="Name" required>
                  <input
                    className={INPUT}
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. Rahim Uddin"
                  />
                </Field>

                {/* Phone + Email */}
                <div className="grid grid-cols-2 gap-4">
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
                  <Field label="Email">
                    <input
                      className={INPUT}
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="email@example.com"
                    />
                  </Field>
                </div>

                {/* Source */}
                <Field label="Source">
                  <select
                    className={INPUT}
                    name="source"
                    value={form.source}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">— select —</option>
                    {SOURCE_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </Field>

                {/* Interest Country + Level */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Interest Country">
                    <select
                      className={INPUT}
                      name="interest_country_id"
                      value={form.interest_country_id}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— none —</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Interest Level">
                    <select
                      className={INPUT}
                      name="interest_level"
                      value={form.interest_level}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— none —</option>
                      {LEVEL_OPTIONS.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Status + Follow-up Date */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Status">
                    <select
                      className={INPUT}
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Follow-up Date">
                    <input
                      className={INPUT}
                      type="date"
                      name="follow_up_date"
                      value={form.follow_up_date}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </Field>
                </div>

                {/* Notes */}
                <Field label="Notes">
                  <textarea
                    className={INPUT}
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    disabled={saving}
                    rows={4}
                    placeholder="Any additional notes about this lead…"
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
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Inquiry' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
