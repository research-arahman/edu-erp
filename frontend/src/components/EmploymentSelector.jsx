import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const INPUT =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-400';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';

function Field({ label, children }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function EmptyNote({ show, msg }) {
  if (!show) return null;
  return <p className="mt-1 text-xs text-amber-600">{msg}</p>;
}

// Props:
// value:    { target_country_id (int|null), target_industry_id (int|null),
//             target_employer_id (string|null), target_job_id (string|null) }
// onChange: (updatedValue) => void
// disabled: bool (optional)
export default function EmploymentSelector({ value, onChange, disabled = false }) {
  const seed = useRef(value);
  // While true, cascade useEffects stay quiet — active only during seed initialisation
  const sc = useRef(!!value?.target_country_id);
  // Holds a job id to restore after the [employerId] cascade re-fetches jobs on seed init
  const pendingJobId = useRef(null);

  const [countries,  setCountries]  = useState([]);
  const [countryId,  setCountryId]  = useState(
    value?.target_country_id ? String(value.target_country_id) : '',
  );
  const [industryId, setIndustryId] = useState(
    value?.target_industry_id ? String(value.target_industry_id) : '',
  );
  const [employerId, setEmployerId] = useState(value?.target_employer_id ?? '');
  const [jobId,      setJobId]      = useState(value?.target_job_id ?? '');

  const [industries, setIndustries] = useState([]);
  const [employers,  setEmployers]  = useState([]);
  const [jobs,       setJobs]       = useState([]);

  const [ld, setLd] = useState({});
  function mark(k, v) { setLd((p) => ({ ...p, [k]: v })); }

  // Fetch countries list once
  useEffect(() => {
    api.get('/countries').then(setCountries).catch(() => {});
  }, []);

  // ── SEED INIT ────────────────────────────────────────────────────────────────
  // On mount: if value has pre-set target_* ids, walk the full chain forward so
  // every dropdown has its options loaded and its value pre-selected.
  useEffect(() => {
    const sv = seed.current;
    if (!sv?.target_country_id) { sc.current = false; return; }
    const cid = String(sv.target_country_id);
    const iid = sv.target_industry_id ? String(sv.target_industry_id) : null;
    const eid = sv.target_employer_id ?? null;
    const jid = sv.target_job_id ?? null;
    let cancelled = false;

    (async () => {
      // Step 1 — industries for this country
      const inds = await api
        .get(`/selector/employment/industries?country_id=${cid}`)
        .catch(() => []);
      if (cancelled) return;
      setIndustries(inds);
      if (!iid) return;
      setIndustryId(iid);

      // Step 2 — employers for this country + industry
      const emps = await api
        .get(`/selector/employment/employers?country_id=${cid}&industry_field_id=${iid}`)
        .catch(() => []);
      if (cancelled) return;
      setEmployers(emps);
      if (!eid) return;
      setEmployerId(eid);

      // Step 3 — jobs for this employer (+ industry filter)
      const params = new URLSearchParams({ employer_id: eid });
      if (iid) params.set('industry_field_id', iid);
      if (jid) pendingJobId.current = jid;

      const jobList = await api
        .get(`/selector/employment/jobs?${params}`)
        .catch(() => []);
      if (cancelled) return;
      setJobs(jobList);
      if (jid) setJobId(jid);

      // Sync parent in case it re-renders from form state
      onChange({
        target_country_id:  Number(cid),
        target_industry_id: iid ? Number(iid) : null,
        target_employer_id: eid,
        target_job_id:      jid,
      });
    })()
      .catch(() => {})
      .finally(() => { if (!cancelled) sc.current = false; });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CASCADE EFFECTS ──────────────────────────────────────────────────────────
  // Each is guarded by sc.current so it stays quiet during seed init.

  useEffect(() => {
    if (sc.current) return;
    setIndustryId(''); setEmployerId(''); setJobId('');
    setIndustries([]); setEmployers([]); setJobs([]);
    if (!countryId) return;
    mark('industries', true);
    api
      .get(`/selector/employment/industries?country_id=${countryId}`)
      .then(setIndustries)
      .catch(() => {})
      .finally(() => mark('industries', false));
  }, [countryId]);

  useEffect(() => {
    if (sc.current) return;
    setEmployerId(''); setJobId('');
    setEmployers([]); setJobs([]);
    if (!industryId || !countryId) return;
    mark('employers', true);
    api
      .get(
        `/selector/employment/employers?country_id=${countryId}` +
        `&industry_field_id=${industryId}`,
      )
      .then(setEmployers)
      .catch(() => {})
      .finally(() => mark('employers', false));
  }, [industryId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sc.current) return;
    const restore = pendingJobId.current;
    pendingJobId.current = null;
    setJobId(''); setJobs([]);
    if (!employerId) return;
    mark('jobs', true);
    const params = new URLSearchParams({ employer_id: employerId });
    if (industryId) params.set('industry_field_id', industryId);
    api
      .get(`/selector/employment/jobs?${params}`)
      .then((list) => {
        setJobs(list);
        if (restore) setJobId(restore);
      })
      .catch(() => {})
      .finally(() => mark('jobs', false));
  }, [employerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── USER CHANGE HANDLERS ─────────────────────────────────────────────────────

  function handleCountryChange(e) {
    const v = e.target.value;
    setCountryId(v);
    onChange({
      target_country_id:  v ? Number(v) : null,
      target_industry_id: null,
      target_employer_id: null,
      target_job_id:      null,
    });
  }

  function handleIndustryChange(e) {
    const v = e.target.value;
    setIndustryId(v);
    onChange({
      target_country_id:  countryId ? Number(countryId) : null,
      target_industry_id: v ? Number(v) : null,
      target_employer_id: null,
      target_job_id:      null,
    });
  }

  function handleEmployerChange(e) {
    const v = e.target.value;
    setEmployerId(v);
    onChange({
      target_country_id:  countryId  ? Number(countryId)  : null,
      target_industry_id: industryId ? Number(industryId) : null,
      target_employer_id: v || null,
      target_job_id:      null,
    });
  }

  function handleJobChange(e) {
    const v = e.target.value;
    setJobId(v);
    onChange({
      target_country_id:  countryId  ? Number(countryId)  : null,
      target_industry_id: industryId ? Number(industryId) : null,
      target_employer_id: employerId || null,
      target_job_id:      v || null,
    });
  }

  // ── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

      {/* 1. Country */}
      <Field label="Country">
        <select
          className={INPUT}
          value={countryId}
          onChange={handleCountryChange}
          disabled={disabled}
        >
          <option value="">Select country…</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      {/* 2. Industry / SSW Field */}
      <Field label="Industry / SSW Field">
        <select
          className={INPUT}
          value={industryId}
          onChange={handleIndustryChange}
          disabled={disabled || !countryId || ld.industries}
        >
          <option value="">{ld.industries ? 'Loading…' : 'Select industry…'}</option>
          {industries.map((ind) => (
            <option key={ind.id} value={ind.id}>
              {ind.name}{ind.is_ssw ? ' [SSW]' : ''}
            </option>
          ))}
        </select>
        <EmptyNote
          show={!ld.industries && !!countryId && industries.length === 0}
          msg="No industry fields available"
        />
      </Field>

      {/* 3. Employer */}
      <Field label="Employer">
        <select
          className={INPUT}
          value={employerId}
          onChange={handleEmployerChange}
          disabled={disabled || !industryId || ld.employers}
        >
          <option value="">{ld.employers ? 'Loading…' : 'Select employer…'}</option>
          {employers.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}{emp.city ? ` (${emp.city})` : ''}
            </option>
          ))}
        </select>
        <EmptyNote
          show={!ld.employers && !!industryId && employers.length === 0}
          msg="No employers available"
        />
      </Field>

      {/* 4. Job Position */}
      <Field label="Job Position">
        <select
          className={INPUT}
          value={jobId}
          onChange={handleJobChange}
          disabled={disabled || !employerId || ld.jobs}
        >
          <option value="">{ld.jobs ? 'Loading…' : 'Select job…'}</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>
        <EmptyNote
          show={!ld.jobs && !!employerId && jobs.length === 0}
          msg="No open positions available"
        />
      </Field>

    </div>
  );
}
