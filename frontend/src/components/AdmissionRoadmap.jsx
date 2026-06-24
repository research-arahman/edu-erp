import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

function StatusDot({ status, index, interactive }) {
  if (!interactive) {
    return (
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center
                       rounded-full border-2 border-indigo-300 bg-white
                       text-xs font-semibold text-indigo-500">
        {index + 1}
      </div>
    );
  }
  if (status === 'done') {
    return (
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center
                       rounded-full bg-emerald-500 text-white text-xs font-bold">
        ✓
      </div>
    );
  }
  if (status === 'current') {
    return (
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center
                       rounded-full bg-indigo-600 ring-2 ring-indigo-200
                       text-white text-xs font-semibold">
        {index + 1}
      </div>
    );
  }
  // pending
  return (
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center
                     rounded-full border-2 border-gray-300 bg-white
                     text-xs font-semibold text-gray-400">
      {index + 1}
    </div>
  );
}

function StatusControl({ stepId, status, studentId, onStatusChange }) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  async function handleClick(newStatus) {
    if (newStatus === status || saving) return;
    const prev = status;
    setError(null);
    setSaving(true);
    onStatusChange(stepId, newStatus); // optimistic
    try {
      await api.put(`/students/${studentId}/steps/${stepId}/progress`, { status: newStatus });
    } catch {
      onStatusChange(stepId, prev);   // revert
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  }

  const btns = [
    { value: 'pending', label: 'Pending',
      active: 'bg-gray-200 text-gray-700' },
    { value: 'current', label: 'Current',
      active: 'bg-indigo-600 text-white' },
    { value: 'done',    label: 'Done',
      active: 'bg-emerald-500 text-white' },
  ];

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex overflow-hidden rounded border border-gray-200">
        {btns.map((b) => (
          <button
            key={b.value}
            type="button"
            disabled={saving}
            onClick={() => handleClick(b.value)}
            className={`px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
              status === b.value
                ? b.active
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

// Props:
//   country_id     (int)    — required to pick the template
//   level_category (string) — required to pick the template
//   studentId      (string) — OPTIONAL; when provided, enables interactive progress tracking
//
// Without studentId this is purely read-only (e.g. DestinationExplorer).
export default function AdmissionRoadmap({ country_id, level_category, studentId }) {
  const [template,        setTemplate]        = useState(null);
  const [steps,           setSteps]           = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [empty,           setEmpty]           = useState(false);

  const [progress,        setProgress]        = useState({});  // step_id → status
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError,   setProgressError]   = useState(false);

  // Load template + steps whenever country/level changes
  useEffect(() => {
    if (!country_id || !level_category) {
      setTemplate(null);
      setSteps([]);
      setEmpty(false);
      setProgress({});
      return;
    }
    setLoading(true);
    setEmpty(false);
    setProgress({});
    setProgressError(false);

    api
      .get(
        `/admission-templates?country_id=${country_id}` +
        `&level_category=${encodeURIComponent(level_category)}`,
      )
      .then((templates) => {
        if (!templates.length) {
          setTemplate(null);
          setSteps([]);
          setEmpty(true);
          return;
        }
        const tmpl = templates[0];
        setTemplate(tmpl);
        return api
          .get(`/admission-templates/${tmpl.id}/steps`)
          .then(setSteps);
      })
      .catch(() => {
        setTemplate(null);
        setSteps([]);
        setEmpty(true);
      })
      .finally(() => setLoading(false));
  }, [country_id, level_category]);

  // Load progress when studentId is present and a template is loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!studentId || !template) {
      setProgress({});
      return;
    }
    setProgressLoading(true);
    setProgressError(false);
    api
      .get(`/students/${studentId}/progress`)
      .then((rows) => {
        const map = {};
        rows.forEach((r) => { map[r.step_id] = r.status; });
        setProgress(map);
      })
      .catch(() => {
        setProgressError(true);
        setProgress({});
      })
      .finally(() => setProgressLoading(false));
  }, [studentId, template?.id]);  // re-fetch when student or template changes

  const handleStatusChange = useCallback((stepId, newStatus) => {
    setProgress((prev) => ({ ...prev, [stepId]: newStatus }));
  }, []);

  if (!country_id || !level_category) return null;

  if (loading) {
    return (
      <div className="py-3 text-center text-sm text-gray-400">Loading roadmap…</div>
    );
  }

  if (empty || !template) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 px-4 py-3 text-center text-sm text-gray-400">
        No admission roadmap defined for this country + level.{' '}
        <span className="text-gray-500">Add one under Admission Templates.</span>
      </div>
    );
  }

  // Interactive only when studentId is given AND progress loaded without error
  const interactive = !!studentId && !progressError && !progressLoading;

  return (
    <div>
      {template.name && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          {template.name}
        </p>
      )}
      {progressLoading && (
        <p className="mb-2 text-xs text-gray-400">Loading progress…</p>
      )}
      {steps.length === 0 ? (
        <p className="text-xs text-gray-400">No steps added to this template yet.</p>
      ) : (
        <ol className="space-y-0">
          {steps.map((step, idx) => {
            const status = progress[step.id] ?? 'pending';
            return (
              <li key={step.id} className="flex gap-3">
                {/* Left column: status dot + connector line */}
                <div className="flex flex-col items-center">
                  <StatusDot status={status} index={idx} interactive={interactive} />
                  {idx < steps.length - 1 && (
                    <div
                      className={`mt-0.5 w-px flex-1 min-h-[12px] ${
                        interactive && status === 'done'
                          ? 'bg-emerald-300'
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
                {/* Step content */}
                <div className="pb-4">
                  <p className="text-sm font-medium text-gray-900 leading-tight mt-0.5">
                    {step.title}
                  </p>
                  {step.timeframe && (
                    <p className="mt-0.5 text-xs font-medium text-indigo-600">
                      {step.timeframe}
                    </p>
                  )}
                  {step.description && (
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                      {step.description}
                    </p>
                  )}
                  {interactive && (
                    <StatusControl
                      stepId={step.id}
                      status={status}
                      studentId={studentId}
                      onStatusChange={handleStatusChange}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
