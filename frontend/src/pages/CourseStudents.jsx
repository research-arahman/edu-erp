import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { matchesQuery } from '../lib/search';

const FINANCE_ROLES = ['owner', 'manager', 'accountant'];
const CAN_DELETE    = ['owner', 'manager'];

const EMPTY_FORM = {
  full_name:             '',
  phone:                 '',
  email:                 '',
  date_of_birth:         '',
  gender:                '',
  address:               '',
  status:                'active',
  referred_by_partner_id:'',
  notes:                 '',
};

const EMPTY_ENROLL = {
  course_id:       '',
  agreed_fee:      '',
  enrollment_date: '',
  batch_id:        '',
};

function emptyPayForm() {
  return {
    amount:         '',
    payment_date:   new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference:      '',
    notes:          '',
  };
}

const STATUS_PALETTE = {
  active:    'bg-green-100 text-green-700',
  completed: 'bg-indigo-100 text-indigo-700',
  dropped:   'bg-red-100 text-red-600',
};

const ENROLL_STATUS_PALETTE = {
  enrolled:  'bg-green-100 text-green-700',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-indigo-100 text-indigo-700',
  dropped:   'bg-red-100 text-red-600',
};

const PAYMENT_PALETTE = {
  pending: 'bg-amber-50 text-amber-700',
  partial: 'bg-blue-50 text-blue-700',
  paid:    'bg-emerald-50 text-emerald-700',
};

