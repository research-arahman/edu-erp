import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  {
    group: null,
    items: [
      { to: '/', label: 'Dashboard', end: true },
      { to: '/explorer', label: 'Destination Explorer' },
    ],
  },
  {
    group: 'Education',
    items: [
      { to: '/students', label: 'Students' },
      { to: '/institutes', label: 'Institutes' },
      { to: '/programs', label: 'Programs' },
      { to: '/admission-templates', label: 'Admission Templates' },
      { to: '/applications', label: 'Applications' },
    ],
  },
  {
    group: 'Employment',
    items: [
      { to: '/candidates', label: 'Candidates' },
      { to: '/employers', label: 'Employers' },
      { to: '/jobs', label: 'Jobs' },
      { to: '/job-applications', label: 'Job Applications' },
      { to: '/placement-templates', label: 'Placement Templates' },
    ],
  },
  {
    group: 'Data',
    items: [
      { to: '/countries', label: 'Countries' },
      { to: '/industries', label: 'Industries' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/inquiries', label: 'Inquiries' },
      { to: '/tasks', label: 'Tasks' },
      { to: '/accounting', label: 'Accounting' },
    ],
  },
];

function linkClass({ isActive }) {
  return [
    'block rounded-md px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-indigo-600 text-white font-medium'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
  ].join(' ');
}

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="flex w-60 flex-shrink-0 flex-col overflow-y-auto bg-slate-900">
        {/* Brand */}
        <div className="flex h-14 flex-shrink-0 items-center border-b border-slate-800 px-4">
          <span className="text-sm font-semibold tracking-wide text-white">
            Advance EduERP
          </span>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 space-y-5 px-3 py-5">
          {NAV.map((section) => (
            <div key={section.group ?? '__top'}>
              {section.group && (
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {section.group}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className={linkClass}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Right column ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
          <span className="text-sm font-semibold tracking-tight text-gray-900">
            Education ERP / CRM
          </span>
          <span className="text-xs text-gray-400">Not signed in</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
