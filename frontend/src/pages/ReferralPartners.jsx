import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// ── constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  type: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  commission_basis: '',
  commission_rate: '',
  commission_currency: 'BDT',
  notes: '',
  is_active: true,
};

function buildPayload(form) {
  const p = {
    name: form.name.trim(),
    is_active: form.is_active,
  };
  if (form.type)                        p.type                = form.type;
  if (form.contact_person.trim())       p.contact_person      = form.contact_person.trim();
  if (form.phone.trim())                p.phone               = form.phone.trim();
  if (form.email.trim())                p.email               = form.email.trim();
  if (form.address.trim())              p.address             = form.address.trim();
  if (form.commission_basis)            p.commission_basis    = form.commission_basis;
  if (form.commission_rate !== '')      p.commission_rate     = Number(form.commission_rate);
  if (form.commission_currency.trim())  p.commission_currency = form.commission_currency.trim();
  if (form.notes.trim())                p.notes               = form.notes.trim();
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

// ── helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS = {
  firm: 'Firm',
  language_center: 'Language Center',
  individual: 'Individual',
};

const TYPE_COLORS = {
  firm: 'bg-blue-50 text-blue-700',
  language_center: 'bg-purple-50 text-purple-700',
  individual: 'bg-orange-50 text-orange-700',
};

function typeBadge(type) {
  if (!type) return <span className="text-gray-400">—</span>;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function commissionLabel(partner) {
  const { commission_rate, commission_currency, commission_basis } = partner;
  if (commission_rate == null || !commission_basis) return '—';
  if (commission_basis === 'percentage') return `${commission_rate}% (percentage)`;
  const currency = commission_currency || 'BDT';
  return `${commission_rate} ${currency} (fixed)`;
}

// ── main component ────────────────────────────────────────────────────────────

export default function ReferralPartners() {
  const [partners,    setPartners]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const [panel,       setPanel]       = useState(null); // null | 'add' | 'edit'
  const [selected,    setSelected]    = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState(null);

  // ── data loading ───────────────────────────────────────────────────────────

  function loadPartners() {
    return api.get('/referral-partners').then(setPartners);
  }

  useEffect(() => {
    api.get('/referral-partners')
      .then(setPartners)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── panel helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setPanel('add');
  }

  function openEdit(partner) {
    setForm({
      name:                partner.name                    ?? '',
      type:                partner.type                    ?? '',
      contact_person:      partner.contact_person          ?? '',
      phone:               partner.phone                   ?? '',
      email:               partner.email                   ?? '',
      address:             partner.address                 ?? '',
      commission_basis:    partner.commission_basis        ?? '',
      commission_rate:     partner.commission_rate != null ? String(partner.commission_rate) : '',
      commission_currency: partner.commission_currency     ?? 'BDT',
      notes:               partner.notes                   ?? '',
      is_active:           partner.is_active               ?? true,
    });
    setFormError(null);
    setSelected(partner);
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
        await api.post('/referral-partners', payload);
      } else {
        await api.patch(`/referral-partners/${selected.id}`, payload);
      }
      await loadPartners();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, partner) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${partner.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/referral-partners/${partner.id}`);
      setPartners((prev) => prev.filter((x) => x.id !== partner.id));
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
          <h2 className="text-2xl font-semibold text-gray-900">Referral Partners</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{partners.length} partner{partners.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Partner
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
          Loading referral partners…
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Type', 'Contact Person', 'Commission', 'Status', ''].map((col) => (
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
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-gray-400">
                    No referral partners yet — add one above.
                  </td>
                </tr>
              ) : (
                partners.map((partner) => (
                  <tr
                    key={partner.id}
                    onClick={() => openEdit(partner)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{partner.name}</td>
                    <td className="px-5 py-3">{typeBadge(partner.type)}</td>
                    <td className="px-5 py-3 text-gray-600">{partner.contact_person ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{commissionLabel(partner)}</td>
                    <td className="px-5 py-3">
                      {partner.is_active ? (
                        <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td
                      className="px-5 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => handleDelete(e, partner)}
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
                {panel === 'add' ? 'Add Referral Partner' : `Edit: ${selected?.name}`}
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
                    placeholder="e.g. Sakura Japanese Language Center"
                  />
                </Field>

                <Field label="Type">
                  <select
                    className={INPUT}
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">— select —</option>
                    <option value="firm">Firm</option>
                    <option value="language_center">Language Center</option>
                    <option value="individual">Individual</option>
                  </select>
                </Field>

                {/* Contact section */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Contact Details
                  </p>
                  <div className="space-y-3">
                    <Field label="Contact Person">
                      <input
                        className={INPUT}
                        name="contact_person"
                        value={form.contact_person}
                        onChange={handleChange}
                        disabled={saving}
                        placeholder="e.g. Mohammad Hasan"
                      />
                    </Field>
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
                          placeholder="partner@example.com"
                        />
                      </Field>
                    </div>
                    <Field label="Address">
                      <textarea
                        className={INPUT}
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        disabled={saving}
                        rows={2}
                        placeholder="Office address…"
                      />
                    </Field>
                  </div>
                </div>

                {/* Commission section */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Commission Arrangement
                  </p>
                  <div className="space-y-3">
                    <Field label="Commission Basis">
                      <select
                        className={INPUT}
                        name="commission_basis"
                        value={form.commission_basis}
                        onChange={handleChange}
                        disabled={saving}
                      >
                        <option value="">— none —</option>
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed</option>
                      </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Commission Rate">
                        <input
                          className={INPUT}
                          type="number"
                          name="commission_rate"
                          value={form.commission_rate}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="e.g. 10 for %, or 15000 for fixed"
                          min="0"
                          step="any"
                        />
                      </Field>
                      <Field label="Currency">
                        <input
                          className={INPUT}
                          name="commission_currency"
                          value={form.commission_currency}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="BDT"
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                <Field label="Notes">
                  <textarea
                    className={INPUT}
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    disabled={saving}
                    rows={3}
                    placeholder="Internal notes about this partner…"
                  />
                </Field>

                <div className="pt-1">
                  <CheckRow
                    id="is_active"
                    label="Active"
                    checked={form.is_active}
                    onChange={handleChange}
                    disabled={saving}
                  />
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
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Partner' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
