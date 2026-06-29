import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const FINANCE_ROLES = ['owner', 'manager', 'accountant'];

function fmt(amount) {
  return '৳ ' + Number(amount ?? 0).toLocaleString('en-US');
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

function StatusBadge({ status }) {
  const cls =
    status === 'invoiced'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-amber-100 text-amber-700';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {status}
    </span>
  );
}

function BreakdownPanel({ title, rows, total, emptyMsg }) {
  const maxVal = rows.length > 0 ? Math.max(...rows.map((r) => r.total)) : 1;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">{emptyMsg}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const barPct = Math.round((row.total / maxVal) * 100);
            const sharePct = total > 0 ? Math.round((row.total / total) * 100) : 0;
            return (
              <div key={row.account_code}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-medium text-gray-800">
                    {row.account_name}
                    <span className="ml-1 text-gray-400">#{row.account_code}</span>
                  </span>
                  <span className="font-semibold text-gray-900">
                    {fmt(row.total)}{' '}
                    <span className="font-normal text-gray-400">({sharePct}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-indigo-400 transition-all"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FinanceDashboard() {
  const { user } = useAuth();

  if (!FINANCE_ROLES.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  async function load(from, to) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from_date', from);
      if (to) params.set('to_date', to);
      const qs = params.toString();
      const result = await api.get(`/dashboard/finance${qs ? '?' + qs : ''}`);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('', '');
  }, []);

  const filterReady = useRef(false);
  useEffect(() => {
    if (!filterReady.current) {
      filterReady.current = true;
      return;
    }
    load(fromDate, toDate);
  }, [fromDate, toDate]);

  const hasFilters = fromDate || toDate;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-sm text-gray-400">
        Loading finance dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        <span className="font-semibold">Error:</span> {error}
      </div>
    );
  }

  const { summary, income_breakdown, expense_breakdown, pending_in, counts } = data;
  const {
    unpaid_service_fees,
    unpaid_service_fees_total,
    outstanding_course_balances,
    outstanding_course_balances_total,
    pending_in_total,
  } = pending_in;

  return (
    <>
      {/* Page header + date filter */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">Finance Dashboard</h2>

        <div className="flex flex-wrap items-end gap-3">
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
          {hasFilters && (
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
              className="pb-1 text-xs text-gray-400 underline hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          title="Total Income"
          value={fmt(summary.total_income)}
          colorClass="text-emerald-600"
          sub={hasFilters ? 'filtered range' : 'all time'}
        />
        <SummaryCard
          title="Total Expenses"
          value={fmt(summary.total_expenses)}
          colorClass="text-orange-600"
          sub={hasFilters ? 'filtered range' : 'all time'}
        />
        <SummaryCard
          title="Net"
          value={fmt(summary.net)}
          colorClass={summary.net >= 0 ? 'text-blue-700' : 'text-red-600'}
          sub="income − expenses"
        />
        <SummaryCard
          title="Pending In"
          value={fmt(pending_in_total)}
          colorClass="text-amber-600"
          sub="money owed to you"
        />
      </div>

      {/* Counts row */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white px-5 py-3 shadow-sm">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{counts.active_course_students}</span>
          {' '}active course students
          <span className="mx-3 text-gray-300">·</span>
          <span className="font-semibold text-gray-900">{counts.active_batches}</span>
          {' '}active batches
          <span className="mx-3 text-gray-300">·</span>
          <span className="font-semibold text-gray-900">{counts.active_instructors}</span>
          {' '}active instructors
        </p>
      </div>

      {/* Breakdown panels */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownPanel
          title="Income by Source"
          rows={income_breakdown}
          total={summary.total_income}
          emptyMsg="No income recorded in this range."
        />
        <BreakdownPanel
          title="Expenses by Category"
          rows={expense_breakdown}
          total={summary.total_expenses}
          emptyMsg="No expenses recorded in this range."
        />
      </div>

      {/* Pending Money In */}
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-gray-900">Pending Money In</h3>
        <span className="text-sm font-bold text-amber-600">
          {fmt(pending_in_total)} total outstanding
        </span>
      </div>

      <div className="space-y-4">
        {/* Unpaid Service Fees */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h4 className="text-sm font-semibold text-gray-800">Unpaid Service Fees</h4>
            <span className="text-sm font-bold text-amber-600">
              {fmt(unpaid_service_fees_total)}
            </span>
          </div>
          {unpaid_service_fees.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              No outstanding service fees — all clear.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Payer', 'Amount', 'Milestone', 'Status', 'Due Date'].map((col) => (
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
                {unpaid_service_fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-800">{fee.payer_name ?? '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-gray-900">
                      {fmt(fee.amount)}
                    </td>
                    <td className="max-w-[180px] truncate px-5 py-3 text-gray-600">
                      {fee.milestone ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={fee.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-500">{fee.due_date ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Outstanding Course Balances */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h4 className="text-sm font-semibold text-gray-800">Outstanding Course Balances</h4>
            <span className="text-sm font-bold text-amber-600">
              {fmt(outstanding_course_balances_total)}
            </span>
          </div>
          {outstanding_course_balances.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              No outstanding course balances — all clear.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Student', 'Course', 'Batch', 'Agreed Fee', 'Paid', 'Balance'].map((col) => (
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
                {outstanding_course_balances.map((row) => (
                  <tr key={row.enrollment_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {row.course_student_name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{row.course_name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{row.batch_name ?? '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-700">
                      {fmt(row.agreed_fee)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-emerald-600">
                      {fmt(row.paid)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-bold text-amber-600">
                      {fmt(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
