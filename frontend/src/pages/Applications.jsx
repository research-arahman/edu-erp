import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

// ── constants ─────────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'inquiry',               label: 'Inquiry' },
  { key: 'profile_assessment',    label: 'Profile Assessment' },
  { key: 'shortlisting',          label: 'Shortlisting' },
  { key: 'document_collection',   label: 'Document Collection' },
  { key: 'application_submitted', label: 'Application Submitted' },
  { key: 'offer_received',        label: 'Offer Received' },
  { key: 'visa_processing',       label: 'Visa Processing' },
  { key: 'enrolled',              label: 'Enrolled' },
];

// Top-border accent per column (left-to-right pipeline progression)
const STAGE_ACCENT = [
  'border-t-slate-400',
  'border-t-blue-400',
  'border-t-violet-500',
  'border-t-amber-400',
  'border-t-orange-500',
  'border-t-sky-500',
  'border-t-teal-500',
  'border-t-emerald-600',
];

const STATUS_OPTIONS = ['active', 'on_hold', 'withdrawn', 'rejected', 'accepted'];

const STATUS_LABELS = {
  active:    'Active',
  on_hold:   'On Hold',
  withdrawn: 'Withdrawn',
  rejected:  'Rejected',
  accepted:  'Accepted',
};

const STATUS_COLORS = {
  active:    'bg-emerald-100 text-emerald-700',
  on_hold:   'bg-amber-100  text-amber-700',
  withdrawn: 'bg-gray-100   text-gray-500',
  rejected:  'bg-red-100    text-red-600',
  accepted:  'bg-indigo-100 text-indigo-700',
};

const STAGE_OPTIONS = STAGES.map((s) => ({ value: s.key, label: s.label }));

const EMPTY_FORM = {
  student_id:     '',
  program_id:     '',
  stage:          'inquiry',
  status:         'active',
  decision_notes: '',
};

