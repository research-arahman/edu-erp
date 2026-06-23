import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// ── constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  country_id: '',
  level_category: '',
  name: '',
  description: '',
};

const EMPTY_STEP_FORM = {
  step_order: '',
  title: '',
  description: '',
  timeframe: '',
};

const LEVEL_CATEGORY_META = {
  bachelors:  { label: "Bachelor's",         cls: 'bg-indigo-50 text-indigo-700' },
  masters:    { label: "Master's",           cls: 'bg-violet-50 text-violet-700' },
  phd:        { label: 'PhD',               cls: 'bg-purple-50 text-purple-700' },
  diploma:    { label: 'Diploma',           cls: 'bg-amber-50 text-amber-700' },
  foundation: { label: 'Foundation/Pathway', cls: 'bg-orange-50 text-orange-700' },
  jlpt:       { label: 'JLPT (Japanese)',   cls: 'bg-rose-50 text-rose-700' },
  english:    { label: 'English',           cls: 'bg-emerald-50 text-emerald-700' },
  topik:      { label: 'TOPIK (Korean)',    cls: 'bg-sky-50 text-sky-700' },
  other:      { label: 'Other',            cls: 'bg-gray-100 text-gray-600' },
};

// ── shared styles ─────────────────────────────────────────────────────────────

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

