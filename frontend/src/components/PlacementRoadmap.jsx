import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function StatusDot({ index }) {
  return (
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center
                     rounded-full border-2 border-amber-300 bg-white
                     text-xs font-semibold text-amber-500">
      {index + 1}
    </div>
  );
}

// Props:
//   country_id        (int) — from candidate target_country_id
//   industry_field_id (int) — from candidate target_industry_id
//
// Read-only. No interactive progress controls yet — status dot is a placeholder
// so per-candidate tracking can be layered on without restructuring.
export default function PlacementRoadmap({ country_id, industry_field_id }) {
  const [template, setTemplate] = useState(null);
  const [steps,    setSteps]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [empty,    setEmpty]    = useState(false);

  useEffect(() => {
    if (!country_id || !industry_field_id) {
      setTemplate(null);
      setSteps([]);
      setEmpty(false);
      return;
    }
    setLoading(true);
    setEmpty(false);
    setTemplate(null);
    setSteps([]);

    api
      .get(
        `/placement-templates?country_id=${country_id}` +
        `&industry_field_id=${industry_field_id}`,
      )
      .then((templates) => {
        if (!templates.length) {
          setEmpty(true);
          return;
        }
        const tmpl = templates[0];
        setTemplate(tmpl);
        return api
          .get(`/placement-templates/${tmpl.id}/steps`)
          .then(setSteps);
      })
      .catch(() => {
        setTemplate(null);
        setSteps([]);
        setEmpty(true);
      })
      .finally(() => setLoading(false));
  }, [country_id, industry_field_id]);

  if (!country_id || !industry_field_id) {
    return (
      <p className="text-xs text-gray-400 italic">
        Select a target country and industry to see the placement roadmap.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="py-3 text-center text-sm text-gray-400">Loading roadmap…</div>
    );
  }

  if (empty || !template) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 px-4 py-3 text-center text-sm text-gray-400">
        No placement roadmap defined yet for this country + industry.{' '}
        <span className="text-gray-500">Add one under Placement Templates.</span>
      </div>
    );
  }

  return (
    <div>
      {template.name && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">
          {template.name}
        </p>
      )}
      {steps.length === 0 ? (
        <p className="text-xs text-gray-400">No steps added to this template yet.</p>
      ) : (
        <ol className="space-y-0">
          {steps.map((step, idx) => (
            <li key={step.id} className="flex gap-3">
              {/* Left column: status dot + connector line */}
              <div className="flex flex-col items-center">
                <StatusDot index={idx} />
                {idx < steps.length - 1 && (
                  <div className="mt-0.5 w-px flex-1 min-h-[12px] bg-gray-200" />
                )}
              </div>
              {/* Step content */}
              <div className="pb-4">
                <p className="text-sm font-medium text-gray-900 leading-tight mt-0.5">
                  {step.title}
                </p>
                {step.timeframe && (
                  <p className="mt-0.5 text-xs font-medium text-amber-600">
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
