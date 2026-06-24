import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// Props: country_id (int), level_category (string)
// Read-only roadmap. Left-side numbered dot is a placeholder for per-step status (future).
export default function AdmissionRoadmap({ country_id, level_category }) {
  const [template, setTemplate] = useState(null);
  const [steps,    setSteps]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [empty,    setEmpty]    = useState(false);

  useEffect(() => {
    if (!country_id || !level_category) {
      setTemplate(null);
      setSteps([]);
      setEmpty(false);
      return;
    }
    setLoading(true);
    setEmpty(false);
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

  return (
    <div>
      {template.name && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          {template.name}
        </p>
      )}
      {steps.length === 0 ? (
        <p className="text-xs text-gray-400">No steps added to this template yet.</p>
      ) : (
        <ol className="space-y-0">
          {steps.map((step, idx) => (
            <li key={step.id} className="flex gap-3">
              {/* Left column: numbered dot + connector line (status placeholder) */}
              <div className="flex flex-col items-center">
                <div
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center
                             rounded-full border-2 border-indigo-300 bg-white
                             text-xs font-semibold text-indigo-500"
                >
                  {idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className="mt-0.5 w-px flex-1 bg-gray-200 min-h-[12px]" />
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
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
