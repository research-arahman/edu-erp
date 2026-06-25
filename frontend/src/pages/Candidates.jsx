import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import EmploymentSelector from '../components/EmploymentSelector';
import PlacementRoadmap from '../components/PlacementRoadmap';
import { matchesQuery } from '../lib/search';

// ── constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  // Core identity
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
  passport_country:       '',
  passport_issue_date:    '',
  passport_expiry:        '',
  // Financial
  annual_income:          '',
  income_currency:        'BDT',
  income_source:          '',
  // Work background
  current_occupation:     '',
  total_experience_years: '',
  highest_qualification:  '',
  work_history:           '',
  // Language & Skills
  language_qual_id:       '',
  language_level:         '',
  skills_qual_id:         '',
  skills_detail:          '',
  // target destination (managed by EmploymentSelector)
  target_country_id:      null,
  target_industry_id:     null,
  target_employer_id:     null,
  target_job_id:          null,
  // Referral
  referred_by_partner_id: '',
};

const STATUS_LABELS = {
  active:   'Active',
  archived: 'Archived',
  placed:   'Placed',
  dropped:  'Dropped',
};

function buildPayload(form) {
  const p = {
    full_name: form.full_name.trim(),
    status:    form.status || 'active',
  };

  // Core
  if (form.email.trim())       p.email         = form.email.trim();
  if (form.phone.trim())       p.phone         = form.phone.trim();
  if (form.date_of_birth)      p.date_of_birth = form.date_of_birth;
  if (form.gender)             p.gender        = form.gender;
  if (form.nationality.trim()) p.nationality   = form.nationality.trim();
  if (form.address.trim())     p.address       = form.address.trim();
  if (form.purpose.trim())     p.purpose       = form.purpose.trim();

  // Passport
  if (form.passport_number.trim())    p.passport_number    = form.passport_number.trim();
  if (form.passport_country.trim())   p.passport_country   = form.passport_country.trim();
  if (form.passport_issue_date)       p.passport_issue_date = form.passport_issue_date;
  if (form.passport_expiry)           p.passport_expiry    = form.passport_expiry;

  // Financial
  if (form.annual_income !== '')      p.annual_income      = Number(form.annual_income);
  if (form.income_currency.trim())    p.income_currency    = form.income_currency.trim();
  if (form.income_source.trim())      p.income_source      = form.income_source.trim();

  // Work background
  if (form.current_occupation.trim())   p.current_occupation   = form.current_occupation.trim();
  if (form.total_experience_years !== '') p.total_experience_years = Number(form.total_experience_years);
  if (form.highest_qualification.trim()) p.highest_qualification = form.highest_qualification.trim();
  if (form.work_history.trim())         p.work_history         = form.work_history.trim();

  // Language & Skills
  if (form.language_qual_id !== '')   p.language_qual_id   = Number(form.language_qual_id);
  if (form.language_level.trim())     p.language_level     = form.language_level.trim();
  if (form.skills_qual_id !== '')     p.skills_qual_id     = Number(form.skills_qual_id);
  if (form.skills_detail.trim())      p.skills_detail      = form.skills_detail.trim();

  // target_* ids — always write current selector state (null clears on edit)
  p.target_country_id  = form.target_country_id  != null ? Number(form.target_country_id)  : null;
  p.target_industry_id = form.target_industry_id != null ? Number(form.target_industry_id) : null;
  p.target_employer_id = form.target_employer_id || null;
  p.target_job_id      = form.target_job_id      || null;
  // Referral — always include so null clears the column on PATCH
  p.referred_by_partner_id = form.referred_by_partner_id || null;
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

function SectionDivider({ title }) {
  return (
    <div className="border-t border-gray-100 pt-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const palette = {
    active:   'bg-green-100 text-green-700',
    placed:   'bg-indigo-100 text-indigo-700',
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

export default function Candidates() {
  const [candidates,   setCandidates]   = useState([]);
  const [countries,    setCountries]    = useState([]);
  const [qualTypes,    setQualTypes]    = useState([]);
  const [partners,     setPartners]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const [search,       setSearch]       = useState('');

  const [panel,        setPanel]        = useState(null); // null | 'add' | 'edit'
  const [selected,     setSelected]     = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState(null);
  const [selectorKey,  setSelectorKey]  = useState(0);

  // ── data loading ───────────────────────────────────────────────────────────

  function loadCandidates() {
    return api.get('/candidates').then(setCandidates);
  }

  useEffect(() => {
    Promise.all([
      api.get('/candidates'),
      api.get('/countries'),
      api.get('/qualification-types'),
      api.get('/referral-partners'),
    ])
      .then(([cands, cntrs, quals, parts]) => {
        setCandidates(cands);
        setCountries(cntrs);
        setQualTypes(quals);
        setPartners(parts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const countryMap   = Object.fromEntries(countries.map((c) => [c.id, c.name]));
  const langQuals    = qualTypes.filter((q) => q.category === 'language');
  const skillsQuals  = qualTypes.filter((q) => q.category === 'skills');

  const filtered = useMemo(
    () => candidates.filter((c) => matchesQuery(c, search)),
    [candidates, search],
  );

  // ── panel helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setSelectorKey((k) => k + 1);
    setPanel('add');
  }

  function openEdit(candidate) {
    setForm({
      // Core identity
      full_name:              candidate.full_name              ?? '',
      email:                  candidate.email                  ?? '',
      phone:                  candidate.phone                  ?? '',
      date_of_birth:          candidate.date_of_birth          ?? '',
      gender:                 candidate.gender                 ?? '',
      nationality:            candidate.nationality            ?? 'Bangladeshi',
      address:                candidate.address                ?? '',
      purpose:                candidate.purpose                ?? '',
      status:                 candidate.status                 ?? 'active',
      // Passport
      passport_number:        candidate.passport_number        ?? '',
      passport_country:       candidate.passport_country       ?? '',
      passport_issue_date:    candidate.passport_issue_date    ?? '',
      passport_expiry:        candidate.passport_expiry        ?? '',
      // Financial
      annual_income:          candidate.annual_income          != null ? String(candidate.annual_income) : '',
      income_currency:        candidate.income_currency        ?? 'BDT',
      income_source:          candidate.income_source          ?? '',
      // Work background
      current_occupation:     candidate.current_occupation     ?? '',
      total_experience_years: candidate.total_experience_years != null ? String(candidate.total_experience_years) : '',
      highest_qualification:  candidate.highest_qualification  ?? '',
      work_history:           candidate.work_history           ?? '',
      // Language & Skills (ids as strings for <select> value)
      language_qual_id:       candidate.language_qual_id       != null ? String(candidate.language_qual_id) : '',
      language_level:         candidate.language_level         ?? '',
      skills_qual_id:         candidate.skills_qual_id         != null ? String(candidate.skills_qual_id) : '',
      skills_detail:          candidate.skills_detail          ?? '',
      // target destination
      target_country_id:      candidate.target_country_id      ?? null,
      target_industry_id:     candidate.target_industry_id     ?? null,
      target_employer_id:     candidate.target_employer_id     ?? null,
      target_job_id:          candidate.target_job_id          ?? null,
      // Referral
      referred_by_partner_id: candidate.referred_by_partner_id ?? '',
    });
    setFormError(null);
    setSelected(candidate);
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

  function handleSelectorChange(sel) {
    setForm((prev) => ({
      ...prev,
      target_country_id:  sel.target_country_id,
      target_industry_id: sel.target_industry_id,
      target_employer_id: sel.target_employer_id,
      target_job_id:      sel.target_job_id,
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
        await api.post('/candidates', payload);
      } else {
        await api.patch(`/candidates/${selected.id}`, payload);
      }
      await loadCandidates();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, candidate) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${candidate.full_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/candidates/${candidate.id}`);
      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
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
          <h2 className="text-2xl font-semibold text-gray-900">Candidates</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{candidates.length} candidates</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Candidate
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
          Loading candidates…
        </div>
      )}

      {/* Search + Table */}
      {!loading && !error && (
        <>
          {/* Search box */}
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
                placeholder="Search by name, email, phone or date of birth…"
                className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm
                           focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            {search.trim() && (
              <p className="mt-1.5 text-xs text-gray-500">
                {filtered.length === 0
                  ? 'No matches'
                  : `${filtered.length} of ${candidates.length} candidate${candidates.length !== 1 ? 's' : ''} shown`}
              </p>
            )}
          </div>

          {/* Table */}
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-sm text-gray-400">
                      {search.trim()
                        ? `No matches for "${search.trim()}"`
                        : 'No candidates yet — add one above.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => openEdit(c)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">{c.full_name}</td>
                      <td className="px-5 py-3 text-gray-600">{c.nationality ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {c.target_country_id ? (countryMap[c.target_country_id] ?? '—') : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td
                        className="px-5 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleDelete(e, c)}
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

      {/* ── Slide-in panel ─────────────────────────────────────────────────── */}
      {panel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closePanel}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-[560px] flex-col bg-white shadow-2xl">

            {/* Drawer header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'Add Candidate' : `Edit: ${selected?.full_name}`}
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

                {/* ── 1. Core identity ────────────────────────────────────── */}

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
                      <option value="placed">Placed</option>
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
                    placeholder="e.g. SSW Nursing Care in Japan to build career abroad…"
                  />
                </Field>

                {/* ── 2. Passport ─────────────────────────────────────────── */}
                <SectionDivider title="Passport" />

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Passport Number">
                    <input
                      className={INPUT}
                      name="passport_number"
                      value={form.passport_number}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g. AB1234567"
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

                {/* ── 3. Financial ─────────────────────────────────────────── */}
                <SectionDivider title="Financial" />

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Field label="Annual Income">
                      <input
                        className={INPUT}
                        type="number"
                        min="0"
                        step="any"
                        name="annual_income"
                        value={form.annual_income}
                        onChange={handleChange}
                        disabled={saving}
                        placeholder="0"
                      />
                    </Field>
                  </div>
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
                    placeholder="e.g. Business, Employment, Remittance…"
                  />
                </Field>

                {/* ── 4. Work Background ──────────────────────────────────── */}
                <SectionDivider title="Work Background" />

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Current Occupation">
                    <input
                      className={INPUT}
                      name="current_occupation"
                      value={form.current_occupation}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g. Garment Worker"
                    />
                  </Field>
                  <Field label="Total Experience (years)">
                    <input
                      className={INPUT}
                      type="number"
                      min="0"
                      name="total_experience_years"
                      value={form.total_experience_years}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="0"
                    />
                  </Field>
                </div>

                <Field label="Highest Qualification">
                  <input
                    className={INPUT}
                    name="highest_qualification"
                    value={form.highest_qualification}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. HSC, Diploma in Engineering, B.Sc."
                  />
                </Field>

                <Field label="Work History">
                  <textarea
                    className={INPUT}
                    name="work_history"
                    value={form.work_history}
                    onChange={handleChange}
                    disabled={saving}
                    rows={3}
                    placeholder="Brief summary of past roles and employers…"
                  />
                </Field>

                {/* ── 5. Language & Skills ─────────────────────────────────── */}
                <SectionDivider title="Language & Skills" />

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Language Qualification">
                    <select
                      className={INPUT}
                      name="language_qual_id"
                      value={form.language_qual_id}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— none —</option>
                      {langQuals.map((q) => (
                        <option key={q.id} value={String(q.id)}>{q.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Level Achieved">
                    <input
                      className={INPUT}
                      name="language_level"
                      value={form.language_level}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g. N4, A2, IELTS 6.0"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Skills Qualification">
                    <select
                      className={INPUT}
                      name="skills_qual_id"
                      value={form.skills_qual_id}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— none —</option>
                      {skillsQuals.map((q) => (
                        <option key={q.id} value={String(q.id)}>{q.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Skills Detail">
                    <input
                      className={INPUT}
                      name="skills_detail"
                      value={form.skills_detail}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g. Passed SSW Nursing Care Test"
                    />
                  </Field>
                </div>

                {/* ── 6. Target Destination ───────────────────────────────── */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Target Destination
                  </p>
                  <EmploymentSelector
                    key={selectorKey}
                    value={{
                      target_country_id:  form.target_country_id,
                      target_industry_id: form.target_industry_id,
                      target_employer_id: form.target_employer_id,
                      target_job_id:      form.target_job_id,
                    }}
                    onChange={handleSelectorChange}
                    disabled={saving}
                  />
                </div>

                {/* ── 7. Placement Roadmap ─────────────────────────────────── */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Placement Roadmap
                  </p>
                  <PlacementRoadmap
                    country_id={form.target_country_id != null ? Number(form.target_country_id) : null}
                    industry_field_id={form.target_industry_id != null ? Number(form.target_industry_id) : null}
                    candidateId={panel === 'edit' ? selected?.id : null}
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
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Candidate' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
