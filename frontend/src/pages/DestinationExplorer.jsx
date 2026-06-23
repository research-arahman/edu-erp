import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const INPUT =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-400';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';

const LEVEL_LABELS = {
  bachelors: "Bachelor's",
  masters: "Master's",
  phd: 'PhD',
  diploma: 'Diploma',
  foundation: 'Foundation/Pathway',
  jlpt: 'JLPT (Japanese)',
  english: 'English',
  topik: 'TOPIK (Korean)',
  other: 'Other',
};

const INST_TYPE_LABELS = {
  university: 'University',
  language_school: 'Language School',
  diploma: 'Diploma',
};

function prettifyLevel(cat) {
  return LEVEL_LABELS[cat] ?? cat;
}

function prettifyInstType(t) {
  return INST_TYPE_LABELS[t] ?? t;
}

function Field({ label, children }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value ?? '—'}</p>
    </div>
  );
}

function EmptyNote({ show, msg }) {
  if (!show) return null;
  return <p className="mt-1 text-xs text-amber-600">{msg}</p>;
}

// ── Education chain ───────────────────────────────────────────────────────────

function EducationChain({ countries }) {
  const [countryId,   setCountryId]   = useState('');
  const [instType,    setInstType]    = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [levelCat,    setLevelCat]    = useState('');
  const [levelLabel,  setLevelLabel]  = useState('');
  const [programId,   setProgramId]   = useState('');
  const [sessionId,   setSessionId]   = useState('');

  const [instTypes,   setInstTypes]   = useState([]);
  const [institutes,  setInstitutes]  = useState([]);
  const [levelCats,   setLevelCats]   = useState([]);
  const [levelLabels, setLevelLabels] = useState([]);
  const [programs,    setPrograms]    = useState([]);
  const [sessions,    setSessions]    = useState([]);

  const [ld, setLd] = useState({});
  function load(key, p) {
    setLd((prev) => ({ ...prev, [key]: true }));
    return p.finally(() => setLd((prev) => ({ ...prev, [key]: false })));
  }

  // Country → institute types
  useEffect(() => {
    setInstType(''); setInstituteId(''); setLevelCat(''); setLevelLabel('');
    setProgramId(''); setSessionId('');
    setInstTypes([]); setInstitutes([]); setLevelCats([]); setLevelLabels([]);
    setPrograms([]); setSessions([]);
    if (!countryId) return;
    load('instTypes', api.get(`/selector/education/institute-types?country_id=${countryId}`).then(setInstTypes));
  }, [countryId]);

  // Institute type → institutes
  useEffect(() => {
    setInstituteId(''); setLevelCat(''); setLevelLabel('');
    setProgramId(''); setSessionId('');
    setInstitutes([]); setLevelCats([]); setLevelLabels([]);
    setPrograms([]); setSessions([]);
    if (!instType || !countryId) return;
    load(
      'institutes',
      api
        .get(`/selector/education/institutes?country_id=${countryId}&type=${encodeURIComponent(instType)}`)
        .then(setInstitutes),
    );
  }, [instType]);

  // Institute → level categories
  useEffect(() => {
    setLevelCat(''); setLevelLabel(''); setProgramId(''); setSessionId('');
    setLevelCats([]); setLevelLabels([]); setPrograms([]); setSessions([]);
    if (!instituteId) return;
    load(
      'levelCats',
      api.get(`/selector/education/level-categories?institute_id=${instituteId}`).then(setLevelCats),
    );
  }, [instituteId]);

  // Level category → level labels
  useEffect(() => {
    setLevelLabel(''); setProgramId(''); setSessionId('');
    setLevelLabels([]); setPrograms([]); setSessions([]);
    if (!levelCat || !instituteId) return;
    load(
      'levelLabels',
      api
        .get(
          `/selector/education/level-labels?institute_id=${instituteId}&level_category=${encodeURIComponent(levelCat)}`,
        )
        .then(setLevelLabels),
    );
  }, [levelCat]);

  // Level label (or levelCat when no labels) → programs
  useEffect(() => {
    setProgramId(''); setSessionId(''); setPrograms([]); setSessions([]);
    if (!levelCat || !instituteId) return;
    // Wait for a label selection if labels were returned
    if (levelLabels.length > 0 && !levelLabel) return;
    const params = new URLSearchParams({ institute_id: instituteId, level_category: levelCat });
    if (levelLabel) params.set('level_label', levelLabel);
    load('programs', api.get(`/selector/education/programs?${params}`).then(setPrograms));
  }, [levelLabel, levelLabels, levelCat]);

  // Program → sessions
  useEffect(() => {
    setSessionId(''); setSessions([]);
    if (!programId) return;
    load('sessions', api.get(`/selector/education/sessions?program_id=${programId}`).then(setSessions));
  }, [programId]);

  const prog = programs.find((p) => p.id === programId) ?? null;
  const sess = sessions.find((s) => s.id === sessionId) ?? null;
  const labelsLoaded = !ld.levelLabels;
  const programsReady = levelCat && !(levelLabels.length > 0 && !levelLabel);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {/* 1. Country */}
        <Field label="Country">
          <select className={INPUT} value={countryId} onChange={(e) => setCountryId(e.target.value)}>
            <option value="">Select country…</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        {/* 2. Institute Type */}
        <Field label="Institute Type">
          <select
            className={INPUT}
            value={instType}
            onChange={(e) => setInstType(e.target.value)}
            disabled={!countryId || ld.instTypes}
          >
            <option value="">{ld.instTypes ? 'Loading…' : 'Select type…'}</option>
            {instTypes.map((t) => (
              <option key={t} value={t}>{prettifyInstType(t)}</option>
            ))}
          </select>
          <EmptyNote show={!ld.instTypes && !!countryId && instTypes.length === 0} msg="No institute types available" />
        </Field>

        {/* 3. Institute */}
        <Field label="Institute">
          <select
            className={INPUT}
            value={instituteId}
            onChange={(e) => setInstituteId(e.target.value)}
            disabled={!instType || ld.institutes}
          >
            <option value="">{ld.institutes ? 'Loading…' : 'Select institute…'}</option>
            {institutes.map((i) => (
              <option key={i.id} value={i.id}>{i.name}{i.city ? ` (${i.city})` : ''}</option>
            ))}
          </select>
          <EmptyNote show={!ld.institutes && !!instType && institutes.length === 0} msg="No institutes available" />
        </Field>

        {/* 4. Level Category */}
        <Field label="Level Category">
          <select
            className={INPUT}
            value={levelCat}
            onChange={(e) => setLevelCat(e.target.value)}
            disabled={!instituteId || ld.levelCats}
          >
            <option value="">{ld.levelCats ? 'Loading…' : 'Select level…'}</option>
            {levelCats.map((c) => (
              <option key={c} value={c}>{prettifyLevel(c)}</option>
            ))}
          </select>
          <EmptyNote show={!ld.levelCats && !!instituteId && levelCats.length === 0} msg="No levels available" />
        </Field>

        {/* 5. Level Label — only shown when labels exist or are loading */}
        {(ld.levelLabels || (labelsLoaded && levelLabels.length > 0)) && (
          <Field label="Level / Specialisation">
            <select
              className={INPUT}
              value={levelLabel}
              onChange={(e) => setLevelLabel(e.target.value)}
              disabled={ld.levelLabels}
            >
              <option value="">{ld.levelLabels ? 'Loading…' : 'Select label…'}</option>
              {levelLabels.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
        )}

        {/* 6. Program */}
        <Field label="Program">
          <select
            className={INPUT}
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            disabled={!programsReady || ld.programs}
          >
            <option value="">{ld.programs ? 'Loading…' : 'Select program…'}</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.course_name || p.department || 'Program'}</option>
            ))}
          </select>
          <EmptyNote show={!ld.programs && programsReady && programs.length === 0} msg="No programs available" />
        </Field>

        {/* 7. Session */}
        <Field label="Intake Session">
          <select
            className={INPUT}
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            disabled={!programId || ld.sessions}
          >
            <option value="">{ld.sessions ? 'Loading…' : 'Select session…'}</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.session_name}</option>
            ))}
          </select>
          <EmptyNote show={!ld.sessions && !!programId && sessions.length === 0} msg="No open sessions available" />
        </Field>

      </div>

      {/* Program + session details */}
      {prog && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-5">
          <p className="mb-3 text-sm font-semibold text-indigo-900">Program Details</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DetailItem label="Duration" value={prog.duration_months ? `${prog.duration_months} months` : null} />
            <DetailItem
              label="Tuition Fee"
              value={
                prog.tuition_fee != null
                  ? `${prog.currency ?? ''} ${Number(prog.tuition_fee).toLocaleString()}`.trim()
                  : null
              }
            />
            <DetailItem
              label="Admission Cost"
              value={
                prog.admission_cost != null
                  ? `${prog.currency ?? ''} ${Number(prog.admission_cost).toLocaleString()}`.trim()
                  : null
              }
            />
            <DetailItem
              label="Enrollment Cost"
              value={
                prog.enrollment_cost != null
                  ? `${prog.currency ?? ''} ${Number(prog.enrollment_cost).toLocaleString()}`.trim()
                  : null
              }
            />
          </div>

          {sess && (
            <>
              <div className="my-4 border-t border-indigo-100" />
              <p className="mb-3 text-sm font-semibold text-indigo-900">Session: {sess.session_name}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <DetailItem label="Start Date" value={sess.start_date} />
                <DetailItem label="Application Deadline" value={sess.application_deadline} />
                <DetailItem label="Seats Available" value={sess.seats} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Employment chain ──────────────────────────────────────────────────────────

function EmploymentChain({ countries }) {
  const [countryId,   setCountryId]   = useState('');
  const [industryId,  setIndustryId]  = useState('');
  const [employerId,  setEmployerId]  = useState('');
  const [jobId,       setJobId]       = useState('');

  const [industries,  setIndustries]  = useState([]);
  const [employers,   setEmployers]   = useState([]);
  const [jobs,        setJobs]        = useState([]);
  const [qualTypes,   setQualTypes]   = useState([]);

  const [ld, setLd] = useState({});
  function load(key, p) {
    setLd((prev) => ({ ...prev, [key]: true }));
    return p.finally(() => setLd((prev) => ({ ...prev, [key]: false })));
  }

  // Fetch qualification types once for name lookup
  useEffect(() => {
    api.get('/qualification-types').then(setQualTypes).catch(() => {});
  }, []);

  const qualMap = Object.fromEntries(qualTypes.map((q) => [q.id, q.name]));

  // Country → industries
  useEffect(() => {
    setIndustryId(''); setEmployerId(''); setJobId('');
    setIndustries([]); setEmployers([]); setJobs([]);
    if (!countryId) return;
    load(
      'industries',
      api.get(`/selector/employment/industries?country_id=${countryId}`).then(setIndustries),
    );
  }, [countryId]);

  // Industry → employers
  useEffect(() => {
    setEmployerId(''); setJobId(''); setEmployers([]); setJobs([]);
    if (!industryId || !countryId) return;
    load(
      'employers',
      api
        .get(`/selector/employment/employers?country_id=${countryId}&industry_field_id=${industryId}`)
        .then(setEmployers),
    );
  }, [industryId]);

  // Employer → jobs
  useEffect(() => {
    setJobId(''); setJobs([]);
    if (!employerId) return;
    const params = new URLSearchParams({ employer_id: employerId });
    if (industryId) params.set('industry_field_id', industryId);
    load('jobs', api.get(`/selector/employment/jobs?${params}`).then(setJobs));
  }, [employerId]);

  const job = jobs.find((j) => j.id === jobId) ?? null;

  function fmtSalary(j) {
    if (!j.salary_min && !j.salary_max) return null;
    const cur = j.salary_currency ?? '';
    const per = j.salary_period ? `/${j.salary_period}` : '';
    if (j.salary_min && j.salary_max)
      return `${cur} ${Number(j.salary_min).toLocaleString()} – ${Number(j.salary_max).toLocaleString()}${per}`.trim();
    if (j.salary_min) return `${cur} ${Number(j.salary_min).toLocaleString()}+${per}`.trim();
    return `Up to ${cur} ${Number(j.salary_max).toLocaleString()}${per}`.trim();
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* 1. Country */}
        <Field label="Country">
          <select className={INPUT} value={countryId} onChange={(e) => setCountryId(e.target.value)}>
            <option value="">Select country…</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        {/* 2. Industry Field */}
        <Field label="Industry Field">
          <select
            className={INPUT}
            value={industryId}
            onChange={(e) => setIndustryId(e.target.value)}
            disabled={!countryId || ld.industries}
          >
            <option value="">{ld.industries ? 'Loading…' : 'Select industry…'}</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}{i.is_ssw ? ' [SSW]' : ''}
              </option>
            ))}
          </select>
          <EmptyNote show={!ld.industries && !!countryId && industries.length === 0} msg="No industries available" />
        </Field>

        {/* 3. Employer */}
        <Field label="Employer">
          <select
            className={INPUT}
            value={employerId}
            onChange={(e) => setEmployerId(e.target.value)}
            disabled={!industryId || ld.employers}
          >
            <option value="">{ld.employers ? 'Loading…' : 'Select employer…'}</option>
            {employers.map((e) => (
              <option key={e.id} value={e.id}>{e.name}{e.city ? ` (${e.city})` : ''}</option>
            ))}
          </select>
          <EmptyNote show={!ld.employers && !!industryId && employers.length === 0} msg="No employers available" />
        </Field>

        {/* 4. Job Position */}
        <Field label="Job Position">
          <select
            className={INPUT}
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            disabled={!employerId || ld.jobs}
          >
            <option value="">{ld.jobs ? 'Loading…' : 'Select position…'}</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
          <EmptyNote show={!ld.jobs && !!employerId && jobs.length === 0} msg="No open positions available" />
        </Field>

      </div>

      {/* Job details */}
      {job && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
          <p className="mb-3 text-sm font-semibold text-emerald-900">Position Details: {job.title}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <DetailItem label="Employment Type" value={job.employment_type} />
            <DetailItem label="Location" value={job.location} />
            <DetailItem label="Salary" value={fmtSalary(job)} />
            <DetailItem label="Positions Available" value={job.positions_available} />
            <DetailItem label="Start Period" value={job.start_period} />
            <DetailItem
              label="Min. Experience"
              value={job.min_experience_years != null ? `${job.min_experience_years} yr` : null}
            />
            <DetailItem
              label="Age Range"
              value={
                job.age_min != null || job.age_max != null
                  ? `${job.age_min ?? '?'} – ${job.age_max ?? '?'}`
                  : null
              }
            />
            <DetailItem
              label="Language Requirement"
              value={
                [qualMap[job.req_language_qual_id], job.req_language_level].filter(Boolean).join(' ') || null
              }
            />
            <DetailItem
              label="Skills Test / Detail"
              value={
                [qualMap[job.req_skills_qual_id], job.req_skills_detail].filter(Boolean).join(' ') || null
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DestinationExplorer() {
  const [track,    setTrack]    = useState('education');
  const [countries, setCountries] = useState([]);
  const [loadingC,  setLoadingC]  = useState(true);

  useEffect(() => {
    api.get('/countries').then(setCountries).finally(() => setLoadingC(false));
  }, []);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Destination Explorer</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Browse destinations step by step — read-only, nothing is saved.
        </p>
      </div>

      {/* Track toggle */}
      <div className="mb-6 inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => setTrack('education')}
          className={[
            'rounded-md px-5 py-2 text-sm font-medium transition-colors',
            track === 'education'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900',
          ].join(' ')}
        >
          Education
        </button>
        <button
          onClick={() => setTrack('employment')}
          className={[
            'rounded-md px-5 py-2 text-sm font-medium transition-colors',
            track === 'employment'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900',
          ].join(' ')}
        >
          Employment
        </button>
      </div>

      {/* Chain */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {loadingC ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            Loading…
          </div>
        ) : track === 'education' ? (
          <EducationChain key="education" countries={countries} />
        ) : (
          <EmploymentChain key="employment" countries={countries} />
        )}
      </div>
    </>
  );
}
