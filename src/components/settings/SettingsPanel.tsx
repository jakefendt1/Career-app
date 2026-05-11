import { useState } from 'react'
import { cn } from '../../lib/cn'
import { ProfileEditor } from './ProfileEditor'
import { WeightsEditor } from './WeightsEditor'
import { DataManagement } from './DataManagement'

type Tab = 'profile' | 'weights' | 'data'

export function SettingsPanel() {
  const [tab, setTab] = useState<Tab>('profile')

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-6">Settings</h1>
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {(['profile', 'weights', 'data'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {t === 'profile' ? 'Profile' : t === 'weights' ? 'Scoring Weights' : 'Data & Preferences'}
          </button>
        ))}
      </div>
      {tab === 'profile' && <ProfileEditor />}
      {tab === 'weights' && <WeightsEditor />}
      {tab === 'data' && <DataManagement />}
    </div>
  )
}
