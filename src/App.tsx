import { useAppStore } from './store/useAppStore'
import { AppShell } from './components/layout/AppShell'
import { ToastProvider } from './components/ui/toast'

import { RolesList } from './components/roles/RolesList'
import { RoleEditor } from './components/roles/RoleEditor'
import { ComparisonDashboard } from './components/comparison/ComparisonDashboard'

import { DraftsList } from './components/resume/DraftsList'
import { DraftEditor } from './components/resume/DraftEditor'
import { WorkHistoryManager } from './components/resume/WorkHistoryManager'

import { SettingsPanel } from './components/settings/SettingsPanel'
import { OteCalculator } from './components/ote-calculator/OteCalculator'

function AppContent() {
  const { view } = useAppStore()

  return (
    <AppShell>
      {view === 'roles' && <RolesList />}
      {view === 'role-editor' && <RoleEditor />}
      {view === 'comparison' && <ComparisonDashboard />}
      {view === 'resume' && <DraftsList />}
      {view === 'resume-editor' && <DraftEditor />}
      {view === 'work-history' && <WorkHistoryManager />}
      {view === 'settings' && <SettingsPanel />}
      {view === 'ote-calculator' && <OteCalculator />}
    </AppShell>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