// ── shared input / label styles (match other pages) ───────────────────────────

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
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function StatusChip({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium
        ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function programLabel(p) {
  const name = p.course_name || p.department || 'Unnamed Program';
  return `${name} (${p.level_category})`;
}

function buildPayload(form) {
  const p = {
    student_id: form.student_id,
    program_id: form.program_id,
    stage:      form.stage || 'inquiry',
    status:     form.status || 'active',
  };
  if (form.decision_notes.trim()) p.decision_notes = form.decision_notes.trim();
  return p;
}

// ── main component ────────────────────────────────────────────────────────────

export default function Applications() {
  const [apps,      setApps]      = useState([]);
  const [students,  setStudents]  = useState([]);
  const [programs,  setPrograms]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [dragMsg,   setDragMsg]   = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // stage key being hovered

  const [panel,     setPanel]     = useState(null); // null | 'add' | 'edit'
  const [selected,  setSelected]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState(null);

  // Drag refs (avoid state re-renders during drag)
  const dragIdRef    = useRef(null);
  const dragStageRef = useRef(null);

  // ── data loading ───────────────────────────────────────────────────────────

  function loadApps() {
    return api.get('/applications').then(setApps);
  }

  useEffect(() => {
    Promise.all([
      api.get('/applications'),
      api.get('/students'),
      api.get('/programs'),
    ])
      .then(([appData, studentData, programData]) => {
        setApps(appData);
        setStudents(studentData);
        setPrograms(programData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── drag-and-drop handlers ─────────────────────────────────────────────────

  function handleDragStart(e, app) {
    dragIdRef.current    = app.id;
    dragStageRef.current = app.stage;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, stageKey) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(stageKey);
  }

  function handleDragLeave() {
    setDropTarget(null);
  }

  async function handleDrop(e, targetStage) {
    e.preventDefault();
    setDropTarget(null);
    const id        = dragIdRef.current;
    const fromStage = dragStageRef.current;
    dragIdRef.current    = null;
    dragStageRef.current = null;
    if (!id || targetStage === fromStage) return;

    // Optimistic update
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, stage: targetStage } : a))
    );
    setDragMsg(null);

    try {
      await api.patch(`/applications/${id}`, { stage: targetStage });
    } catch (err) {
      // Revert on failure
      setApps((prev) =>
        prev.map((a) => (a.id === id ? { ...a, stage: fromStage } : a))
      );
      setDragMsg(`Could not move card: ${err.message}`);
    }
  }

  // ── panel helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setPanel('add');
  }

  function openEdit(app) {
    setForm({
      student_id:     app.student_id     ?? '',
      program_id:     app.program_id     ?? '',
      stage:          app.stage          ?? 'inquiry',
      status:         app.status         ?? 'active',
      decision_notes: app.decision_notes ?? '',
    });
    setFormError(null);
    setSelected(app);
    setPanel('edit');
  }

  function closePanel() {
    setPanel(null);
    setSelected(null);
    setFormError(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.student_id) { setFormError('Student is required.'); return; }
    if (!form.program_id) { setFormError('Program is required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload = buildPayload(form);
      if (panel === 'add') {
        await api.post('/applications', payload);
      } else {
        await api.patch(`/applications/${selected.id}`, payload);
      }
      await loadApps();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this application? This cannot be undone.')) return;
    try {
      await api.delete(`/applications/${selected.id}`);
      setApps((prev) => prev.filter((a) => a.id !== selected.id));
      closePanel();
    } catch (err) {
      setFormError(`Delete failed: ${err.message}`);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Applications</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{apps.length} total</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 focus:ring-offset-1"
        >
          + New Application
        </button>
      </div>

      {/* Load error */}
      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {/* Drag-revert error */}
      {dragMsg && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {dragMsg}
          <button
            onClick={() => setDragMsg(null)}
            className="ml-4 text-amber-500 hover:text-amber-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">
          Loading applications…
        </div>
      )}

      {/* ── Kanban board ─────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="-mx-8 overflow-x-auto">
          <div className="flex gap-3 px-8 pb-6" style={{ minWidth: 'max-content' }}>
            {STAGES.map((col, idx) => {
              const colApps     = apps.filter((a) => a.stage === col.key);
              const isDragTarget = dropTarget === col.key;

              return (
                <div
                  key={col.key}
                  className="flex w-60 flex-shrink-0 flex-col"
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  {/* Column header */}
                  <div
                    className={`rounded-t-lg border border-b-0 border-gray-200 bg-white
                                px-3 py-2.5 border-t-4 ${STAGE_ACCENT[idx]}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                        {col.label}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                        {colApps.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards area */}
                  <div
                    className={`flex-1 overflow-y-auto rounded-b-lg border border-t-0 p-2
                                transition-colors
                                ${isDragTarget
                                  ? 'border-indigo-300 bg-indigo-50'
                                  : 'border-gray-200 bg-gray-50'}`}
                    style={{ minHeight: '160px', maxHeight: 'calc(100vh - 310px)' }}
                  >
                    {colApps.length === 0 ? (
                      <div className="flex h-full min-h-[120px] items-center justify-center text-xs text-gray-400">
                        {isDragTarget ? 'Drop here' : 'Empty'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {colApps.map((app) => (
                          <div
                            key={app.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, app)}
                            onClick={() => openEdit(app)}
                            className="cursor-grab select-none rounded-lg border border-gray-200
                                       bg-white px-3 py-2.5 shadow-sm transition-all
                                       hover:border-indigo-300 hover:shadow-md
                                       active:cursor-grabbing active:opacity-70"
                          >
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {app.student_name ?? '—'}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {[app.program_name, app.program_level]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                            <div className="mt-2">
                              <StatusChip status={app.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Slide-in drawer ───────────────────────────────────────────────────── */}
      {panel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closePanel}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-[480px] flex-col bg-white shadow-2xl">

            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'New Application' : 'Edit Application'}
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

            {/* Form body */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-4 px-6 py-5">

                {/* Student */}
                <Field label="Student" required>
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

                {/* Program */}
                <Field label="Program" required>
                  <select
                    className={INPUT}
                    name="program_id"
                    value={form.program_id}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">— select program —</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{programLabel(p)}</option>
                    ))}
                  </select>
                </Field>

                {/* Stage + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Stage">
                    <select
                      className={INPUT}
                      name="stage"
                      value={form.stage}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      {STAGE_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select
                      className={INPUT}
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Decision Notes */}
                <Field label="Decision Notes">
                  <textarea
                    className={INPUT}
                    name="decision_notes"
                    value={form.decision_notes}
                    onChange={handleChange}
                    disabled={saving}
                    rows={4}
                    placeholder="Offer details, rejection reason, visa notes…"
                  />
                </Field>

              </div>

              {/* Footer */}
              <div className="flex flex-shrink-0 items-center border-t border-gray-200 px-6 py-4">
                {panel === 'edit' && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium
                               text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
                <div className="ml-auto flex gap-3">
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
                    {saving ? 'Saving…' : panel === 'add' ? 'Create' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