function LevelBadge({ category }) {
  const m = LEVEL_CATEGORY_META[category] ?? { label: category, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function AdmissionTemplates() {
  const [templates,  setTemplates]  = useState([]);
  const [countries,  setCountries]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const [panel,     setPanel]     = useState(null); // null | 'add' | 'edit'
  const [selected,  setSelected]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState(null);

  // ── steps sub-state (edit mode only) ──────────────────────────────────────
  const [steps,        setSteps]        = useState([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepForm,     setStepForm]     = useState(EMPTY_STEP_FORM);
  const [addingStep,   setAddingStep]   = useState(false);
  const [stepError,    setStepError]    = useState(null);

  // ── data loading ───────────────────────────────────────────────────────────

  function loadTemplates() {
    return api.get('/admission-templates').then(setTemplates);
  }

  useEffect(() => {
    Promise.all([api.get('/admission-templates'), api.get('/countries')])
      .then(([tmps, cnts]) => { setTemplates(tmps); setCountries(cnts); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const countryMap = Object.fromEntries(countries.map((c) => [c.id, c.name]));

  // ── panel helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setSteps([]);
    setStepForm(EMPTY_STEP_FORM);
    setStepError(null);
    setPanel('add');
  }

  function openEdit(tmpl) {
    setForm({
      country_id:     tmpl.country_id?.toString() ?? '',
      level_category: tmpl.level_category ?? '',
      name:           tmpl.name ?? '',
      description:    tmpl.description ?? '',
    });
    setFormError(null);
    setSelected(tmpl);
    setStepForm(EMPTY_STEP_FORM);
    setStepError(null);
    setPanel('edit');

    setStepsLoading(true);
    api.get(`/admission-templates/${tmpl.id}/steps`)
      .then(setSteps)
      .catch(() => setSteps([]))
      .finally(() => setStepsLoading(false));
  }

  function closePanel() {
    setPanel(null);
    setSelected(null);
    setFormError(null);
    setSteps([]);
    setStepError(null);
  }

  // ── form handlers ──────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.country_id || !form.level_category) {
      setFormError('Country and level category are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        country_id: Number(form.country_id),
        level_category: form.level_category,
      };
      if (form.name.trim())        payload.name        = form.name.trim();
      if (form.description.trim()) payload.description = form.description.trim();

      if (panel === 'add') {
        await api.post('/admission-templates', payload);
      } else {
        await api.patch(`/admission-templates/${selected.id}`, payload);
      }
      await loadTemplates();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, tmpl) {
    e.stopPropagation();
    const label = tmpl.name || `${countryMap[tmpl.country_id] ?? 'Template'} ${LEVEL_CATEGORY_META[tmpl.level_category]?.label ?? tmpl.level_category}`;
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admission-templates/${tmpl.id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  // ── step handlers ──────────────────────────────────────────────────────────

  function handleStepChange(e) {
    const { name, value } = e.target;
    setStepForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAddStep(e) {
    e.preventDefault();
    if (!stepForm.title.trim()) {
      setStepError('Step title is required.');
      return;
    }
    setAddingStep(true);
    setStepError(null);
    try {
      const payload = { title: stepForm.title.trim() };
      if (stepForm.step_order !== '')      payload.step_order   = Number(stepForm.step_order);
      if (stepForm.description.trim())     payload.description  = stepForm.description.trim();
      if (stepForm.timeframe.trim())       payload.timeframe    = stepForm.timeframe.trim();

      const newStep = await api.post(`/admission-templates/${selected.id}/steps`, payload);
      setSteps((prev) => [...prev, newStep].sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0)));
      setStepForm(EMPTY_STEP_FORM);
    } catch (err) {
      setStepError(err.message);
    } finally {
      setAddingStep(false);
    }
  }

  async function handleDeleteStep(step) {
    if (!window.confirm(`Delete step "${step.title}"?`)) return;
    try {
      await api.delete(`/admission-steps/${step.id}`);
      setSteps((prev) => prev.filter((s) => s.id !== step.id));
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
          <h2 className="text-2xl font-semibold text-gray-900">Admission Templates</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">{templates.length} templates</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          + Add Template
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
          Loading templates…
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Country', 'Level', 'Name', 'Steps', ''].map((col) => (
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
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-gray-400">
                    No templates yet — add one above.
                  </td>
                </tr>
              ) : (
                templates.map((tmpl) => (
                  <tr
                    key={tmpl.id}
                    onClick={() => openEdit(tmpl)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 text-gray-600">
                      {countryMap[tmpl.country_id] ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <LevelBadge category={tmpl.level_category} />
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {tmpl.name || <span className="text-gray-400 font-normal">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {tmpl.step_count ?? tmpl.steps?.length ?? '—'}
                    </td>
                    <td
                      className="px-5 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => handleDelete(e, tmpl)}
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
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-[540px] flex-col bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add'
                  ? 'Add Admission Template'
                  : `Edit: ${selected?.name || (countryMap[selected?.country_id] ?? 'Template')}`}
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
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-4 px-6 py-5">

                <Field label="Country" required>
                  <select
                    className={INPUT}
                    name="country_id"
                    value={form.country_id}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">Select country…</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Level Category" required>
                  <select
                    className={INPUT}
                    name="level_category"
                    value={form.level_category}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">Select level…</option>
                    {Object.entries(LEVEL_CATEGORY_META).map(([value, { label }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Template Name">
                  <input
                    className={INPUT}
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. Japan Master's (Research)"
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    className={INPUT}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    disabled={saving}
                    rows={3}
                    placeholder="Optional notes about this admission process…"
                  />
                </Field>

                {/* Steps section — edit mode only */}
                {panel === 'edit' && (
                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Admission Steps
                    </h4>

                    {stepsLoading ? (
                      <p className="text-xs text-gray-400">Loading steps…</p>
                    ) : steps.length === 0 ? (
                      <p className="text-xs text-gray-400">No steps yet.</p>
                    ) : (
                      <ul className="mb-3 space-y-2">
                        {steps.map((s) => (
                          <li
                            key={s.id}
                            className="flex items-start justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-xs"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="flex-shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs">
                                  {s.step_order ?? '—'}
                                </span>
                                <span className="font-medium text-gray-800 truncate">{s.title}</span>
                              </div>
                              {s.timeframe && (
                                <p className="mt-0.5 ml-7 text-gray-500">{s.timeframe}</p>
                              )}
                              {s.description && (
                                <p className="mt-0.5 ml-7 text-gray-400 line-clamp-2">{s.description}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteStep(s)}
                              className="ml-2 flex-shrink-0 rounded px-1.5 py-0.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Add step form */}
                    {stepError && (
                      <p className="mb-2 text-xs text-red-600">{stepError}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div style={{ width: '72px', flexShrink: 0 }}>
                          <input
                            className={INPUT + ' text-xs'}
                            type="number"
                            name="step_order"
                            value={stepForm.step_order}
                            onChange={handleStepChange}
                            placeholder="#"
                            min={1}
                            disabled={addingStep}
                            title="Step order"
                          />
                        </div>
                        <input
                          className={INPUT + ' text-xs flex-1'}
                          name="title"
                          value={stepForm.title}
                          onChange={handleStepChange}
                          placeholder="Step title (required)"
                          disabled={addingStep}
                        />
                      </div>
                      <input
                        className={INPUT + ' text-xs'}
                        name="timeframe"
                        value={stepForm.timeframe}
                        onChange={handleStepChange}
                        placeholder="Timeframe (e.g. 3 months before deadline)"
                        disabled={addingStep}
                      />
                      <textarea
                        className={INPUT + ' text-xs'}
                        name="description"
                        value={stepForm.description}
                        onChange={handleStepChange}
                        placeholder="Step description (optional)"
                        rows={2}
                        disabled={addingStep}
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddStep}
                          disabled={addingStep}
                          className="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-white
                                     hover:bg-gray-800 disabled:opacity-50"
                        >
                          {addingStep ? 'Adding…' : '+ Add Step'}
                        </button>
                      </div>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                             hover:bg-indigo-700 disabled:opacity-50 focus:outline-none
                             focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                >
                  {saving ? 'Saving…' : panel === 'add' ? 'Add Template' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
