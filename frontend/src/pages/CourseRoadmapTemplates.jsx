import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  name: '',
  description: '',
  category: '',
  is_active: true,
};

const EMPTY_STEP_FORM = {
  step_order: '',
  title: '',
  description: '',
};

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

export default function CourseRoadmapTemplates() {
  const { user } = useAuth();
  const canDelete = ['owner', 'manager'].includes(user?.role);

  const [templates,    setTemplates]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const [panel,        setPanel]        = useState(null); // null | 'add' | 'edit'
  const [selected,     setSelected]     = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState(null);

  // Steps sub-state (edit mode only)
  const [steps,        setSteps]        = useState([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepForm,     setStepForm]     = useState(EMPTY_STEP_FORM);
  const [addingStep,   setAddingStep]   = useState(false);
  const [stepError,    setStepError]    = useState(null);

  // Inline step edit
  const [editingStepId,  setEditingStepId]  = useState(null);
  const [editStepForm,   setEditStepForm]   = useState({});
  const [editStepSaving, setEditStepSaving] = useState(false);
  const [editStepError,  setEditStepError]  = useState(null);

  function loadTemplates() {
    return api.get('/course-roadmap-templates').then(setTemplates);
  }

  useEffect(() => {
    api.get('/course-roadmap-templates')
      .then(setTemplates)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── panel helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelected(null);
    setSteps([]);
    setStepForm(EMPTY_STEP_FORM);
    setStepError(null);
    setEditingStepId(null);
    setPanel('add');
  }

  function openEdit(tmpl) {
    setForm({
      name:        tmpl.name        ?? '',
      description: tmpl.description ?? '',
      category:    tmpl.category    ?? '',
      is_active:   tmpl.is_active   ?? true,
    });
    setFormError(null);
    setSelected(tmpl);
    setStepForm(EMPTY_STEP_FORM);
    setStepError(null);
    setEditingStepId(null);
    setPanel('edit');

    setStepsLoading(true);
    api.get(`/course-roadmap-templates/${tmpl.id}/steps`)
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
    setEditingStepId(null);
  }

  // ── template form handlers ─────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Template name is required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload = { name: form.name.trim(), is_active: form.is_active };
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.category.trim())    payload.category    = form.category.trim();

      if (panel === 'add') {
        await api.post('/course-roadmap-templates', payload);
        await loadTemplates();
        closePanel();
      } else {
        await api.patch(`/course-roadmap-templates/${selected.id}`, payload);
        await loadTemplates();
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, tmpl) {
    e.stopPropagation();
    if (!window.confirm(`Delete template "${tmpl.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/course-roadmap-templates/${tmpl.id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
      if (panel === 'edit' && selected?.id === tmpl.id) closePanel();
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
    if (!stepForm.title.trim()) { setStepError('Step title is required.'); return; }
    setAddingStep(true);
    setStepError(null);
    try {
      const payload = { title: stepForm.title.trim() };
      if (stepForm.step_order !== '')    payload.step_order   = Number(stepForm.step_order);
      if (stepForm.description.trim())   payload.description  = stepForm.description.trim();
      const newStep = await api.post(`/course-roadmap-templates/${selected.id}/steps`, payload);
      setSteps((prev) =>
        [...prev, newStep].sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))
      );
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
      await api.delete(`/course-roadmap-steps/${step.id}`);
      setSteps((prev) => prev.filter((s) => s.id !== step.id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  function startEditStep(step) {
    setEditingStepId(step.id);
    setEditStepForm({
      step_order:  step.step_order  ?? '',
      title:       step.title       ?? '',
      description: step.description ?? '',
    });
    setEditStepError(null);
  }

  function cancelEditStep() {
    setEditingStepId(null);
    setEditStepForm({});
    setEditStepError(null);
  }

  async function handleSaveStep(stepId) {
    if (!editStepForm.title?.trim()) { setEditStepError('Title is required.'); return; }
    setEditStepSaving(true);
    setEditStepError(null);
    try {
      const payload = { title: editStepForm.title.trim() };
      if (editStepForm.step_order !== '') payload.step_order  = Number(editStepForm.step_order);
      if (editStepForm.description?.trim()) payload.description = editStepForm.description.trim();
      const updated = await api.patch(`/course-roadmap-steps/${stepId}`, payload);
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? updated : s))
            .sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))
      );
      cancelEditStep();
    } catch (err) {
      setEditStepError(err.message);
    } finally {
      setEditStepSaving(false);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Course Roadmap Templates</h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500">
              {templates.length} template{templates.length !== 1 ? 's' : ''}
            </p>
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

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">
          Loading templates…
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Category', 'Steps', 'Active', ''].map((col) => (
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
                    <td className="px-5 py-3 font-medium text-gray-900">{tmpl.name}</td>
                    <td className="px-5 py-3">
                      {tmpl.category ? (
                        <span className="inline-block rounded bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                          {tmpl.category}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{tmpl.step_count ?? '—'}</td>
                    <td className="px-5 py-3">
                      {tmpl.is_active ? (
                        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td
                      className="px-5 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canDelete && (
                        <button
                          onClick={(e) => handleDelete(e, tmpl)}
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
      )}

      {/* ── Slide-in panel ─────────────────────────────────────────────────── */}
      {panel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />

          <div className="fixed inset-y-0 right-0 z-50 flex w-[560px] flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {panel === 'add' ? 'Add Roadmap Template' : `Edit: ${selected?.name}`}
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

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-4 px-6 py-5">

                <Field label="Template Name" required>
                  <input
                    className={INPUT}
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. Japan Language School Admission"
                  />
                </Field>

                <Field label="Category">
                  <input
                    className={INPUT}
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="e.g. language_school, jlpt_prep, ielts_prep"
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    <option value="language_school" />
                    <option value="jlpt_prep" />
                    <option value="jft_prep" />
                    <option value="ielts_prep" />
                    <option value="topik_prep" />
                    <option value="general" />
                  </datalist>
                </Field>

                <Field label="Description">
                  <textarea
                    className={INPUT}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    disabled={saving}
                    rows={3}
                    placeholder="Optional description of this roadmap…"
                  />
                </Field>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                    disabled={saving}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Active (available for course students)
                  </label>
                </div>

                {/* Steps section — edit mode only */}
                {panel === 'edit' && (
                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Roadmap Steps
                      </h4>
                      <span className="text-xs text-gray-400">
                        {steps.length} step{steps.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {stepsLoading ? (
                      <p className="text-xs text-gray-400">Loading steps…</p>
                    ) : steps.length === 0 ? (
                      <p className="mb-3 text-xs text-gray-400">No steps yet.</p>
                    ) : (
                      <ul className="mb-3 space-y-2">
                        {steps.map((s) => (
                          <li
                            key={s.id}
                            className="rounded-md border border-gray-200 bg-white text-xs"
                          >
                            {editingStepId === s.id ? (
                              <div className="space-y-2 p-3">
                                {editStepError && (
                                  <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                                    {editStepError}
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <input
                                    className={INPUT + ' text-xs'}
                                    style={{ width: '68px', flexShrink: 0 }}
                                    type="number"
                                    value={editStepForm.step_order}
                                    onChange={(e) =>
                                      setEditStepForm((prev) => ({ ...prev, step_order: e.target.value }))
                                    }
                                    placeholder="#"
                                    min={1}
                                    disabled={editStepSaving}
                                    title="Step order"
                                  />
                                  <input
                                    className={INPUT + ' text-xs flex-1'}
                                    value={editStepForm.title}
                                    onChange={(e) =>
                                      setEditStepForm((prev) => ({ ...prev, title: e.target.value }))
                                    }
                                    placeholder="Step title"
                                    disabled={editStepSaving}
                                  />
                                </div>
                                <textarea
                                  className={INPUT + ' text-xs'}
                                  value={editStepForm.description}
                                  onChange={(e) =>
                                    setEditStepForm((prev) => ({ ...prev, description: e.target.value }))
                                  }
                                  placeholder="Description (optional)"
                                  rows={2}
                                  disabled={editStepSaving}
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={cancelEditStep}
                                    disabled={editStepSaving}
                                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600
                                               hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveStep(s.id)}
                                    disabled={editStepSaving}
                                    className="rounded bg-indigo-600 px-2 py-1 text-xs text-white
                                               hover:bg-indigo-700 disabled:opacity-50"
                                  >
                                    {editStepSaving ? 'Saving…' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2 px-3 py-2">
                                <span className="mt-0.5 flex-shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-semibold text-xs">
                                  {s.step_order ?? '—'}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-800 leading-snug">{s.title}</p>
                                  {s.description && (
                                    <p className="mt-0.5 text-gray-400 line-clamp-2">{s.description}</p>
                                  )}
                                </div>
                                <div className="flex flex-shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEditStep(s)}
                                    className="rounded px-1.5 py-0.5 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700"
                                  >
                                    Edit
                                  </button>
                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStep(s)}
                                      className="rounded px-1.5 py-0.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Add step sub-form */}
                    {stepError && (
                      <p className="mb-2 text-xs text-red-600">{stepError}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          className={INPUT + ' text-xs'}
                          style={{ width: '68px', flexShrink: 0 }}
                          type="number"
                          name="step_order"
                          value={stepForm.step_order}
                          onChange={handleStepChange}
                          placeholder="#"
                          min={1}
                          disabled={addingStep}
                          title="Step order"
                        />
                        <input
                          className={INPUT + ' text-xs flex-1'}
                          name="title"
                          value={stepForm.title}
                          onChange={handleStepChange}
                          placeholder="Step title (required)"
                          disabled={addingStep}
                        />
                      </div>
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

              {/* Footer */}
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
