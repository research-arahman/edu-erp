import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const FINANCE_ROLES = ['owner', 'manager', 'accountant'];
const CAN_DELETE    = ['owner', 'manager'];

const EMPTY_FORM = {
  full_name:      '',
  phone:          '',
  email:          '',
  specialization: '',
  rate_note:      '',
  is_active:      true,
  notes:          '',
};

function emptyPayForm() {
  return {
    amount:         '',
    payment_date:   new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    batch_id:       '',
    reference:      '',
    notes:          '',
  };
}

const INPUT =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-400';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';

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

function fmt(amount, currency = 'BDT') {
  if (amount == null || amount === '') return '—';
  return `${currency === 'BDT' ? '৳' : currency} ${Number(amount).toLocaleString('en-IN')}`;
}

function ActiveBadge({ active }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function Instructors() {
  const { user } = useAuth();
  const isFinance = FINANCE_ROLES.includes(user?.role);
  const canDelete = CAN_DELETE.includes(user?.role);

  const [instructors, setInstructors] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // panel: null | 'add' | 'edit'
  const [panel,     setPanel]     = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState(null);

  // Finance: payments state
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [paymentsList,   setPaymentsList]   = useState([]);
  const [pmtLoading,     setPmtLoading]     = useState(false);
  const [pmtError,       setPmtError]       = useState(null);
  const [showAddPay,     setShowAddPay]     = useState(false);
  const [payForm,        setPayForm]        = useState(emptyPayForm());
  const [paySaving,      setPaySaving]      = useState(false);
  const [payError,       setPayError]       = useState(null);
  const [batches,        setBatches]        = useState([]);

  function loadInstructors() {
    return api.get('/instructors').then(setInstructors);
  }

  useEffect(() => {
    loadInstructors()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function loadPayments(instructorId) {
    setPmtLoading(true);
    setPmtError(null);
    try {
      const [summary, list] = await Promise.all([
        api.get(`/instructors/${instructorId}/payment-summary`),
        api.get(`/instructors/${instructorId}/payments`),
      ]);
      setPaymentSummary(summary);
      setPaymentsList(list);
    } catch (err) {
      setPmtError(err.message);
    } finally {
      setPmtLoading(false);
    }
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setPanel('add');
  }

  function openEdit(instr) {
    setSelected(instr);
    setForm({
      full_name:      instr.full_name      ?? '',
      phone:          instr.phone          ?? '',
      email:          instr.email          ?? '',
      specialization: instr.specialization ?? '',
      rate_note:      instr.rate_note      ?? '',
      is_active:      instr.is_active      ?? true,
      notes:          instr.notes          ?? '',
    });
    setFormError(null);
    setPaymentSummary(null);
    setPaymentsList([]);
    setPmtError(null);
    setShowAddPay(false);
    setPayForm(emptyPayForm());
    setPayError(null);
    setPanel('edit');

    if (isFinance) {
      loadPayments(instr.id);
      api.get('/batches').then(setBatches).catch(() => {});
    }
  }

  function closePanel() {
    setPanel(null);
    setSelected(null);
    setPaymentSummary(null);
    setPaymentsList([]);
    setPmtError(null);
    setShowAddPay(false);
    setPayError(null);
    setFormError(null);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.full_name.trim()) { setFormError('Full name is required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload = { full_name: form.full_name.trim(), is_active: form.is_active };
      if (form.phone.trim())          payload.phone          = form.phone.trim();
      if (form.email.trim())          payload.email          = form.email.trim();
      if (form.specialization.trim()) payload.specialization = form.specialization.trim();
      if (form.rate_note.trim())      payload.rate_note      = form.rate_note.trim();
      if (form.notes.trim())          payload.notes          = form.notes.trim();

      if (panel === 'add') {
        await api.post('/instructors', payload);
        await loadInstructors();
        closePanel();
      } else {
        const updated = await api.patch(`/instructors/${selected.id}`, payload);
        setSelected((prev) => ({ ...prev, ...updated }));
        await loadInstructors();
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, instr) {
    e.stopPropagation();
    if (!window.confirm(
      'Delete this instructor? Their payments will be removed and reversed from accounting.'
    )) return;
    try {
      await api.delete(`/instructors/${instr.id}`);
      await loadInstructors();
      if (panel === 'edit' && selected?.id === instr.id) closePanel();
    } catch (err) {
      alert(err.message || 'Delete failed.');
    }
  }

  async function handleDeletePayment(paymentId) {
    if (!window.confirm('Delete this payment? It will be reversed from accounting.')) return;
    try {
      await api.delete(`/instructor-payments/${paymentId}`);
      await loadPayments(selected.id);
      await loadInstructors();
    } catch (err) {
      alert(err.message || 'Delete failed.');
    }
  }

  async function handleAddPayment(e) {
    e.preventDefault();
    if (!payForm.amount) { setPayError('Amount is required.'); return; }
    setPaySaving(true);
    setPayError(null);
    try {
      const payload = { amount: Number(payForm.amount) };
      if (payForm.payment_date)     payload.payment_date   = payForm.payment_date;
      if (payForm.payment_method)   payload.payment_method = payForm.payment_method;
      if (payForm.batch_id)         payload.batch_id       = payForm.batch_id;
      if (payForm.reference.trim()) payload.reference      = payForm.reference.trim();
      if (payForm.notes.trim())     payload.notes          = payForm.notes.trim();
      await api.post(`/instructors/${selected.id}/payments`, payload);
      await loadPayments(selected.id);
      await loadInstructors();
      setPayForm(emptyPayForm());
      setShowAddPay(false);
    } catch (err) {
      setPayError(err.message);
    } finally {
      setPaySaving(false);
    }
  }

  function handlePayChange(e) {
    const { name, value } = e.target;
    setPayForm((prev) => ({ ...prev, [name]: value }));
  }

  function renderFormFields(disabled) {
    return (
      <div className="space-y-4">
        <Field label="Full Name" required>
          <input
            className={INPUT}
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            disabled={disabled}
            placeholder="e.g. Tanaka Hiroshi"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input
              className={INPUT}
              name="phone"
              value={form.phone}
              onChange={handleChange}
              disabled={disabled}
            />
          </Field>
          <Field label="Email">
            <input
              className={INPUT}
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              disabled={disabled}
            />
          </Field>
        </div>

        <Field label="Specialization">
          <input
            className={INPUT}
            name="specialization"
            value={form.specialization}
            onChange={handleChange}
            disabled={disabled}
            placeholder="e.g. JLPT N5, IELTS"
          />
        </Field>

        <Field label="Rate Note" hint="Agreed rate, e.g. 2000 BDT/class">
          <input
            className={INPUT}
            name="rate_note"
            value={form.rate_note}
            onChange={handleChange}
            disabled={disabled}
            placeholder="2000 BDT/class"
          />
        </Field>

        <Field label="Notes">
          <textarea
            className={INPUT}
            name="notes"
            value={form.notes}
            onChange={handleChange}
            disabled={disabled}
            rows={2}
          />
        </Field>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={form.is_active}
            onChange={handleChange}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Instructors</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">
              {instructors.length} instructor{instructors.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Instructor
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">
          Loading instructors…
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  'Name', 'Specialization', 'Phone', 'Email', 'Active', 'Payments',
                  ...(isFinance ? ['Total Paid'] : []),
                  '',
                ].map((col) => (
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
              {instructors.length === 0 ? (
                <tr>
                  <td
                    colSpan={isFinance ? 8 : 7}
                    className="px-5 py-16 text-center text-sm text-gray-400"
                  >
                    No instructors yet — add one above.
                  </td>
                </tr>
              ) : (
                instructors.map((instr) => (
                  <tr
                    key={instr.id}
                    onClick={() => openEdit(instr)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{instr.full_name}</td>
                    <td className="px-5 py-3 text-gray-600">{instr.specialization ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{instr.phone ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{instr.email ?? '—'}</td>
                    <td className="px-5 py-3"><ActiveBadge active={instr.is_active} /></td>
                    <td className="px-5 py-3 text-gray-700">{instr.payment_count ?? 0}</td>
                    {isFinance && (
                      <td className="px-5 py-3 font-medium text-emerald-700">
                        {fmt(instr.total_paid)}
                      </td>
                    )}
                    <td
                      className="px-5 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canDelete && (
                        <button
                          onClick={(e) => handleDelete(e, instr)}
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

      {/* ── Add Instructor drawer ─────────────────────────────────────────── */}
      {panel === 'add' && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-[480px] flex-col bg-white shadow-2xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">Add Instructor</h3>
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
              <div className="flex-1 px-6 py-5">{renderFormFields(saving)}</div>
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
                             hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Add Instructor'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Edit Instructor drawer ───────────────────────────────────────── */}
      {panel === 'edit' && selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-[560px] flex-col bg-white shadow-2xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="truncate text-base font-semibold text-gray-900">
                {selected.full_name}
              </h3>
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
              {/* Instructor info + edit form */}
              <div className="border-b border-gray-100 px-6 py-5">
                {formError && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  {renderFormFields(saving)}
                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closePanel}
                      disabled={saving}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium
                                 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                                 hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Finance: Payments section */}
              {isFinance && (
                <div className="px-6 py-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Payments
                  </p>

                  {pmtLoading && (
                    <p className="text-sm text-gray-400">Loading payments…</p>
                  )}
                  {pmtError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {pmtError}
                    </div>
                  )}

                  {!pmtLoading && !pmtError && (
                    <>
                      {/* Summary */}
                      {paymentSummary && (
                        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3">
                          <p className="text-lg font-bold text-emerald-800">
                            {fmt(paymentSummary.total_paid)}
                          </p>
                          <p className="text-xs text-emerald-600">
                            Total paid · {paymentSummary.payment_count} payment{paymentSummary.payment_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      )}

                      {/* Payments list */}
                      {paymentsList.length === 0 ? (
                        <p className="mb-4 text-sm text-gray-400">No payments recorded yet.</p>
                      ) : (
                        <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
                          <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                {['Date', 'Amount', 'Method', 'Batch', 'Reference', ''].map((h) => (
                                  <th
                                    key={h}
                                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {paymentsList.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-gray-700">{p.payment_date ?? '—'}</td>
                                  <td className="px-3 py-2 font-medium text-gray-900">
                                    {fmt(p.amount)}
                                  </td>
                                  <td className="px-3 py-2 capitalize text-gray-500">
                                    {p.payment_method ?? '—'}
                                  </td>
                                  <td className="px-3 py-2 text-gray-500">{p.batch_name ?? '—'}</td>
                                  <td className="px-3 py-2 text-gray-500">{p.reference ?? '—'}</td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      onClick={() => handleDeletePayment(p.id)}
                                      className="rounded px-1.5 py-0.5 text-xs text-red-500
                                                 hover:bg-red-50 hover:text-red-700"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Add payment toggle */}
                      {!showAddPay ? (
                        <button
                          type="button"
                          onClick={() => setShowAddPay(true)}
                          className="rounded-md border border-indigo-300 px-3 py-1.5 text-xs
                                     font-medium text-indigo-600 hover:bg-indigo-50"
                        >
                          + Add Payment
                        </button>
                      ) : (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="mb-1 text-xs font-semibold text-gray-600">Record Payment</p>
                          <p className="mb-3 text-xs text-gray-400">
                            Recording a payment posts it to Accounting as an expense (instructor cost).
                          </p>
                          {payError && (
                            <div className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                              {payError}
                            </div>
                          )}
                          <form onSubmit={handleAddPayment} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <Field label="Amount (৳)" required>
                                <input
                                  className={INPUT}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  name="amount"
                                  value={payForm.amount}
                                  onChange={handlePayChange}
                                  disabled={paySaving}
                                  placeholder="0.00"
                                />
                              </Field>
                              <Field label="Payment Date">
                                <input
                                  className={INPUT}
                                  type="date"
                                  name="payment_date"
                                  value={payForm.payment_date}
                                  onChange={handlePayChange}
                                  disabled={paySaving}
                                />
                              </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <Field label="Method">
                                <select
                                  className={INPUT}
                                  name="payment_method"
                                  value={payForm.payment_method}
                                  onChange={handlePayChange}
                                  disabled={paySaving}
                                >
                                  <option value="cash">Cash</option>
                                  <option value="bank_transfer">Bank Transfer</option>
                                  <option value="card">Card</option>
                                  <option value="gateway">Gateway</option>
                                </select>
                              </Field>
                              <Field label="Batch (optional)">
                                <select
                                  className={INPUT}
                                  name="batch_id"
                                  value={payForm.batch_id}
                                  onChange={handlePayChange}
                                  disabled={paySaving}
                                >
                                  <option value="">— none —</option>
                                  {batches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                      {b.course_name ? `${b.course_name} — ${b.name}` : b.name}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                            </div>
                            <Field label="Reference">
                              <input
                                className={INPUT}
                                name="reference"
                                value={payForm.reference}
                                onChange={handlePayChange}
                                disabled={paySaving}
                                placeholder="Invoice # or slip"
                              />
                            </Field>
                            <Field label="Notes">
                              <input
                                className={INPUT}
                                name="notes"
                                value={payForm.notes}
                                onChange={handlePayChange}
                                disabled={paySaving}
                              />
                            </Field>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => { setShowAddPay(false); setPayError(null); }}
                                disabled={paySaving}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs
                                           font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={paySaving}
                                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium
                                           text-white hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {paySaving ? 'Posting…' : 'Record Payment'}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
