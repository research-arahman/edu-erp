import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import EducationSelector from '../components/EducationSelector';
import AdmissionRoadmap from '../components/AdmissionRoadmap';

// ── constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  full_name:              '',
  email:                  '',
  phone:                  '',
  date_of_birth:          '',
  gender:                 '',
  nationality:            'Bangladeshi',
  address:                '',
  purpose:                '',
  status:                 'active',
  // Passport
  passport_number:        '',
  passport_issue_date:    '',
  passport_expiry:        '',
  passport_country:       '',
  // Financial
  annual_income:          '',
  income_currency:        '',
  income_source:          '',
  // Supporter / sponsor
  supporter_name:         '',
  supporter_relation:     '',
  supporter_occupation:   '',
  supporter_income:       '',
  supporter_currency:     '',
  // Academic & career
  highest_qualification:  '',
  academic_summary:       '',
  career_summary:         '',
  // target destination (managed by EducationSelector)
  target_country_id:      null,
  target_institute_id:    null,
  target_program_id:      null,
  target_session_id:      null,
  _level_category:        null, // transient — not saved to DB
  // Referral
  referred_by_partner_id: '',
};

const STATUS_LABELS = {
  active:   'Active',
  archived: 'Archived',
  enrolled: 'Enrolled',
  dropped:  'Dropped',
};

