import { useAppStore } from '../../store/useAppStore'
import type { View } from '../../lib/types'
import { cn } from '../../lib/cn'
import { Briefcase, FileText, Settings, Calculator } from 'lucide-react'

type NavTab = { label: string; view: View; icon: React.ReactNode }

const TABS: NavTab[] = [
  { label: 'Role Compare', view: 'roles', icon: <Briefcase size={16} /> },
  { label: 'Resume Builder', view: 'resume', icon: <FileText size={16} /> },
  { label: 'OTE Calc', view: 'ote-calculator', icon: <Calculator size={16} /> },
  { label: 'Settings', view: 'settings', icon: <Settings size={16} /> },
]

const ROLE_VIEWS: View[] = ['roles', 'role-editor', 'comparison']
const RESUME_VIEWS: View[] = ['resume', 'resume-editor', 'work-history']

function resolveActiveTab(view: View): View {
  if (ROLE_VIEWS.includes(view)) return 'roles'
  if (RESUME_VIEWS.includes(view)) return 'resume'
  if (view === 'ote-calculator') return 'ote-calculator'
  return 'settings'
}

export function Nav() {
  const { view, setView } = useAppStore()
  const activeTab = resolveActiveTab(view)

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-1 h-14">
          <span className="font-semibold text-slate-800 mr-4 text-sm tracking-tight">Career Toolkit</span>
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.view}
                onClick={() => setView(tab.view)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === tab.view
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <span className="text-xs text-slate-400">Data stored locally only</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
