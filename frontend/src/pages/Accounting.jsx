import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const FINANCE_ROLES = ['owner', 'manager', 'accountant'];

// ── helpers ───────────────────────────────────────────────────────────────────

const INPUT =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-400';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';

function fmt(amount) {
  return '৳ ' + Number(amount).toLocaleString('en-US');
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className={LABEL}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// Derive the human-readable effect label + colour class from account_type + is_reversal
function getEffect(accountType, isReversal) {
  if (!accountType) return null;
  if (accountType === 'revenue') {
    return isReversal
      ? { label: 'Refund (Income −)', cls: 'bg-orange-100 text-orange-700' }
      : { label: 'Income', cls: 'bg-emerald-100 text-emerald-700' };
  }
  if (accountType === 'expense' || accountType === 'cogs') {
    return isReversal
      ? { label: 'Reversal (Expense −)', cls: 'bg-emerald-100 text-emerald-700' }
      : { label: 'Expense', cls: 'bg-orange-100 text-orange-700' };
  }
  // asset / liability / equity — legacy transaction, can't be created any more
  return null;
}

function EffectBadge({ accountType, isReversal }) {
  const eff = getEffect(accountType, isReversal);
  if (!eff) return <span className="text-gray-400">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${eff.cls}`}
    >
      {eff.label}
    </span>
  );
}

function SummaryCard({ title, value, colorClass, sub }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${colorClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

const EMPTY_FORM = {
  txn_date: '',
  account_code: '',
  is_reversal: false,
  amount: '',
  description: '',
  reference: '',
  payment_method: '',
  student_id: '',
};

// ── main component ────────────────────────────────────────────────────────────

export default function Accounting() {
  const { user } = useAuth();

  if (!FINANCE_ROLES.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  const [tab, setTab] = useState('ledger');

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [acctFilter, setAcctFilter] = useState('');
  const [dirFilter, setDirFilter] = useState('');

  // Drawer
  const [panel, setPanel] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, txn_date: todayStr() });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // ── initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      api.get('/accounting/accounts'),
      api.get('/accounting/transactions'),
      api.get('/accounting/summary'),
      api.get('/students'),
    ])
      .then(([accts, txns, summ, studs]) => {
        setAccounts(accts);
        setTransactions(txns);
        setSummary(summ);
        setStudents(studs);
      })
      .catch((err) => setInitError(err.message))
      .finally(() => setInitLoading(false));
  }, []);

  // ── filter / refresh refetch (skip first mount) ───────────────────────────

  const filterReady = useRef(false);
  useEffect(() => {
    if (!filterReady.current) {
      filterReady.current = true;
      return;
    }

    const tp = new URLSearchParams();
    if (fromDate) tp.set('from_date', fromDate);
    if (toDate) tp.set('to_date', toDate);
    if (acctFilter) tp.set('account_code', acctFilter);
    if (dirFilter) tp.set('direction', dirFilter);

    const sp = new URLSearchParams();
    if (fromDate) sp.set('from_date', fromDate);
    if (toDate) sp.set('to_date', toDate);

    Promise.all([
      api.get(`/accounting/transactions?${tp}`),
      api.get(`/accounting/summary?${sp}`),
    ])
      .then(([txns, summ]) => {
        setTransactions(txns);
        setSummary(summ);
      })
      .catch(() => {});
  }, [fromDate, toDate, acctFilter, dirFilter, refreshKey]);

  // ── derived ───────────────────────────────────────────────────────────────

  const POSTABLE_TYPES = new Set(['revenue', 'expense', 'cogs']);
  const postableAccounts = accounts.filter(
    (a) => !a.is_header && POSTABLE_TYPES.has(a.account_type),
  );
  const revenueAccounts = postableAccounts.filter((a) => a.account_type === 'revenue');
  const expenseAccounts = postableAccounts.filter(
    (a) => a.account_type === 'expense' || a.account_type === 'cogs',
  );
  // Map code → account_type for effect badges in the table
  const acctTypeMap = Object.fromEntries(accounts.map((a) => [a.code, a.account_type]));
  const hasFilters = fromDate || toDate || acctFilter || dirFilter;

  // Effect hint shown in the drawer based on current form selection
  const selAcctCode = parseInt(form.account_code, 10);
  const selAcctType = accounts.find((a) => a.code === selAcctCode)?.account_type ?? null;
  const drawerEffect = getEffect(selAcctType, form.is_reversal);

  // ── drawer helpers ────────────────────────────────────────────────────────

  function openAdd() {
    setForm({ ...EMPTY_FORM, txn_date: todayStr() });
    setFormError(null);
    setSelected(null);
    setPanel('add');
  }

  function openEdit(txn) {
    setForm({
      txn_date: txn.txn_date ?? todayStr(),
      account_code: txn.account_code?.toString() ?? '',
      is_reversal: txn.is_reversal ?? false,
      amount: txn.amount?.toString() ?? '',
      description: txn.description ?? '',
      reference: txn.reference ?? '',
      payment_method: txn.payment_method ?? '',
      student_id: txn.student_id ?? '',
    });
    setFormError(null);
    setSelected(txn);
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
    setFormError(null);
    if (!form.account_code) { setFormError('Account is required.'); return; }
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError('Amount must be greater than 0.');
      return;
    }

    const payload = {
      account_code: parseInt(form.account_code, 10),
      amount: parseFloat(form.amount),
      is_reversal: form.is_reversal,
      student_id: form.student_id || null,
    };
    if (form.txn_date) payload.txn_date = form.txn_date;
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.reference.trim()) payload.reference = form.reference.trim();
    if (form.payment_method) payload.payment_method = form.payment_method;

    setSaving(true);
    try {
      if (panel === 'add') {
        await api.post('/accounting/transactions', payload);
      } else {
        await api.patch(`/accounting/transactions/${selected.id}`, payload);
      }
      setRefreshKey((k) => k + 1);
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, txn) {
    e.stopPropagation();
    const label = txn.description || txn.id?.slice(0, 8) || 'this transaction';
    if (
      !window.confirm(
        `Delete transaction (${fmt(txn.amount)} — ${label})? This cannot be undone.`,
      )
    )
      return;
    try {
      await api.delete(`/accounting/transactions/${txn.id}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (initLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-sm text-gray-400">
        Loading accounting…
      </div>
    );
  }

  if (initError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        <span className="font-semibold">Error:</span> {initError}
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Accounting</h2>
        {tab === 'ledger' && (
          <button
            onClick={openAdd}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                       hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
          >
            + Add Transaction
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {[
          ['ledger', 'Transactions Ledger'],
          ['coa', 'Chart of Accounts'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Ledger tab ─────────────────────────────────────────────────────── */}
      {tab === 'ledger' && (
        <>
          {/* Summary cards */}
          {summary && (
            <div className="mb-6 grid grid-cols-4 gap-4">
              <SummaryCard
                title="Total Revenue"
                value={fmt(summary.total_revenue)}
                colorClass="text-emerald-600"
              />
              <SummaryCard
                title="Total Expenses"
                value={fmt(summary.total_expenses)}
                colorClass="text-orange-600"
              />
              <SummaryCard
                title="Net"
                value={fmt(summary.net)}
                colorClass={summary.net >= 0 ? 'text-blue-700' : 'text-red-600'}
              />
              <SummaryCard
                title="Transactions"
                value={summary.transaction_count.toLocaleString()}
                colorClass="text-gray-800"
                sub={hasFilters ? 'filtered view' : 'all time'}
              />
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Account</label>
              <select
                value={acctFilter}
                onChange={(e) => setAcctFilter(e.target.value)}
                className="min-w-[200px] rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Direction</label>
              <select
                value={dirFilter}
                onChange={(e) => setDirFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </div>
            {hasFilters && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setAcctFilter('');
                  setDirFilter('');
                }}
                className="pb-1 text-xs text-gray-400 underline hover:text-gray-600"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'Date',
                    'Account',
                    'Effect',
                    'Amount',
                    'Description',
                    'Reference',
                    'Related Student',
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
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-16 text-center text-sm text-gray-400"
                    >
                      No transactions in this range.
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr
                      key={txn.id}
                      onClick={() => openEdit(txn)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-gray-600">
                        {txn.txn_date ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-gray-900">
                          {txn.account_name ?? '—'}
                        </span>
                        <span className="ml-1.5 text-xs text-gray-400">
                          #{txn.account_code}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <EffectBadge
                          accountType={txn.account_type ?? acctTypeMap[txn.account_code]}
                          isReversal={txn.is_reversal}
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-gray-900">
                        {fmt(txn.amount)}
                      </td>
                      <td className="max-w-[150px] truncate px-5 py-3 text-gray-600">
                        {txn.description ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{txn.reference ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {txn.student_name ?? '—'}
                      </td>
                      <td
                        className="px-5 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleDelete(e, txn)}
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

      {/* ── Chart of Accounts tab ───────────────────────────────────────────── */}
      {tab === 'coa' && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Code', 'Account Name', 'Type', 'Status'].map((col) => (
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
              {accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-16 text-center text-sm text-gray-400"
                  >
                    No accounts found.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.code} className={acc.is_header ? 'bg-gray-50' : ''}>
                    <td
                      className={`px-5 py-2.5 ${
                        acc.is_header
                          ? 'font-bold text-gray-900'
                          : 'pl-10 text-gray-500'
                      }`}
                    >
                      {acc.code}
                    </td>
                    <td
                      className={`px-5 py-2.5 ${
                        acc.is_header
                          ? 'font-bold text-gray-900'
                          : 'pl-10 text-gray-700'
                      }`}
                    >
                      {acc.parent_code !== null && (
                        <span className="mr-1 text-gray-300">└</span>
                      )}
                      {acc.name}
                    </td>
                    <td className="px-5 py-2.5 capitalize text-gray-500">
                      {acc.account_type}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          acc.is_active !== false
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {acc.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      {panel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-[480px] flex-col bg-white shadow-2xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'Add Transaction' : 'Edit Transaction'}
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
                <Field label="Date" required>
                  <input
                    className={INPUT}
                    type="date"
                    name="txn_date"
                    value={form.txn_date}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </Field>

                <Field
                  label="Account"
                  required
                  hint="Only revenue and expense accounts are postable. Direction is derived automatically."
                >
                  <select
                    className={INPUT}
                    name="account_code"
                    value={form.account_code}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">— select account —</option>
                    {revenueAccounts.length > 0 && (
                      <optgroup label="Revenue">
                        {revenueAccounts.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {expenseAccounts.length > 0 && (
                      <optgroup label="Expenses">
                        {expenseAccounts.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </Field>

                <Field label="Amount (BDT ৳)" required>
                  <input
                    className={INPUT}
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    disabled={saving}
                    min="0.01"
                    step="any"
                    placeholder="e.g. 50000"
                  />
                </Field>

                {/* Refund / reversal toggle */}
                <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      name="is_reversal"
                      checked={form.is_reversal}
                      onChange={handleChange}
                      disabled={saving}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      This is a refund / reversal
                    </span>
                  </label>
                  <p className="mt-1.5 text-xs text-gray-400">
                    Normally leave unchecked. Check this for refunds (e.g. COE/visa refund) or
                    reversing a previous entry — it subtracts from that account's total.
                  </p>
                  {drawerEffect && (
                    <p className="mt-2 text-xs font-semibold">
                      <span className="text-gray-500">Effect: </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 ${drawerEffect.cls}`}
                      >
                        {drawerEffect.label}
                      </span>
                    </p>
                  )}
                </div>

                <Field label="Description">
                  <input
                    className={INPUT}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. Japan visa service fee"
                  />
                </Field>

                <Field label="Reference">
                  <input
                    className={INPUT}
                    name="reference"
                    value={form.reference}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Invoice / receipt no."
                  />
                </Field>

                <Field label="Payment Method">
                  <select
                    className={INPUT}
                    name="payment_method"
                    value={form.payment_method}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">— optional —</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="gateway">Gateway</option>
                  </select>
                </Field>

                <Field label="Related Student (optional)">
                  <select
                    className={INPUT}
                    name="student_id"
                    value={form.student_id}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">— none —</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
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
                  {saving
                    ? 'Saving…'
                    : panel === 'add'
                    ? 'Add Transaction'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
