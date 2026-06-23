import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// ── constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  country_id: '',
  industry_field_id: '',
  city: '',
  address: '',
  company_size: '',
  website: '',
  is_ssw_registered: false,
  accepts_foreign: true,
  housing_support: false,
  support_services: '',
  notes: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
};

function buildPayload(form) {
  const p = {
    name: form.name.trim(),
    country_id: Number(form.country_id),
    is_ssw_registered: form.is_ssw_registered,
    accepts_foreign: form.accepts_foreign,
    housing_support: form.housing_support,
  };
  if (form.industry_field_id)       p.industry_field_id  = Number(form.industry_field_id);
  if (form.city.trim())             p.city               = form.city.trim();
  if (form.address.trim())          p.address            = form.address.trim();
  if (form.company_size)            p.company_size       = form.company_size;
  if (form.website.trim())          p.website            = form.website.trim();
  if (form.support_services.trim()) p.support_services   = form.support_services.trim();
  if (form.notes.trim())            p.notes              = form.notes.trim();
  if (form.contact_name.trim())     p.contact_name       = form.contact_name.trim();
  if (form.contact_email.trim())    p.contact_email      = form.contact_email.trim();
  if (form.contact_phone.trim())    p.contact_phone      = form.contact_phone.trim();
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

export default function Employers() {
  const [employers,   setEmployers]   = useState([]);
  const [countries,   setCountries]   = useState([]);
  const [industries,  setIndustries]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const [panel,       setPanel]       = useState(null); // null | 'add' | 'edit'
  const [selected,    setSelected]    = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState(null);

  // ── data loading ───────────────────────────────────────────────────────────

  function loadEmployers() {
    return api.get('/employers').then(setEmployers);
  }

  useEffect(() => {
    Promise.all([
      api.get('/employers'),
      api.get('/countries'),
      api.get('/industries'),
    ])
      .then(([emps, cntrs, inds]) => {
        setEmployers(emps);
        setCountries(cntrs);
        setIndustries(inds);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const countryMap  = Object.fromEntries(countries.map((c) => [c.id, c.name]));
  const industryMap = Object.fromEntries(industries.map((i) => [i.id, i.name]));

  // ── panel helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setPanel('add');
  }

  function openEdit(emp) {
    setForm({
      name:               emp.name                         ?? '',
      country_id:         emp.country_id?.toString()       ?? '',
      industry_field_id:  emp.industry_field_id?.toString() ?? '',
      city:               emp.city                         ?? '',
      address:            emp.address                      ?? '',
      company_size:       emp.company_size                 ?? '',
      website:            emp.website                      ?? '',
      is_ssw_registered:  emp.is_ssw_registered            ?? false,
      accepts_foreign:    emp.accepts_foreign              ?? true,
      housing_support:    emp.housing_support              ?? false,
      support_services:   emp.support_services             ?? '',
      notes:              emp.notes                        ?? '',
      contact_name:       emp.contact_name                 ?? '',
      contact_email:      emp.contact_email                ?? '',
      contact_phone:      emp.contact_phone                ?? '',
    });
    setFormError(null);
    setSelected(emp);
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
    if (!form.name.trim() || !form.country_id) {
      setFormError('Name and country are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = buildPayload(form);
      if (panel === 'add') {
        await api.post('/employers', payload);
      } else {
        await api.patch(`/employers/${selected.id}`, payload);
      }
      await loadEmployers();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, emp) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${emp.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/employers/${emp.id}`);
      setEmployers((prev) => prev.filter((x) => x.id !== emp.id));
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
          <h2 className="text-2xl font-semibold text-gray-900">Employers</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{employers.length} employers</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Employer
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
          Loading employers…
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Country', 'Industry Field', 'City', 'SSW Registered', ''].map((col) => (
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
              {employers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-gray-400">
                    No employers yet — add one above.
                  </td>
                </tr>
              ) : (
                employers.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => openEdit(emp)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{emp.name}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {countryMap[emp.country_id] ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {emp.industry_field_id ? (industryMap[emp.industry_field_id] ?? '—') : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{emp.city ?? '—'}</td>
                    <td className="px-5 py-3">
                      {emp.is_ssw_registered ? (
                        <span className="font-medium text-emerald-600">Yes</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td
                      className="px-5 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => handleDelete(e, emp)}
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
                {panel === 'add' ? 'Add Employer' : `Edit: ${selected?.name}`}
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
                    placeholder="e.g. Yamada Manufacturing Co."
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

                  <Field label="Industry Field">
                    <select
                      className={INPUT}
                      name="industry_field_id"
                      value={form.industry_field_id}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— optional —</option>
                      {industries.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="City">
                    <input
                      className={INPUT}
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g. Osaka"
                    />
                  </Field>

                  <Field label="Company Size">
                    <select
                      className={INPUT}
                      name="company_size"
                      value={form.company_size}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— optional —</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </Field>
                </div>

                <Field label="Address">
                  <input
                    className={INPUT}
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Street address…"
                  />
                </Field>

                <Field label="Website">
                  <input
                    className={INPUT}
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="https://…"
                  />
                </Field>

                {/* Checkboxes */}
                <div className="space-y-2 pt-1">
                  <CheckRow
                    id="is_ssw_registered"
                    label="SSW Registered"
                    checked={form.is_ssw_registered}
                    onChange={handleChange}
                    disabled={saving}
                  />
                  <CheckRow
                    id="accepts_foreign"
                    label="Accepts foreign workers"
                    checked={form.accepts_foreign}
                    onChange={handleChange}
                    disabled={saving}
                  />
                  <CheckRow
                    id="housing_support"
                    label="Provides housing support"
                    checked={form.housing_support}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>

                <Field label="Support Services">
                  <textarea
                    className={INPUT}
                    name="support_services"
                    value={form.support_services}
                    onChange={handleChange}
                    disabled={saving}
                    rows={2}
                    placeholder="e.g. Airport pickup, visa assistance…"
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

                {/* Contact section */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Contact Person
                  </p>
                  <div className="space-y-3">
                    <Field label="Name">
                      <input
                        className={INPUT}
                        name="contact_name"
                        value={form.contact_name}
                        onChange={handleChange}
                        disabled={saving}
                        placeholder="e.g. Tanaka Hiroshi"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Email">
                        <input
                          className={INPUT}
                          type="email"
                          name="contact_email"
                          value={form.contact_email}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="hr@company.jp"
                        />
                      </Field>
                      <Field label="Phone">
                        <input
                          className={INPUT}
                          name="contact_phone"
                          value={form.contact_phone}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="+81 90-0000-0000"
                        />
                      </Field>
                    </div>
                  </div>
                </div>

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
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Employer' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
