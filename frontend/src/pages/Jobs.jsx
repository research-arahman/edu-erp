import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// ── constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '',
  employer_id: '',
  industry_field_id: '',
  description: '',
  employment_type: '',
  location: '',
  salary_min: '',
  salary_max: '',
  salary_currency: 'JPY',
  salary_period: 'monthly',
  req_language_qual_id: '',
  req_language_level: '',
  req_skills_qual_id: '',
  req_skills_detail: '',
  min_experience_years: '',
  age_min: '',
  age_max: '',
  other_requirements: '',
  start_period: '',
  positions_available: '',
  is_open: true,
};

function buildPayload(form) {
  const p = {
    employer_id:      form.employer_id,
    title:            form.title.trim(),
    is_open:          form.is_open,
    salary_currency:  form.salary_currency || 'JPY',
    salary_period:    form.salary_period   || 'monthly',
  };
  if (form.industry_field_id)          p.industry_field_id       = Number(form.industry_field_id);
  if (form.description?.trim())        p.description              = form.description.trim();
  if (form.employment_type)            p.employment_type          = form.employment_type;
  if (form.location?.trim())           p.location                 = form.location.trim();
  if (form.salary_min !== '')          p.salary_min               = Number(form.salary_min);
  if (form.salary_max !== '')          p.salary_max               = Number(form.salary_max);
  if (form.req_language_qual_id)       p.req_language_qual_id     = Number(form.req_language_qual_id);
  if (form.req_language_level?.trim()) p.req_language_level       = form.req_language_level.trim();
  if (form.req_skills_qual_id)         p.req_skills_qual_id       = Number(form.req_skills_qual_id);
  if (form.req_skills_detail?.trim())  p.req_skills_detail        = form.req_skills_detail.trim();
  if (form.min_experience_years !== '') p.min_experience_years    = Number(form.min_experience_years);
  if (form.age_min !== '')             p.age_min                  = Number(form.age_min);
  if (form.age_max !== '')             p.age_max                  = Number(form.age_max);
  if (form.other_requirements?.trim()) p.other_requirements       = form.other_requirements.trim();
  if (form.start_period?.trim())       p.start_period             = form.start_period.trim();
  if (form.positions_available !== '') p.positions_available      = Number(form.positions_available);
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

export default function Jobs() {
  const [jobs,        setJobs]        = useState([]);
  const [employers,   setEmployers]   = useState([]);
  const [industries,  setIndustries]  = useState([]);
  const [qualTypes,   setQualTypes]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const [panel,       setPanel]       = useState(null); // null | 'add' | 'edit'
  const [selected,    setSelected]    = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState(null);

  // ── data loading ───────────────────────────────────────────────────────────

  function loadJobs() {
    return api.get('/jobs').then(setJobs);
  }

  useEffect(() => {
    Promise.all([
      api.get('/jobs'),
      api.get('/employers'),
      api.get('/industries'),
      api.get('/qualification-types'),
    ])
      .then(([js, emps, inds, quals]) => {
        setJobs(js);
        setEmployers(emps);
        setIndustries(inds);
        setQualTypes(quals);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const employerMap  = Object.fromEntries(employers.map((e) => [e.id,   e.name]));
  const industryMap  = Object.fromEntries(industries.map((i) => [i.id,  i.name]));

  const langQuals   = qualTypes.filter((q) => q.category === 'language');
  const skillsQuals = qualTypes.filter((q) => q.category === 'skills');

  // ── panel helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setPanel('add');
  }

  function openEdit(job) {
    setForm({
      title:                job.title                              ?? '',
      employer_id:          job.employer_id                        ?? '',
      industry_field_id:    job.industry_field_id?.toString()      ?? '',
      description:          job.description                        ?? '',
      employment_type:      job.employment_type                    ?? '',
      location:             job.location                           ?? '',
      salary_min:           job.salary_min?.toString()             ?? '',
      salary_max:           job.salary_max?.toString()             ?? '',
      salary_currency:      job.salary_currency                    ?? 'JPY',
      salary_period:        job.salary_period                      ?? 'monthly',
      req_language_qual_id: job.req_language_qual_id?.toString()   ?? '',
      req_language_level:   job.req_language_level                 ?? '',
      req_skills_qual_id:   job.req_skills_qual_id?.toString()     ?? '',
      req_skills_detail:    job.req_skills_detail                  ?? '',
      min_experience_years: job.min_experience_years?.toString()   ?? '',
      age_min:              job.age_min?.toString()                ?? '',
      age_max:              job.age_max?.toString()                ?? '',
      other_requirements:   job.other_requirements                 ?? '',
      start_period:         job.start_period                       ?? '',
      positions_available:  job.positions_available?.toString()    ?? '',
      is_open:              job.is_open                            ?? true,
    });
    setFormError(null);
    setSelected(job);
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
    if (!form.title.trim() || !form.employer_id) {
      setFormError('Title and employer are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = buildPayload(form);
      if (panel === 'add') {
        await api.post('/jobs', payload);
      } else {
        await api.patch(`/jobs/${selected.id}`, payload);
      }
      await loadJobs();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, job) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/jobs/${job.id}`);
      setJobs((prev) => prev.filter((x) => x.id !== job.id));
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
          <h2 className="text-2xl font-semibold text-gray-900">Jobs</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Job
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
          Loading jobs…
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Title', 'Employer', 'Industry Field', 'Location', 'Open', ''].map((col) => (
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
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-gray-400">
                    No jobs yet — add one above.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => openEdit(job)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{job.title}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {employerMap[job.employer_id] ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {job.industry_field_id ? (industryMap[job.industry_field_id] ?? '—') : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{job.location ?? '—'}</td>
                    <td className="px-5 py-3">
                      {job.is_open ? (
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
                        onClick={(e) => handleDelete(e, job)}
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
          <div className="fixed inset-y-0 right-0 z-50 flex w-[540px] flex-col bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'Add Job' : `Edit: ${selected?.title}`}
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

                {/* Basic info */}
                <Field label="Job Title" required>
                  <input
                    className={INPUT}
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. Nursing Care Worker (SSW)"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Employer" required>
                    <select
                      className={INPUT}
                      name="employer_id"
                      value={form.employer_id}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">Select employer…</option>
                      {employers.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
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
                  <Field label="Employment Type">
                    <select
                      className={INPUT}
                      name="employment_type"
                      value={form.employment_type}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">— optional —</option>
                      <option value="ssw">SSW</option>
                      <option value="technical_intern">Technical Intern</option>
                      <option value="engineer">Engineer</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>

                  <Field label="Location">
                    <input
                      className={INPUT}
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g. Osaka, Japan"
                    />
                  </Field>
                </div>

                <Field label="Description">
                  <textarea
                    className={INPUT}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    disabled={saving}
                    rows={3}
                    placeholder="Role overview, responsibilities…"
                  />
                </Field>

                {/* Salary */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Salary
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Min">
                      <input
                        className={INPUT}
                        type="number"
                        name="salary_min"
                        value={form.salary_min}
                        onChange={handleChange}
                        disabled={saving}
                        placeholder="e.g. 160000"
                        min="0"
                      />
                    </Field>
                    <Field label="Max">
                      <input
                        className={INPUT}
                        type="number"
                        name="salary_max"
                        value={form.salary_max}
                        onChange={handleChange}
                        disabled={saving}
                        placeholder="e.g. 220000"
                        min="0"
                      />
                    </Field>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <Field label="Currency">
                      <input
                        className={INPUT}
                        name="salary_currency"
                        value={form.salary_currency}
                        onChange={handleChange}
                        disabled={saving}
                        placeholder="JPY"
                      />
                    </Field>
                    <Field label="Period">
                      <select
                        className={INPUT}
                        name="salary_period"
                        value={form.salary_period}
                        onChange={handleChange}
                        disabled={saving}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="hourly">Hourly</option>
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Requirements */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Requirements
                  </p>
                  <div className="space-y-3">

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Language Qualification">
                        <select
                          className={INPUT}
                          name="req_language_qual_id"
                          value={form.req_language_qual_id}
                          onChange={handleChange}
                          disabled={saving}
                        >
                          <option value="">— optional —</option>
                          {langQuals.map((q) => (
                            <option key={q.id} value={q.id}>{q.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Language Level">
                        <input
                          className={INPUT}
                          name="req_language_level"
                          value={form.req_language_level}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="e.g. N4, A2"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Skills Qualification">
                        <select
                          className={INPUT}
                          name="req_skills_qual_id"
                          value={form.req_skills_qual_id}
                          onChange={handleChange}
                          disabled={saving}
                        >
                          <option value="">— optional —</option>
                          {skillsQuals.map((q) => (
                            <option key={q.id} value={q.id}>{q.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Skills Detail">
                        <input
                          className={INPUT}
                          name="req_skills_detail"
                          value={form.req_skills_detail}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="e.g. Pass SSW skills test"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Min Experience (yrs)">
                        <input
                          className={INPUT}
                          type="number"
                          name="min_experience_years"
                          value={form.min_experience_years}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="e.g. 1"
                          min="0"
                        />
                      </Field>
                      <Field label="Age Min">
                        <input
                          className={INPUT}
                          type="number"
                          name="age_min"
                          value={form.age_min}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="e.g. 18"
                          min="0"
                        />
                      </Field>
                      <Field label="Age Max">
                        <input
                          className={INPUT}
                          type="number"
                          name="age_max"
                          value={form.age_max}
                          onChange={handleChange}
                          disabled={saving}
                          placeholder="e.g. 35"
                          min="0"
                        />
                      </Field>
                    </div>

                    <Field label="Other Requirements">
                      <textarea
                        className={INPUT}
                        name="other_requirements"
                        value={form.other_requirements}
                        onChange={handleChange}
                        disabled={saving}
                        rows={2}
                        placeholder="Any additional requirements…"
                      />
                    </Field>
                  </div>
                </div>

                {/* Posting details */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Posting Details
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Start Period">
                      <input
                        className={INPUT}
                        name="start_period"
                        value={form.start_period}
                        onChange={handleChange}
                        disabled={saving}
                        placeholder="e.g. April 2027, Immediate"
                      />
                    </Field>
                    <Field label="Positions Available">
                      <input
                        className={INPUT}
                        type="number"
                        name="positions_available"
                        value={form.positions_available}
                        onChange={handleChange}
                        disabled={saving}
                        placeholder="e.g. 3"
                        min="1"
                      />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <CheckRow
                      id="is_open"
                      label="Job is currently open / accepting applications"
                      checked={form.is_open}
                      onChange={handleChange}
                      disabled={saving}
                    />
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
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Job' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