function fmt(amount, currency = 'BDT') {
  if (amount == null || amount === '') return '—';
  return `${currency === 'BDT' ? '৳' : currency} ${Number(amount).toLocaleString('en-IN')}`;
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

export default function CourseStudents() {
  const { user }  = useAuth();
  const isFinance = FINANCE_ROLES.includes(user?.role);
  const canDelete = CAN_DELETE.includes(user?.role);

  const [students,  setStudents]  = useState([]);
  const [courses,   setCourses]   = useState([]);
  const [partners,  setPartners]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState('');

  const [panel,     setPanel]     = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState(null);

  const [enroll,     setEnroll]     = useState(EMPTY_ENROLL);
  const [enrolling,  setEnrolling]  = useState(false);
  const [enrollError,setEnrollError]= useState(null);

  const [editingEnrId,  setEditingEnrId]  = useState(null);
  const [editEnrForm,   setEditEnrForm]   = useState({});
  const [editEnrSaving, setEditEnrSaving] = useState(false);
  const [editEnrError,  setEditEnrError]  = useState(null);

  // ── payments state (finance-gated) ──────────────────────────────────────────
  // enrPayData[id] = { summary: null|{...}, payments: [], loading: bool, error: null }
  const [expandedPayEnr, setExpandedPayEnr] = useState(new Set());
  const [enrPayData,     setEnrPayData]     = useState({});
  const [payForms,       setPayForms]       = useState({});
  const [paySubmitting,  setPaySubmitting]  = useState({});
  const [payErrors,      setPayErrors]      = useState({});

  const [converting,     setConverting]     = useState(null); // null | 'student' | 'candidate'
  const [convertError,   setConvertError]   = useState(null);

  const [batchesByCourse, setBatchesByCourse] = useState({});

  // ── data loading ────────────────────────────────────────────────────────────

  function loadStudents() {
    return api.get('/course-students').then(setStudents);
  }

  async function refetchSelected(id) {
    const fresh = await api.get(`/course-students/${id}`);
    setSelected(fresh);
    setStudents((prev) => prev.map((s) => (s.id === fresh.id ? fresh : s)));
  }

  async function fetchBatchesForCourse(courseId) {
    if (!courseId || batchesByCourse[courseId]) return;
    try {
      const batches = await api.get(`/batches?course_id=${courseId}`);
      setBatchesByCourse((prev) => ({ ...prev, [courseId]: batches }));
    } catch {
      // fail silently — batch dropdown stays empty
    }
  }

  useEffect(() => {
    const promises = [api.get('/course-students'), api.get('/courses')];
    if (isFinance) promises.push(api.get('/referral-partners'));
    Promise.all(promises)
      .then((results) => {
        setStudents(results[0]);
        setCourses(results[1]);
        if (isFinance && results[2]) setPartners(results[2]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => students.filter((s) => matchesQuery(s, search)),
    [students, search],
  );

  // ── panel helpers ────────────────────────────────────────────────────────────

  function resetPaymentState() {
    setExpandedPayEnr(new Set());
    setEnrPayData({});
    setPayForms({});
    setPaySubmitting({});
    setPayErrors({});
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setEnroll(EMPTY_ENROLL);
    setEnrollError(null);
    resetPaymentState();
    setPanel('add');
  }

  function openEdit(student) {
    setForm({
      full_name:              student.full_name              ?? '',
      phone:                  student.phone                  ?? '',
      email:                  student.email                  ?? '',
      date_of_birth:          student.date_of_birth          ?? '',
      gender:                 student.gender                 ?? '',
      address:                student.address                ?? '',
      status:                 student.status                 ?? 'active',
      referred_by_partner_id: student.referred_by_partner_id ?? '',
      notes:                  student.notes                  ?? '',
    });
    setFormError(null);
    setSelected(student);
    setEnroll(EMPTY_ENROLL);
    setEnrollError(null);
    setEditingEnrId(null);
    setEditEnrForm({});
    setEditEnrError(null);
    resetPaymentState();
    setConvertError(null);
    setPanel('edit');
  }

  function closePanel() {
    setPanel(null);
    setSelected(null);
    setFormError(null);
    setEnroll(EMPTY_ENROLL);
    setEnrollError(null);
    setEditingEnrId(null);
    setEditEnrForm({});
    setEditEnrError(null);
    resetPaymentState();
    setConvertError(null);
  }

  // ── form handlers ────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEnrollChange(e) {
    const { name, value } = e.target;
    if (name === 'course_id') {
      setEnroll((prev) => ({ ...prev, course_id: value, batch_id: '' }));
      if (value) fetchBatchesForCourse(value);
    } else {
      setEnroll((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.full_name.trim()) { setFormError('Full name is required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload = { full_name: form.full_name.trim(), status: form.status };
      if (form.phone.trim())   payload.phone         = form.phone.trim();
      if (form.email.trim())   payload.email         = form.email.trim();
      if (form.date_of_birth)  payload.date_of_birth = form.date_of_birth;
      if (form.gender)         payload.gender        = form.gender;
      if (form.address.trim()) payload.address       = form.address.trim();
      if (form.notes.trim())   payload.notes         = form.notes.trim();
      payload.referred_by_partner_id = form.referred_by_partner_id || null;

      if (panel === 'add') {
        await api.post('/course-students', payload);
        await loadStudents();
        closePanel();
      } else {
        await api.patch(`/course-students/${selected.id}`, payload);
        await refetchSelected(selected.id);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEnrollSubmit(e) {
    e.preventDefault();
    if (!enroll.course_id) { setEnrollError('Please select a course.'); return; }
    setEnrolling(true);
    setEnrollError(null);
    try {
      const payload = { course_id: enroll.course_id };
      if (enroll.agreed_fee !== '')      payload.agreed_fee      = Number(enroll.agreed_fee);
      if (enroll.enrollment_date)        payload.enrollment_date = enroll.enrollment_date;
      payload.batch_id = enroll.batch_id || null;
      await api.post(`/course-students/${selected.id}/enrollments`, payload);
      await refetchSelected(selected.id);
      setEnroll(EMPTY_ENROLL);
    } catch (err) {
      setEnrollError(err.message);
    } finally {
      setEnrolling(false);
    }
  }

  async function handlePaymentStatus(enrollmentId, newStatus) {
    try {
      await api.patch(`/enrollments/${enrollmentId}`, { payment_status: newStatus });
      await refetchSelected(selected.id);
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  }

  async function handleRemoveEnrollment(enrollmentId) {
    if (!window.confirm('Remove this enrollment? This cannot be undone.')) return;
    try {
      await api.delete(`/enrollments/${enrollmentId}`);
      await refetchSelected(selected.id);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  function startEditEnr(enr) {
    setEditingEnrId(enr.id);
    setEditEnrForm({
      course_id:       enr.course_id       ?? '',
      agreed_fee:      enr.agreed_fee      ?? '',
      status:          enr.status          ?? 'enrolled',
      payment_status:  enr.payment_status  ?? 'pending',
      enrollment_date: enr.enrollment_date ?? '',
      notes:           enr.notes           ?? '',
      batch_id:        enr.batch_id        ?? '',
    });
    setEditEnrError(null);
    if (enr.course_id) fetchBatchesForCourse(enr.course_id);
  }

  function cancelEditEnr() {
    setEditingEnrId(null);
    setEditEnrForm({});
    setEditEnrError(null);
  }

  function handleEditEnrChange(e) {
    const { name, value } = e.target;
    if (name === 'course_id') {
      setEditEnrForm((prev) => ({ ...prev, course_id: value, batch_id: '' }));
      if (value) fetchBatchesForCourse(value);
    } else {
      setEditEnrForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSaveEnr(enrollmentId) {
    if (!editEnrForm.course_id) { setEditEnrError('Please select a course.'); return; }
    setEditEnrSaving(true);
    setEditEnrError(null);
    try {
      const payload = {
        course_id:      editEnrForm.course_id,
        status:         editEnrForm.status,
        payment_status: editEnrForm.payment_status,
      };
      if (editEnrForm.agreed_fee !== '') payload.agreed_fee = Number(editEnrForm.agreed_fee);
      if (editEnrForm.enrollment_date)   payload.enrollment_date = editEnrForm.enrollment_date;
      payload.notes    = editEnrForm.notes.trim() || null;
      payload.batch_id = editEnrForm.batch_id || null;
      await api.patch(`/enrollments/${enrollmentId}`, payload);
      await refetchSelected(selected.id);
      cancelEditEnr();
    } catch (err) {
      setEditEnrError(err.message);
    } finally {
      setEditEnrSaving(false);
    }
  }

  async function handleDeleteStudent(e, student) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${student.full_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/course-students/${student.id}`);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  async function handleConvert(track) {
    const label = track === 'student' ? 'education Student' : 'SSW Candidate';
    if (!window.confirm(
      `Convert this course student to an ${label}? Their details will be copied; the course record stays linked.`
    )) return;
    setConverting(track);
    setConvertError(null);
    try {
      const endpoint = track === 'student'
        ? `/course-students/${selected.id}/convert-to-student`
        : `/course-students/${selected.id}/convert-to-candidate`;
      await api.post(endpoint, {});
      await refetchSelected(selected.id);
    } catch (err) {
      setConvertError(err.message);
    } finally {
      setConverting(null);
    }
  }

  // ── payment functions (finance-gated) ────────────────────────────────────────

  async function fetchEnrPayments(enrollmentId) {
    setEnrPayData((prev) => ({
      ...prev,
      [enrollmentId]: { ...prev[enrollmentId], loading: true, error: null },
    }));
    try {
      const [summary, payments] = await Promise.all([
        api.get(`/enrollments/${enrollmentId}/payment-summary`),
        api.get(`/enrollments/${enrollmentId}/payments`),
      ]);
      setEnrPayData((prev) => ({
        ...prev,
        [enrollmentId]: { summary, payments, loading: false, error: null },
      }));
    } catch (err) {
      // fail quietly for 403; show error otherwise
      setEnrPayData((prev) => ({
        ...prev,
        [enrollmentId]: {
          ...(prev[enrollmentId] ?? {}),
          loading: false,
          error: err.message?.includes('403') ? null : err.message,
        },
      }));
    }
  }

  function togglePaymentPanel(enrollmentId) {
    setExpandedPayEnr((prev) => {
      const next = new Set(prev);
      if (next.has(enrollmentId)) {
        next.delete(enrollmentId);
      } else {
        next.add(enrollmentId);
        // Initialise form if not already
        setPayForms((pf) => ({
          ...pf,
          [enrollmentId]: pf[enrollmentId] ?? emptyPayForm(),
        }));
        fetchEnrPayments(enrollmentId);
      }
      return next;
    });
  }

  function handlePayFormChange(enrollmentId, name, value) {
    setPayForms((prev) => ({
      ...prev,
      [enrollmentId]: { ...prev[enrollmentId], [name]: value },
    }));
  }

  async function handleAddPayment(e, enrollmentId) {
    e.preventDefault();
    const pf = payForms[enrollmentId] ?? emptyPayForm();
    if (!pf.amount || Number(pf.amount) <= 0) {
      setPayErrors((prev) => ({ ...prev, [enrollmentId]: 'Amount is required and must be > 0.' }));
      return;
    }
    setPayErrors((prev) => ({ ...prev, [enrollmentId]: null }));
    setPaySubmitting((prev) => ({ ...prev, [enrollmentId]: true }));
    try {
      const payload = { amount: Number(pf.amount) };
      if (pf.payment_date)   payload.payment_date   = pf.payment_date;
      if (pf.payment_method) payload.payment_method = pf.payment_method;
      if (pf.reference.trim())   payload.reference  = pf.reference.trim();
      if (pf.notes.trim())       payload.notes      = pf.notes.trim();
      await api.post(`/enrollments/${enrollmentId}/payments`, payload);
      // Reset form to fresh (keep method selection, reset amounts/refs)
      setPayForms((prev) => ({ ...prev, [enrollmentId]: emptyPayForm() }));
      // Refetch payments + summary for this enrollment + full student (for badge)
      await Promise.all([
        fetchEnrPayments(enrollmentId),
        refetchSelected(selected.id),
      ]);
    } catch (err) {
      setPayErrors((prev) => ({ ...prev, [enrollmentId]: err.message }));
    } finally {
      setPaySubmitting((prev) => ({ ...prev, [enrollmentId]: false }));
    }
  }

  async function handleDeletePayment(paymentId, enrollmentId) {
    if (!window.confirm('Delete this payment? It will be reversed from accounting.')) return;
    try {
      await api.delete(`/payments/${paymentId}`);
      await Promise.all([
        fetchEnrPayments(enrollmentId),
        refetchSelected(selected.id),
      ]);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  const selectedCourse = courses.find((c) => c.id === enroll.course_id);

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Course Students</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">
              {students.length} student{students.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Register Course Student
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">
          Loading course students…
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or phone…"
                className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm
                           focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            {search.trim() && (
              <p className="mt-1.5 text-xs text-gray-500">
                {filtered.length === 0
                  ? 'No matches'
                  : `${filtered.length} of ${students.length} shown`}
              </p>
            )}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Phone', 'Email', 'Courses', 'Status', ''].map((col) => (
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
                    <td colSpan={6} className="px-5 py-16 text-center text-sm text-gray-400">
                      {search.trim()
                        ? `No matches for "${search.trim()}"`
                        : 'No course students yet — register one above.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => openEdit(s)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">{s.full_name}</td>
                      <td className="px-5 py-3 text-gray-600">{s.phone ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{s.email ?? '—'}</td>
                      <td className="px-5 py-3">
                        {(s.course_count ?? 0) === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="mr-1 text-xs text-gray-500">{s.course_count}×</span>
                            {(s.enrollments ?? []).slice(0, 3).map((enr) => (
                              <span
                                key={enr.id}
                                className="inline-block rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"
                              >
                                {enr.course_name ?? '?'}
                              </span>
                            ))}
                            {(s.enrollments ?? []).length > 3 && (
                              <span className="text-xs text-gray-400">
                                +{s.enrollments.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_PALETTE[s.status] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td
                        className="px-5 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canDelete && (
                          <button
                            onClick={(e) => handleDeleteStudent(e, s)}
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
        </>
      )}

      {/* Slide-in panel */}
      {panel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />

          <div className="fixed inset-y-0 right-0 z-50 flex w-[560px] flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'Register Course Student' : `Edit: ${selected?.full_name}`}
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

            {/* Scrollable body */}
            <div className="flex flex-1 flex-col overflow-y-auto">

              {/* ── Demographic form ─────────────────────────────────────── */}
              <form id="demographics-form" onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                <Field label="Full Name" required>
                  <input
                    className={INPUT}
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. Nusrat Jahan"
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
                      placeholder="email@example.com"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Date of Birth">
                    <input
                      className={INPUT}
                      type="date"
                      name="date_of_birth"
                      value={form.date_of_birth}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </Field>
                  <Field label="Gender">
                    <select
                      className={INPUT}
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— optional —</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
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
                    placeholder="Home address…"
                  />
                </Field>

                <Field label="Status">
                  <select
                    className={INPUT}
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </Field>

                {isFinance && (
                  <Field label="Referred By (Partner)">
                    <select
                      className={INPUT}
                      name="referred_by_partner_id"
                      value={form.referred_by_partner_id}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— none / direct —</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </Field>
                )}

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
              </form>

              {/* ── Enrollments section (edit mode only) ─────────────────── */}
              {panel === 'edit' && (
                <div className="border-t border-gray-100 px-6 py-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Enrollments
                  </p>

                  {/* Existing enrollments list */}
                  {(selected?.enrollments ?? []).length === 0 ? (
                    <p className="mb-4 text-xs text-gray-400">No enrollments yet.</p>
                  ) : (
                    <div className="mb-5 divide-y divide-gray-100 rounded-md border border-gray-200">
                      {(selected?.enrollments ?? []).map((enr) => {
                        const payExpanded = expandedPayEnr.has(enr.id);
                        const pd = enrPayData[enr.id];
                        const pf = payForms[enr.id] ?? emptyPayForm();
                        const pSubmitting = paySubmitting[enr.id] ?? false;
                        const pError = payErrors[enr.id] ?? null;

                        return (
                          <div key={enr.id}>
                            {/* Row */}
                            <div className="flex items-center gap-2 px-3 py-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="truncate text-sm font-medium text-gray-800">
                                    {enr.course_name ?? '—'}
                                  </p>
                                  {enr.batch_name && (
                                    <span className="inline-block rounded bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-600">
                                      {enr.batch_name}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  {fmt(enr.agreed_fee, enr.currency)}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  ENROLL_STATUS_PALETTE[enr.status] ?? 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {enr.status}
                              </span>
                              {/* Quick payment status (existing) */}
                              <select
                                value={enr.payment_status ?? 'pending'}
                                onChange={(e) => handlePaymentStatus(enr.id, e.target.value)}
                                disabled={enrolling || editEnrSaving}
                                className={`rounded border px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none ${
                                  PAYMENT_PALETTE[enr.payment_status ?? 'pending'] ?? 'border-gray-300'
                                } border-gray-300 disabled:opacity-50`}
                                title="Payment status"
                              >
                                <option value="pending">Pending</option>
                                <option value="partial">Partial</option>
                                <option value="paid">Paid</option>
                              </select>
                              {/* Finance-only: toggle payments sub-panel */}
                              {isFinance && (
                                <button
                                  onClick={() => togglePaymentPanel(enr.id)}
                                  title={payExpanded ? 'Hide payments' : 'Show payments'}
                                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                                    payExpanded
                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  ৳ Pay
                                </button>
                              )}
                              {/* Edit button — hidden while this row's edit form is open */}
                              {editingEnrId !== enr.id && (
                                <button
                                  onClick={() => startEditEnr(enr)}
                                  disabled={editEnrSaving}
                                  className="rounded px-2 py-1 text-xs font-medium text-indigo-600
                                             hover:bg-indigo-50 disabled:opacity-40"
                                  title="Edit enrollment"
                                >
                                  Edit
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleRemoveEnrollment(enr.id)}
                                  disabled={enrolling || editEnrSaving}
                                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                  title="Remove enrollment"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Inline edit form */}
                            {editingEnrId === enr.id && (
                              <div className="border-t border-gray-100 bg-gray-50 px-3 py-3 space-y-2">
                                {editEnrError && (
                                  <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                    {editEnrError}
                                  </div>
                                )}
                                <Field label="Course">
                                  <select
                                    className={INPUT}
                                    name="course_id"
                                    value={editEnrForm.course_id}
                                    onChange={handleEditEnrChange}
                                    disabled={editEnrSaving}
                                  >
                                    <option value="">— select a course —</option>
                                    {courses.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name} — {fmt(c.default_fee, c.currency)}
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                                <Field label="Batch (optional)">
                                  <select
                                    className={INPUT}
                                    name="batch_id"
                                    value={editEnrForm.batch_id}
                                    onChange={handleEditEnrChange}
                                    disabled={editEnrSaving || !editEnrForm.course_id}
                                  >
                                    <option value="">— no batch —</option>
                                    {(batchesByCourse[editEnrForm.course_id] ?? []).map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {b.name}{b.start_date ? ` (${b.start_date})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                                <div className="grid grid-cols-2 gap-2">
                                  <Field label="Agreed Fee (৳)">
                                    <input
                                      className={INPUT}
                                      type="number"
                                      min="0"
                                      step="any"
                                      name="agreed_fee"
                                      value={editEnrForm.agreed_fee}
                                      onChange={handleEditEnrChange}
                                      disabled={editEnrSaving}
                                      placeholder="0"
                                    />
                                  </Field>
                                  <Field label="Enrollment Date">
                                    <input
                                      className={INPUT}
                                      type="date"
                                      name="enrollment_date"
                                      value={editEnrForm.enrollment_date}
                                      onChange={handleEditEnrChange}
                                      disabled={editEnrSaving}
                                    />
                                  </Field>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <Field label="Status">
                                    <select
                                      className={INPUT}
                                      name="status"
                                      value={editEnrForm.status}
                                      onChange={handleEditEnrChange}
                                      disabled={editEnrSaving}
                                    >
                                      <option value="enrolled">Enrolled</option>
                                      <option value="active">Active</option>
                                      <option value="completed">Completed</option>
                                      <option value="dropped">Dropped</option>
                                    </select>
                                  </Field>
                                  <Field label="Payment Status">
                                    <select
                                      className={INPUT}
                                      name="payment_status"
                                      value={editEnrForm.payment_status}
                                      onChange={handleEditEnrChange}
                                      disabled={editEnrSaving}
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="partial">Partial</option>
                                      <option value="paid">Paid</option>
                                    </select>
                                  </Field>
                                </div>
                                <Field label="Notes">
                                  <textarea
                                    className={INPUT}
                                    name="notes"
                                    value={editEnrForm.notes}
                                    onChange={handleEditEnrChange}
                                    disabled={editEnrSaving}
                                    rows={2}
                                    placeholder="Notes…"
                                  />
                                </Field>
                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={cancelEditEnr}
                                    disabled={editEnrSaving}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs
                                               font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEnr(enr.id)}
                                    disabled={editEnrSaving}
                                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium
                                               text-white hover:bg-indigo-700 disabled:opacity-50"
                                  >
                                    {editEnrSaving ? 'Saving…' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* ── Payments sub-panel (finance only, toggle) ── */}
                            {isFinance && payExpanded && (
                              <div className="border-t border-emerald-100 bg-emerald-50/40 px-3 py-3 space-y-3">

                                {/* Summary */}
                                {pd?.loading && (
                                  <p className="text-xs text-gray-400">Loading payments…</p>
                                )}
                                {pd?.error && (
                                  <p className="text-xs text-red-500">{pd.error}</p>
                                )}
                                {pd?.summary && (
                                  <div className="flex items-center gap-3 text-xs font-medium">
                                    <span className="text-gray-500">
                                      Full {fmt(pd.summary.full_amount, pd.summary.currency)}
                                    </span>
                                    <span className="text-emerald-700">
                                      Paid {fmt(pd.summary.total_paid, pd.summary.currency)}
                                    </span>
                                    <span
                                      className={
                                        pd.summary.remaining > 0
                                          ? 'text-amber-600'
                                          : 'text-emerald-700'
                                      }
                                    >
                                      Remaining {fmt(pd.summary.remaining, pd.summary.currency)}
                                    </span>
                                  </div>
                                )}

                                {/* Payment history */}
                                {pd?.payments?.length > 0 && (
                                  <div className="rounded border border-emerald-100 bg-white divide-y divide-gray-100">
                                    {pd.payments.map((p) => (
                                      <div key={p.id} className="flex items-center gap-2 px-3 py-2">
                                        <div className="flex-1 min-w-0">
                                          <span className="text-xs font-medium text-gray-800">
                                            {fmt(p.amount, p.currency ?? 'BDT')}
                                          </span>
                                          <span className="ml-2 text-xs text-gray-500">
                                            {p.payment_date ?? '—'}
                                          </span>
                                          {p.payment_method && (
                                            <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 capitalize">
                                              {p.payment_method.replace('_', ' ')}
                                            </span>
                                          )}
                                          {p.reference && (
                                            <span className="ml-2 text-xs text-gray-400 truncate">
                                              {p.reference}
                                            </span>
                                          )}
                                        </div>
                                        {canDelete && (
                                          <button
                                            onClick={() => handleDeletePayment(p.id, enr.id)}
                                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                            title="Delete payment"
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {pd && !pd.loading && pd.payments?.length === 0 && (
                                  <p className="text-xs text-gray-400">No payments recorded yet.</p>
                                )}

                                {/* Add payment form */}
                                <form
                                  onSubmit={(e) => handleAddPayment(e, enr.id)}
                                  className="space-y-2 rounded border border-emerald-100 bg-white px-3 py-2.5"
                                >
                                  <p className="text-xs font-semibold text-gray-600">+ Add Payment</p>
                                  {pError && (
                                    <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                                      {pError}
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-2">
                                    <Field label="Amount (৳)" required>
                                      <input
                                        className={INPUT}
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        value={pf.amount}
                                        onChange={(e) => handlePayFormChange(enr.id, 'amount', e.target.value)}
                                        disabled={pSubmitting}
                                        placeholder="0"
                                      />
                                    </Field>
                                    <Field label="Date">
                                      <input
                                        className={INPUT}
                                        type="date"
                                        value={pf.payment_date}
                                        onChange={(e) => handlePayFormChange(enr.id, 'payment_date', e.target.value)}
                                        disabled={pSubmitting}
                                      />
                                    </Field>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Field label="Method">
                                      <select
                                        className={INPUT}
                                        value={pf.payment_method}
                                        onChange={(e) => handlePayFormChange(enr.id, 'payment_method', e.target.value)}
                                        disabled={pSubmitting}
                                      >
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="card">Card</option>
                                        <option value="gateway">Gateway</option>
                                      </select>
                                    </Field>
                                    <Field label="Reference">
                                      <input
                                        className={INPUT}
                                        type="text"
                                        value={pf.reference}
                                        onChange={(e) => handlePayFormChange(enr.id, 'reference', e.target.value)}
                                        disabled={pSubmitting}
                                        placeholder="Txn / receipt no."
                                      />
                                    </Field>
                                  </div>
                                  <Field label="Notes">
                                    <input
                                      className={INPUT}
                                      type="text"
                                      value={pf.notes}
                                      onChange={(e) => handlePayFormChange(enr.id, 'notes', e.target.value)}
                                      disabled={pSubmitting}
                                      placeholder="Optional note…"
                                    />
                                  </Field>
                                  <div className="flex items-center justify-between pt-0.5">
                                    <p className="text-xs text-gray-400">
                                      Recording a payment posts it to Accounting (course revenue).
                                    </p>
                                    <button
                                      type="submit"
                                      disabled={pSubmitting}
                                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium
                                                 text-white hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      {pSubmitting ? 'Saving…' : 'Record'}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Enrol sub-form */}
                  <p className="mb-2 text-xs font-medium text-gray-600">Enrol in a course</p>
                  {enrollError && (
                    <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {enrollError}
                    </div>
                  )}
                  <form onSubmit={handleEnrollSubmit} className="space-y-3">
                    <Field label="Course">
                      <select
                        className={INPUT}
                        name="course_id"
                        value={enroll.course_id}
                        onChange={handleEnrollChange}
                        disabled={enrolling}
                      >
                        <option value="">— select a course —</option>
                        {courses
                          .filter((c) => c.is_active)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} — {fmt(c.default_fee, c.currency)}
                            </option>
                          ))}
                      </select>
                    </Field>

                    <Field label="Batch (optional)">
                      <select
                        className={INPUT}
                        name="batch_id"
                        value={enroll.batch_id}
                        onChange={handleEnrollChange}
                        disabled={enrolling || !enroll.course_id}
                      >
                        <option value="">— no batch —</option>
                        {(batchesByCourse[enroll.course_id] ?? []).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}{b.start_date ? ` (${b.start_date})` : ''}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label={
                          selectedCourse
                            ? `Fee override (default: ${fmt(selectedCourse.default_fee, selectedCourse.currency)})`
                            : 'Fee override (optional)'
                        }
                      >
                        <input
                          className={INPUT}
                          type="number"
                          min="0"
                          step="any"
                          name="agreed_fee"
                          value={enroll.agreed_fee}
                          onChange={handleEnrollChange}
                          disabled={enrolling}
                          placeholder={
                            selectedCourse ? String(selectedCourse.default_fee ?? 0) : 'default'
                          }
                        />
                      </Field>
                      <Field label="Enrollment Date (optional)">
                        <input
                          className={INPUT}
                          type="date"
                          name="enrollment_date"
                          value={enroll.enrollment_date}
                          onChange={handleEnrollChange}
                          disabled={enrolling}
                        />
                      </Field>
                    </div>

                    <button
                      type="submit"
                      disabled={enrolling}
                      className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium
                                 text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {enrolling ? 'Enrolling…' : '+ Enrol'}
                    </button>
                  </form>
                </div>
              )}

              {/* ── Convert to track (edit mode only) ────────────────────── */}
              {panel === 'edit' && (
                <div className="border-t border-gray-100 px-6 py-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Convert to Track
                  </p>
                  {convertError && (
                    <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {convertError}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {selected?.converted_student_id ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                        &#10003; Converted to Student
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConvert('student')}
                        disabled={converting !== null}
                        className="rounded-md border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm
                                   font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                      >
                        {converting === 'student' ? 'Converting…' : 'Convert to Student'}
                      </button>
                    )}
                    {selected?.converted_candidate_id ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                        &#10003; Converted to Candidate
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConvert('candidate')}
                        disabled={converting !== null}
                        className="rounded-md border border-violet-300 bg-violet-50 px-4 py-2 text-sm
                                   font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                      >
                        {converting === 'candidate' ? 'Converting…' : 'Convert to Candidate'}
                      </button>
                    )}
                  </div>
                </div>
              )}
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
                {panel === 'edit' ? 'Close' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="demographics-form"
                disabled={saving}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                           hover:bg-indigo-700 disabled:opacity-50 focus:outline-none
                           focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              >
                {saving ? 'Saving…' : panel === 'add' ? 'Register Student' : 'Save Changes'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