function buildPayload(form) {
  const p = {
    full_name: form.full_name.trim(),
    status:    form.status || 'active',
  };
  if (form.email.trim())       p.email         = form.email.trim();
  if (form.phone.trim())       p.phone         = form.phone.trim();
  if (form.date_of_birth)      p.date_of_birth = form.date_of_birth;
  if (form.gender)             p.gender        = form.gender;
  if (form.nationality.trim()) p.nationality   = form.nationality.trim();
  if (form.address.trim())     p.address       = form.address.trim();
  if (form.purpose.trim())     p.purpose       = form.purpose.trim();
  // Passport
  if (form.passport_number.trim())       p.passport_number     = form.passport_number.trim();
  if (form.passport_issue_date)          p.passport_issue_date = form.passport_issue_date;
  if (form.passport_expiry)              p.passport_expiry     = form.passport_expiry;
  if (form.passport_country.trim())      p.passport_country    = form.passport_country.trim();
  // Financial
  if (form.annual_income !== '')         p.annual_income       = Number(form.annual_income);
  if (form.income_currency.trim())       p.income_currency     = form.income_currency.trim();
  if (form.income_source.trim())         p.income_source       = form.income_source.trim();
  // Supporter / sponsor
  if (form.supporter_name.trim())        p.supporter_name      = form.supporter_name.trim();
  if (form.supporter_relation.trim())    p.supporter_relation  = form.supporter_relation.trim();
  if (form.supporter_occupation.trim())  p.supporter_occupation = form.supporter_occupation.trim();
  if (form.supporter_income !== '')      p.supporter_income    = Number(form.supporter_income);
  if (form.supporter_currency.trim())    p.supporter_currency  = form.supporter_currency.trim();
  // Academic & career
  if (form.highest_qualification.trim()) p.highest_qualification = form.highest_qualification.trim();
  if (form.academic_summary.trim())      p.academic_summary    = form.academic_summary.trim();
  if (form.career_summary.trim())        p.career_summary      = form.career_summary.trim();
  // target_* ids — always write current selector state (null clears on edit)
  p.target_country_id   = form.target_country_id   != null ? Number(form.target_country_id) : null;
  p.target_institute_id = form.target_institute_id || null;
  p.target_program_id   = form.target_program_id   || null;
  p.target_session_id   = form.target_session_id   || null;
  // Referral — always include so null clears the column on PATCH
  p.referred_by_partner_id = form.referred_by_partner_id || null;
  // strip _level_category — it's transient
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
    active:   'bg-green-100 text-green-700',
    enrolled: 'bg-indigo-100 text-indigo-700',
    archived: 'bg-gray-100 text-gray-600',
    dropped:  'bg-red-100 text-red-600',
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

export default function Students() {
  const [students,     setStudents]     = useState([]);
  const [countries,    setCountries]    = useState([]);
  const [partners,     setPartners]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const [panel,        setPanel]        = useState(null); // null | 'add' | 'edit'
  const [selected,     setSelected]     = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState(null);
  // Incrementing key forces EducationSelector to remount each time the panel opens,
  // resetting internal cascade state cleanly.
  const [selectorKey,  setSelectorKey]  = useState(0);

  // ── data loading ───────────────────────────────────────────────────────────

  function loadStudents() {
    return api.get('/students').then(setStudents);
  }

  useEffect(() => {
    Promise.all([api.get('/students'), api.get('/countries'), api.get('/referral-partners')])
      .then(([studs, cntrs, parts]) => {
        setStudents(studs);
        setCountries(cntrs);
        setPartners(parts);
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
    setSelectorKey((k) => k + 1);
    setPanel('add');
  }

  function openEdit(student) {
    setForm({
      full_name:              student.full_name              ?? '',
      email:                  student.email                  ?? '',
      phone:                  student.phone                  ?? '',
      date_of_birth:          student.date_of_birth          ?? '',
      gender:                 student.gender                 ?? '',
      nationality:            student.nationality            ?? 'Bangladeshi',
      address:                student.address                ?? '',
      purpose:                student.purpose                ?? '',
      status:                 student.status                 ?? 'active',
      // Passport
      passport_number:        student.passport_number        ?? '',
      passport_issue_date:    student.passport_issue_date    ?? '',
      passport_expiry:        student.passport_expiry        ?? '',
      passport_country:       student.passport_country       ?? '',
      // Financial
      annual_income:          student.annual_income          ?? '',
      income_currency:        student.income_currency        ?? '',
      income_source:          student.income_source          ?? '',
      // Supporter / sponsor
      supporter_name:         student.supporter_name         ?? '',
      supporter_relation:     student.supporter_relation     ?? '',
      supporter_occupation:   student.supporter_occupation   ?? '',
      supporter_income:       student.supporter_income       ?? '',
      supporter_currency:     student.supporter_currency     ?? '',
      // Academic & career
      highest_qualification:  student.highest_qualification  ?? '',
      academic_summary:       student.academic_summary       ?? '',
      career_summary:         student.career_summary         ?? '',
      // target destination
      target_country_id:      student.target_country_id      ?? null,
      target_institute_id:    student.target_institute_id    ?? null,
      target_program_id:      student.target_program_id      ?? null,
      target_session_id:      student.target_session_id      ?? null,
      _level_category:        null, // EducationSelector will report this after loading
      // Referral
      referred_by_partner_id: student.referred_by_partner_id ?? '',
    });
    setFormError(null);
    setSelected(student);
    setSelectorKey((k) => k + 1);
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

  // Called by EducationSelector on every selection change
  function handleSelectorChange(sel) {
    setForm((prev) => ({
      ...prev,
      target_country_id:   sel.target_country_id,
      target_institute_id: sel.target_institute_id,
      target_program_id:   sel.target_program_id,
      target_session_id:   sel.target_session_id,
      _level_category:     sel._level_category,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setFormError('Full name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = buildPayload(form);
      if (panel === 'add') {
        await api.post('/students', payload);
      } else {
        await api.patch(`/students/${selected.id}`, payload);
      }
      await loadStudents();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, student) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${student.full_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/students/${student.id}`);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
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
          <h2 className="text-2xl font-semibold text-gray-900">Students</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{students.length} students</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Student
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
          Loading students…
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Full Name', 'Nationality', 'Target Country', 'Status', ''].map((col) => (
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
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-gray-400">
                    No students yet — add one above.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openEdit(s)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{s.full_name}</td>
                    <td className="px-5 py-3 text-gray-600">{s.nationality ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {s.target_country_id ? (countryMap[s.target_country_id] ?? '—') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td
                      className="px-5 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => handleDelete(e, s)}
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

          {/* Drawer — wider to fit the selector + roadmap */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-[560px] flex-col bg-white shadow-2xl">

            {/* Drawer header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'Add Student' : `Edit: ${selected?.full_name}`}
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

                {/* ── Core fields ─────────────────────────────────────────── */}

                <Field label="Full Name" required>
                  <input
                    className={INPUT}
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. Rahim Uddin"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nationality">
                    <input
                      className={INPUT}
                      name="nationality"
                      value={form.nationality}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g. Bangladeshi"
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
                      <option value="archived">Archived</option>
                      <option value="enrolled">Enrolled</option>
                      <option value="dropped">Dropped</option>
                    </select>
                  </Field>
                </div>

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

                <Field label="Purpose / Goal">
                  <textarea
                    className={INPUT}
                    name="purpose"
                    value={form.purpose}
                    onChange={handleChange}
                    disabled={saving}
                    rows={2}
                    placeholder="e.g. Master's in Japan to advance engineering career…"
                  />
                </Field>

                {/* ── Passport ────────────────────────────────────────────── */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Passport
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Passport Number">
                        <input
                          className={INPUT}
                          name="passport_number"
                          value={form.passport_number}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="A1234567"
                        />
                      </Field>
                      <Field label="Issuing Country">
                        <input
                          className={INPUT}
                          name="passport_country"
                          value={form.passport_country}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="e.g. Bangladesh"
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Issue Date">
                        <input
                          className={INPUT}
                          type="date"
                          name="passport_issue_date"
                          value={form.passport_issue_date}
                          onChange={handleChange}
                          disabled={saving}
                        />
                      </Field>
                      <Field label="Expiry Date">
                        <input
                          className={INPUT}
                          type="date"
                          name="passport_expiry"
                          value={form.passport_expiry}
                          onChange={handleChange}
                          disabled={saving}
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                {/* ── Financial ───────────────────────────────────────────── */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Financial
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Annual Income">
                        <input
                          className={INPUT}
                          type="number"
                          name="annual_income"
                          value={form.annual_income}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="0"
                          min="0"
                        />
                      </Field>
                      <Field label="Currency">
                        <input
                          className={INPUT}
                          name="income_currency"
                          value={form.income_currency}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="BDT"
                        />
                      </Field>
                    </div>
                    <Field label="Income Source">
                      <input
                        className={INPUT}
                        name="income_source"
                        value={form.income_source}
                        onChange={handleChange}
                        disabled={saving}
                        placeholder="e.g. Business, Salary, Family"
                      />
                    </Field>
                  </div>
                </div>

                {/* ── Supporter / Sponsor ─────────────────────────────────── */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Supporter / Sponsor
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Supporter Name">
                        <input
                          className={INPUT}
                          name="supporter_name"
                          value={form.supporter_name}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="Full name"
                        />
                      </Field>
                      <Field label="Relation">
                        <input
                          className={INPUT}
                          name="supporter_relation"
                          value={form.supporter_relation}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="e.g. Father"
                        />
                      </Field>
                    </div>
                    <Field label="Occupation">
                      <input
                        className={INPUT}
                        name="supporter_occupation"
                        value={form.supporter_occupation}
                        onChange={handleChange}
                        disabled={saving}
                        placeholder="e.g. Business owner"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Annual Income">
                        <input
                          className={INPUT}
                          type="number"
                          name="supporter_income"
                          value={form.supporter_income}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="0"
                          min="0"
                        />
                      </Field>
                      <Field label="Currency">
                        <input
                          className={INPUT}
                          name="supporter_currency"
                          value={form.supporter_currency}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="BDT"
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                {/* ── Academic & Career ───────────────────────────────────── */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Academic & Career
                  </p>
                  <div className="space-y-4">
                    <Field label="Highest Qualification">
                      <input
                        className={INPUT}
                        name="highest_qualification"
                        value={form.highest_qualification}
                        onChange={handleChange}
                        disabled={saving}
                        placeholder="e.g. Bachelor's in Engineering"
                      />
                    </Field>
                    <Field label="Academic Summary">
                      <textarea
                        className={INPUT}
                        name="academic_summary"
                        value={form.academic_summary}
                        onChange={handleChange}
                        disabled={saving}
                        rows={3}
                        placeholder="Academic background, GPA, institutions attended…"
                      />
                    </Field>
                    <Field label="Career Summary">
                      <textarea
                        className={INPUT}
                        name="career_summary"
                        value={form.career_summary}
                        onChange={handleChange}
                        disabled={saving}
                        rows={3}
                        placeholder="Work experience, skills, achievements…"
                      />
                    </Field>
                  </div>
                </div>

                {/* ── Target Destination ──────────────────────────────────── */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Target Destination
                  </p>
                  <EducationSelector
                    key={selectorKey}
                    value={{
                      target_country_id:   form.target_country_id,
                      target_institute_id: form.target_institute_id,
                      target_program_id:   form.target_program_id,
                      target_session_id:   form.target_session_id,
                    }}
                    onChange={handleSelectorChange}
                    disabled={saving}
                  />
                </div>

                {/* ── Admission Roadmap ────────────────────────────────────── */}
                {form.target_country_id != null && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Admission Roadmap
                    </p>
                    {form._level_category ? (
                      <AdmissionRoadmap
                        country_id={form.target_country_id}
                        level_category={form._level_category}
                        studentId={panel === 'edit' ? selected?.id : undefined}
                      />
                    ) : (
                      <p className="text-xs text-gray-400">
                        Select a level category above to see the admission roadmap.
                      </p>
                    )}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                             hover:bg-indigo-700 disabled:opacity-50 focus:outline-none
                             focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                >
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Student' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
