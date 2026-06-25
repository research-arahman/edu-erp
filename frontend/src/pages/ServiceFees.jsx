import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';

// ── constants ─────────────────────────────────────────────────────────────────

const MILESTONES = [
  { value: 'on_referral',  label: 'On Referral' },
  { value: 'on_coe',       label: 'On COE' },
  { value: 'on_visa',      label: 'On Visa' },
  { value: 'on_enrollment',label: 'On Enrollment' },
  { value: 'on_placement', label: 'On Placement' },
  { value: 'custom',       label: 'Custom' },
];

function prettifyMilestone(m) {
  return MILESTONES.find((x) => x.value === m)?.label ?? '—';
}

const EMPTY_FORM = {
  direction:    'incoming',
  payer_type:   '',
  partner_id:   '',
  student_id:   '',
  candidate_id: '',
  amount:       '',
  currency:     'BDT',
  milestone:    '',
  status:       'pending',
  due_date:     '',
  paid_date:    '',
  description:  '',
  notes:        '',
};

function buildPayload(form) {
  if (!form.amount) throw new Error('Amount is required.');
  const p = {
    amount:    Number(form.amount),
    direction: form.direction,
    status:    form.status,
    currency:  form.currency.trim() || 'BDT',
  };
  if (form.payer_type) p.payer_type = form.payer_type;

  // Link only the id matching the current payer_type; clear the others explicitly
  p.partner_id   = form.payer_type === 'partner'  ? (form.partner_id   || null) : null;
  p.student_id   = form.payer_type === 'student'  ? (form.student_id   || null) : null;
  p.candidate_id = form.payer_type === 'other'    ? (form.candidate_id || null) : null;

  if (form.milestone)          p.milestone    = form.milestone;
  if (form.description.trim()) p.description  = form.description.trim();
  if (form.notes.trim())       p.notes        = form.notes.trim();
  if (form.due_date)           p.due_date     = form.due_date;
  if (form.paid_date)          p.paid_date    = form.paid_date;
  return p;
}

// ── shared input styles ───────────────────────────────────────────────────────

const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
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

// ── status + direction badge helpers ──────────────────────────────────────────

function StatusBadge({ status }) {
  const cls = {
    pending:   'bg-gray-100 text-gray-600',
    invoiced:  'bg-blue-100 text-blue-700',
    paid:      'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  }[status] ?? 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status ?? '—'}
    </span>
  );
}

function DirectionBadge({ direction }) {
  const cls = direction === 'incoming'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-orange-100 text-orange-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {direction ?? '—'}
    </span>
  );
}

// ── "Related To" cell helper ──────────────────────────────────────────────────

function relatedTo(fee) {
  if (fee.partner_name)   return { tag: 'Partner',   name: fee.partner_name };
  if (fee.student_name)   return { tag: 'Student',   name: fee.student_name };
  if (fee.candidate_name) return { tag: 'Candidate', name: fee.candidate_name };
  return null;
}

