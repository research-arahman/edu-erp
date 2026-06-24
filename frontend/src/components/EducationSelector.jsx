import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const INPUT =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-400';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';

const LEVEL_LABELS = {
  bachelors: "Bachelor's",
  masters:   "Master's",
  phd:       'PhD',
  diploma:   'Diploma',
  foundation:'Foundation/Pathway',
  jlpt:      'JLPT (Japanese)',
  english:   'English',
  topik:     'TOPIK (Korean)',
  other:     'Other',
};
const INST_TYPE_LABELS = {
  university:     'University',
  language_school:'Language School',
  diploma:        'Diploma',
};

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

// ── Props ─────────────────────────────────────────────────────────────────────
// value:    { target_country_id, target_institute_id, target_program_id, target_session_id }
// onChange: (updatedValue) => void  — updatedValue adds transient _level_category field
// disabled: bool (optional)
export default function EducationSelector({ value, onChange, disabled = false }) {
  const seed = useRef(value);
  // While true, cascade useEffects skip reset/load — used during seed initialization
  const sc = useRef(!!value?.target_country_id);
  // Holds a session id to restore after the [programId] cascade re-fetches sessions on seed init
  const pendingSessionId = useRef(null);

  const [countries,   setCountries]   = useState([]);
  const [countryId,   setCountryId]   = useState(
    value?.target_country_id ? String(value.target_country_id) : '',
  );
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
  function mark(k, v) { setLd((p) => ({ ...p, [k]: v })); }

  // Fetch countries list once
  useEffect(() => {
    api.get('/countries').then(setCountries).catch(() => {});
  }, []);

  // ── SEED INIT ────────────────────────────────────────────────────────────────
  // On mount: if value has pre-set target_* ids, load the full chain for display
  // without triggering the cascade reset effects.
  // The cleanup sets `cancelled = true` so that if this component unmounts before
  // the async chain finishes (e.g. user closes and reopens the drawer quickly),
  // stale setState / onChange calls are suppressed.
  useEffect(() => {
    const sv = seed.current;
    if (!sv?.target_country_id) { sc.current = false; return; }
    const cid = String(sv.target_country_id);
    let cancelled = false;

    Promise.all([
      api.get(`/selector/education/institute-types?country_id=${cid}`).catch(() => []),
      sv.target_institute_id
        ? api.get(`/institutes/${sv.target_institute_id}`).catch(() => null)
        : Promise.resolve(null),
      sv.target_program_id
        ? api.get(`/programs/${sv.target_program_id}`).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(async ([types, inst, prog]) => {
        if (cancelled) return;
        setInstTypes(types);
        if (!inst) return;

        const itype = inst.type;
        setInstType(itype);

        const insts = await api
          .get(
            `/selector/education/institutes?country_id=${cid}&type=${encodeURIComponent(itype)}`,
          )
          .catch(() => []);
        if (cancelled) return;
        setInstitutes(insts);
        setInstituteId(sv.target_institute_id);

        if (!prog) return;

        const lcat   = prog.level_category;
        const llabel = prog.level_label ?? '';

        const [cats, labels] = await Promise.all([
          api
            .get(`/selector/education/level-categories?institute_id=${sv.target_institute_id}`)
            .catch(() => []),
          api
            .get(
              `/selector/education/level-labels?institute_id=${sv.target_institute_id}` +
              `&level_category=${encodeURIComponent(lcat)}`,
            )
            .catch(() => []),
        ]);
        if (cancelled) return;
        setLevelCats(cats);
        setLevelLabels(labels);
        setLevelCat(lcat);
        if (llabel) setLevelLabel(llabel);

        const params = new URLSearchParams({
          institute_id:   sv.target_institute_id,
          level_category: lcat,
        });
        if (llabel) params.set('level_label', llabel);

        const progs = await api
          .get(`/selector/education/programs?${params}`)
          .catch(() => []);
        if (cancelled) return;
        setPrograms(progs);
        // Mark the session to restore; the [programId] cascade will fetch sessions
        // and pre-select this id once the list loads.
        if (sv.target_session_id) pendingSessionId.current = sv.target_session_id;
        setProgramId(sv.target_program_id);

        // Report _level_category to parent so roadmap can display immediately
        onChange({
          target_country_id:   Number(cid),
          target_institute_id: sv.target_institute_id,
          target_program_id:   sv.target_program_id,
          target_session_id:   sv.target_session_id || null,
          _level_category:     lcat,
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) sc.current = false; });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CASCADE EFFECTS ──────────────────────────────────────────────────────────
  // Each effect is guarded by sc.current so they stay quiet during seed init.

  useEffect(() => {
    if (sc.current) return;
    setInstType(''); setInstituteId(''); setLevelCat(''); setLevelLabel('');
    setProgramId(''); setSessionId('');
    setInstTypes([]); setInstitutes([]); setLevelCats([]); setLevelLabels([]);
    setPrograms([]); setSessions([]);
    if (!countryId) return;
    mark('instTypes', true);
    api
      .get(`/selector/education/institute-types?country_id=${countryId}`)
      .then(setInstTypes)
      .catch(() => {})
      .finally(() => mark('instTypes', false));
  }, [countryId]);

  useEffect(() => {
    if (sc.current) return;
    setInstituteId(''); setLevelCat(''); setLevelLabel('');
    setProgramId(''); setSessionId('');
    setInstitutes([]); setLevelCats([]); setLevelLabels([]);
    setPrograms([]); setSessions([]);
    if (!instType || !countryId) return;
    mark('institutes', true);
    api
      .get(
        `/selector/education/institutes?country_id=${countryId}` +
        `&type=${encodeURIComponent(instType)}`,
      )
      .then(setInstitutes)
      .catch(() => {})
      .finally(() => mark('institutes', false));
  }, [instType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sc.current) return;
    setLevelCat(''); setLevelLabel(''); setProgramId(''); setSessionId('');
    setLevelCats([]); setLevelLabels([]); setPrograms([]); setSessions([]);
    if (!instituteId) return;
    mark('levelCats', true);
    api
      .get(`/selector/education/level-categories?institute_id=${instituteId}`)
      .then(setLevelCats)
      .catch(() => {})
      .finally(() => mark('levelCats', false));
  }, [instituteId]);

  useEffect(() => {
    if (sc.current) return;
    setLevelLabel(''); setProgramId(''); setSessionId('');
    setLevelLabels([]); setPrograms([]); setSessions([]);
    if (!levelCat || !instituteId) return;
    mark('levelLabels', true);
    api
      .get(
        `/selector/education/level-labels?institute_id=${instituteId}` +
        `&level_category=${encodeURIComponent(levelCat)}`,
      )
      .then(setLevelLabels)
      .catch(() => {})
      .finally(() => mark('levelLabels', false));
  }, [levelCat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sc.current) return;
    setProgramId(''); setSessionId(''); setPrograms([]); setSessions([]);
    if (!levelCat || !instituteId) return;
    if (levelLabels.length > 0 && !levelLabel) return;
    const params = new URLSearchParams({ institute_id: instituteId, level_category: levelCat });
    if (levelLabel) params.set('level_label', levelLabel);
    mark('programs', true);
    api
      .get(`/selector/education/programs?${params}`)
      .then(setPrograms)
      .catch(() => {})
      .finally(() => mark('programs', false));
  }, [levelLabel, levelLabels, levelCat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sc.current) return;
    const restore = pendingSessionId.current;
    pendingSessionId.current = null;
    setSessionId(''); setSessions([]);
    if (!programId) return;
    mark('sessions', true);
    api
      .get(`/selector/education/sessions?program_id=${programId}`)
      .then((list) => {
        setSessions(list);
        if (restore) setSessionId(restore);
      })
      .catch(() => {})
      .finally(() => mark('sessions', false));
  }, [programId]);

  // ── USER CHANGE HANDLERS ─────────────────────────────────────────────────────
  // Each calls onChange so the parent form stays in sync after every selection.

  function handleCountryChange(e) {
    const v = e.target.value;
    setCountryId(v);
    onChange({
      target_country_id:   v ? Number(v) : null,
      target_institute_id: null,
      target_program_id:   null,
      target_session_id:   null,
      _level_category:     null,
    });
  }

  function handleInstTypeChange(e) {
    setInstType(e.target.value);
    onChange({
      target_country_id:   countryId ? Number(countryId) : null,
      target_institute_id: null,
      target_program_id:   null,
      target_session_id:   null,
      _level_category:     null,
    });
  }

  function handleInstituteChange(e) {
    const v = e.target.value;
    setInstituteId(v);
    onChange({
      target_country_id:   countryId ? Number(countryId) : null,
      target_institute_id: v || null,
      target_program_id:   null,
      target_session_id:   null,
      _level_category:     null,
    });
  }

  function handleLevelCatChange(e) {
    const v = e.target.value;
    setLevelCat(v);
    onChange({
      target_country_id:   countryId   ? Number(countryId) : null,
      target_institute_id: instituteId || null,
      target_program_id:   null,
      target_session_id:   null,
      _level_category:     v || null,
    });
  }

  function handleLevelLabelChange(e) {
    setLevelLabel(e.target.value);
    onChange({
      target_country_id:   countryId   ? Number(countryId) : null,
      target_institute_id: instituteId || null,
      target_program_id:   null,
      target_session_id:   null,
      _level_category:     levelCat || null,
    });
  }

  function handleProgramChange(e) {
    const v = e.target.value;
    setProgramId(v);
    onChange({
      target_country_id:   countryId   ? Number(countryId) : null,
      target_institute_id: instituteId || null,
      target_program_id:   v || null,
      target_session_id:   null,
      _level_category:     levelCat || null,
    });
  }

  function handleSessionChange(e) {
    const v = e.target.value;
    setSessionId(v);
    onChange({
      target_country_id:   countryId   ? Number(countryId) : null,
      target_institute_id: instituteId || null,
      target_program_id:   programId   || null,
      target_session_id:   v || null,
      _level_category:     levelCat || null,
    });
  }

  // ── RENDER ───────────────────────────────────────────────────────────────────

  const labelsLoaded  = !ld.levelLabels;
  const programsReady = levelCat && !(levelLabels.length > 0 && !levelLabel);

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

      {/* 2. Institute Type */}
      <Field label="Institute Type">
        <select
          className={INPUT}
          value={instType}
          onChange={handleInstTypeChange}
          disabled={disabled || !countryId || ld.instTypes}
        >
          <option value="">{ld.instTypes ? 'Loading…' : 'Select type…'}</option>
          {instTypes.map((t) => (
            <option key={t} value={t}>{INST_TYPE_LABELS[t] ?? t}</option>
          ))}
        </select>
        <EmptyNote
          show={!ld.instTypes && !!countryId && instTypes.length === 0}
          msg="No institute types available"
        />
      </Field>

      {/* 3. Institute */}
      <Field label="Institute">
        <select
          className={INPUT}
          value={instituteId}
          onChange={handleInstituteChange}
          disabled={disabled || !instType || ld.institutes}
        >
          <option value="">{ld.institutes ? 'Loading…' : 'Select institute…'}</option>
          {institutes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}{i.city ? ` (${i.city})` : ''}
            </option>
          ))}
        </select>
        <EmptyNote
          show={!ld.institutes && !!instType && institutes.length === 0}
          msg="No institutes available"
        />
      </Field>

      {/* 4. Level Category */}
      <Field label="Level Category">
        <select
          className={INPUT}
          value={levelCat}
          onChange={handleLevelCatChange}
          disabled={disabled || !instituteId || ld.levelCats}
        >
          <option value="">{ld.levelCats ? 'Loading…' : 'Select level…'}</option>
          {levelCats.map((c) => (
            <option key={c} value={c}>{LEVEL_LABELS[c] ?? c}</option>
          ))}
        </select>
        <EmptyNote
          show={!ld.levelCats && !!instituteId && levelCats.length === 0}
          msg="No levels available"
        />
      </Field>

      {/* 5. Level Label — only when labels exist or are loading */}
      {(ld.levelLabels || (labelsLoaded && levelLabels.length > 0)) && (
        <Field label="Level / Specialisation">
          <select
            className={INPUT}
            value={levelLabel}
            onChange={handleLevelLabelChange}
            disabled={disabled || ld.levelLabels}
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
          onChange={handleProgramChange}
          disabled={disabled || !programsReady || ld.programs}
        >
          <option value="">{ld.programs ? 'Loading…' : 'Select program…'}</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.course_name || p.department || 'Program'}
            </option>
          ))}
        </select>
        <EmptyNote
          show={!ld.programs && programsReady && programs.length === 0}
          msg="No programs available"
        />
      </Field>

      {/* 7. Intake Session */}
      <Field label="Intake Session">
        <select
          className={INPUT}
          value={sessionId}
          onChange={handleSessionChange}
          disabled={disabled || !programId || ld.sessions}
        >
          <option value="">{ld.sessions ? 'Loading…' : 'Select session…'}</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.session_name}</option>
          ))}
        </select>
        <EmptyNote
          show={!ld.sessions && !!programId && sessions.length === 0}
          msg="No open sessions available"
        />
      </Field>

    </div>
  );
}
