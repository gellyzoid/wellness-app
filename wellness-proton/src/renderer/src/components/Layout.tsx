import { NavLink, Outlet } from 'react-router'
import {
  LayoutDashboard,
  Droplet,
  UtensilsCrossed,
  Pill,
  Dumbbell,
  Moon,
  BarChart3,
  Trophy,
  Sparkles,
  Settings as SettingsIcon
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/water', label: 'Water', icon: Droplet },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed },
  { to: '/medications', label: 'Medications', icon: Pill },
  { to: '/exercise', label: 'Exercise', icon: Dumbbell },
  { to: '/sleep', label: 'Sleep', icon: Moon },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/achievements', label: 'Achievements', icon: Trophy },
  { to: '/assistant', label: 'Assistant', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: SettingsIcon }
]

export default function Layout(): React.JSX.Element {
  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <h1 className="text-lg font-semibold">Wellness Proton</h1>
          <p className="text-xs text-slate-400 mt-0.5">Desktop wellness</p>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-3 border-t border-slate-800 text-[10px] text-slate-500">
          Developed by Angel Victorio
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  )
}
