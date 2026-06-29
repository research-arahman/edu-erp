import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TASK_MANAGER_ROLES = ['owner', 'manager', 'team_leader'];

const FINANCE_ROLES = ['owner', 'manager', 'accountant'];

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
    group: 'Partners',
    items: [
      { to: '/referral-partners', label: 'Referral Partners' },
      { to: '/service-fees',      label: 'Service Fees' },
    ],
  },
  {
    group: 'Language Courses',
    items: [
      { to: '/courses',         label: 'Courses' },
      { to: '/course-students', label: 'Course Students' },
      { to: '/batches',         label: 'Batches' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/inquiries', label: 'Inquiries' },
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
  const { user, logout } = useAuth();

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : '';

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

          {/* Tasks group — everyone sees My Tasks; managers see Assign/Manage too */}
          <div>
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tasks
            </p>
            <ul className="space-y-0.5">
              <li>
                <NavLink to="/my-tasks" className={linkClass}>
                  My Tasks
                </NavLink>
              </li>
              {TASK_MANAGER_ROLES.includes(user?.role) && (
                <li>
                  <NavLink to="/manage-tasks" className={linkClass}>
                    Assign / Manage Tasks
                  </NavLink>
                </li>
              )}
            </ul>
          </div>

          {/* Finance group — owner / manager / accountant only */}
          {FINANCE_ROLES.includes(user?.role) && (
            <div>
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Finance
              </p>
              <ul className="space-y-0.5">
                <li>
                  <NavLink to="/accounting" className={linkClass}>
                    Accounting
                  </NavLink>
                </li>
              </ul>
            </div>
          )}

          {/* Admin group — owner only */}
          {user?.role === 'owner' && (
            <div>
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Admin
              </p>
              <ul className="space-y-0.5">
                <li>
                  <NavLink to="/staff" className={linkClass}>
                    Staff
                  </NavLink>
                </li>
              </ul>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-800 px-4 py-4">
          <div className="mb-2">
            <p className="truncate text-sm font-medium text-white">
              {user?.full_name ?? user?.email ?? '—'}
            </p>
            <p className="text-xs text-slate-400">{roleLabel}</p>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Right column ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
          <span className="text-sm font-semibold tracking-tight text-gray-900">
            Education ERP / CRM
          </span>
          {user && (
            <span className="text-xs text-gray-500">
              {user.full_name ?? user.email}
              {roleLabel ? ` · ${roleLabel}` : ''}
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