// ── filter button row ─────────────────────────────────────────────────────────

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function ServiceFees() {
  const [fees,       setFees]      = useState([]);
  const [partners,   setPartners]  = useState([]);
  const [students,   setStudents]  = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState(null);

  const [panel,      setPanel]     = useState(null);
  const [selected,   setSelected]  = useState(null);
  const [form,       setForm]      = useState(EMPTY_FORM);
  const [saving,     setSaving]    = useState(false);
  const [formError,  setFormError] = useState(null);

  const [statusFilter,    setStatusFilter]    = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');

  // ── data loading ───────────────────────────────────────────────────────────

  function loadFees() {
    return api.get('/service-fees').then(setFees);
  }

  useEffect(() => {
    Promise.all([
      api.get('/service-fees'),
      api.get('/referral-partners'),
      api.get('/students'),
      api.get('/candidates'),
    ])
      .then(([f, p, s, c]) => {
        setFees(f);
        setPartners(p);
        setStudents(s);
        setCandidates(c);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── client-side filtering ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return fees.filter((f) => {
      if (statusFilter    !== 'all' && f.status    !== statusFilter)    return false;
      if (directionFilter !== 'all' && f.direction !== directionFilter) return false;
      return true;
    });
  }, [fees, statusFilter, directionFilter]);

  // ── summary line (pending incoming + paid incoming) ────────────────────────

  const summary = useMemo(() => {
    const incoming = fees.filter((f) => f.direction === 'incoming');
    const pendingTotal = incoming
      .filter((f) => f.status === 'pending')
      .reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const paidTotal = incoming
      .filter((f) => f.status === 'paid')
      .reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const currency = fees[0]?.currency ?? 'BDT';
    return { pendingTotal, paidTotal, currency };
  }, [fees]);

  // ── panel helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setPanel('add');
  }

  function openEdit(fee) {
    setForm({
      direction:    fee.direction   ?? 'incoming',
      payer_type:   fee.payer_type  ?? '',
      partner_id:   fee.partner_id  ?? '',
      student_id:   fee.student_id  ?? '',
      candidate_id: fee.candidate_id ?? '',
      amount:       fee.amount?.toString() ?? '',
      currency:     fee.currency    ?? 'BDT',
      milestone:    fee.milestone   ?? '',
      status:       fee.status      ?? 'pending',
      due_date:     fee.due_date    ?? '',
      paid_date:    fee.paid_date   ?? '',
      description:  fee.description ?? '',
      notes:        fee.notes       ?? '',
    });
    setFormError(null);
    setSelected(fee);
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
    if (name === 'payer_type') {
      // clear stale link ids when payer_type changes
      setForm((prev) => ({
        ...prev,
        payer_type:   value,
        partner_id:   '',
        student_id:   '',
        candidate_id: '',
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    let payload;
    try {
      payload = buildPayload(form);
    } catch (err) {
      setFormError(err.message);
      return;
    }
    setSaving(true);
    try {
      if (panel === 'add') {
        await api.post('/service-fees', payload);
      } else {
        await api.patch(`/service-fees/${selected.id}`, payload);
      }
      await loadFees();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, fee) {
    e.stopPropagation();
    const label = relatedTo(fee)?.name ?? fee.id.slice(0, 8);
    if (!window.confirm(`Delete this fee (${fee.amount} ${fee.currency} — ${label})? This cannot be undone.`)) return;
    try {
      await api.delete(`/service-fees/${fee.id}`);
      setFees((prev) => prev.filter((x) => x.id !== fee.id));
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
          <h2 className="text-2xl font-semibold text-gray-900">Service Fees</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{fees.length} fee records</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Fee
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
          Loading service fees…
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary line */}
          {fees.length > 0 && (
            <div className="mb-4 flex gap-6 text-sm text-gray-600">
              <span>
                Pending incoming:{' '}
                <span className="font-semibold text-gray-800">
                  {summary.pendingTotal.toLocaleString()} {summary.currency}
                </span>
              </span>
              <span>
                Paid incoming:{' '}
                <span className="font-semibold text-emerald-700">
                  {summary.paidTotal.toLocaleString()} {summary.currency}
                </span>
              </span>
            </div>
          )}

          {/* Filter bar */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Status:</span>
              {['all', 'pending', 'invoiced', 'paid', 'cancelled'].map((s) => (
                <FilterBtn
                  key={s}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </FilterBtn>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Direction:</span>
              {['all', 'incoming', 'outgoing'].map((d) => (
                <FilterBtn
                  key={d}
                  active={directionFilter === d}
                  onClick={() => setDirectionFilter(d)}
                >
                  {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                </FilterBtn>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Related To', 'Direction', 'Amount', 'Milestone', 'Status', 'Due Date', ''].map((col) => (
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
                      {fees.length === 0
                        ? 'No service fees yet — add one above.'
                        : 'No fees match the selected filters.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((fee) => {
                    const rel = relatedTo(fee);
                    return (
                      <tr
                        key={fee.id}
                        onClick={() => openEdit(fee)}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                      >
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {rel ? (
                            <span>
                              <span className="mr-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                                {rel.tag}
                              </span>
                              {rel.name}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <DirectionBadge direction={fee.direction} />
                        </td>
                        <td className="px-5 py-3 text-gray-800 font-medium">
                          {Number(fee.amount).toLocaleString()} {fee.currency ?? 'BDT'}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {fee.milestone ? prettifyMilestone(fee.milestone) : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={fee.status} />
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {fee.due_date ?? '—'}
                        </td>
                        <td
                          className="px-5 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => handleDelete(e, fee)}
                            className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Slide-in drawer ───────────────────────────────────────────────── */}
      {panel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />

          <div className="fixed inset-y-0 right-0 z-50 flex w-[520px] flex-col bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'Add Service Fee' : 'Edit Service Fee'}
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

                {/* Direction */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Direction" required>
                    <select
                      className={INPUT}
                      name="direction"
                      value={form.direction}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="incoming">Incoming (you receive)</option>
                      <option value="outgoing">Outgoing (you pay)</option>
                    </select>
                  </Field>

                  <Field label="Status" required>
                    <select
                      className={INPUT}
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="pending">Pending</option>
                      <option value="invoiced">Invoiced</option>
                      <option value="paid">Paid</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </Field>
                </div>

                {/* Payer type */}
                <Field label="Payer / Related To">
                  <select
                    className={INPUT}
                    name="payer_type"
                    value={form.payer_type}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">— select —</option>
                    <option value="partner">Partner</option>
                    <option value="student">Student</option>
                    <option value="other">Other / Candidate</option>
                  </select>
                </Field>

                {/* Conditional link fields */}
                {form.payer_type === 'partner' && (
                  <Field label="Referral Partner">
                    <select
                      className={INPUT}
                      name="partner_id"
                      value={form.partner_id}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— select partner —</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </Field>
                )}

                {form.payer_type === 'student' && (
                  <Field label="Student">
                    <select
                      className={INPUT}
                      name="student_id"
                      value={form.student_id}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— select student —</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </Field>
                )}

                {form.payer_type === 'other' && (
                  <Field label="Candidate (optional)">
                    <select
                      className={INPUT}
                      name="candidate_id"
                      value={form.candidate_id}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— select candidate —</option>
                      {candidates.map((c) => (
                        <option key={c.id} value={c.id}>{c.full_name}</option>
                      ))}
                    </select>
                  </Field>
                )}

                {/* Amount + currency */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Amount" required>
                    <input
                      className={INPUT}
                      type="number"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      disabled={saving}
                      min="0"
                      step="any"
                      placeholder="e.g. 15000"
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

                {/* Milestone */}
                <Field label="Milestone">
                  <select
                    className={INPUT}
                    name="milestone"
                    value={form.milestone}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">— none —</option>
                    {MILESTONES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </Field>

                {/* Description */}
                <Field label="Description">
                  <input
                    className={INPUT}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. Japan university application service fee"
                  />
                </Field>

                {/* Due date + Paid date */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Due Date">
                    <input
                      className={INPUT}
                      type="date"
                      name="due_date"
                      value={form.due_date}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </Field>

                  <Field label="Paid Date">
                    <input
                      className={INPUT}
                      type="date"
                      name="paid_date"
                      value={form.paid_date}
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
                    rows={3}
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
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Fee' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
