import { useAppStore } from './store/useAppStore'
import { AppShell } from './components/layout/AppShell'
import { ToastProvider } from './components/ui/toast'
import { AuthProvider } from './lib/auth'
import { AuthGate } from './components/auth/AuthGate'

import { RolesList } from './components/roles/RolesList'
import { RoleEditor } from './components/roles/RoleEditor'
import { RoleHub } from './components/roles/RoleHub'
import { ComparisonDashboard } from './components/comparison/ComparisonDashboard'

import { DraftsList } from './components/resume/DraftsList'
import { DraftEditor } from './components/resume/DraftEditor'
import { WorkHistoryManager } from './components/resume/WorkHistoryManager'

import { SettingsPanel } from './components/settings/SettingsPanel'
import { OteCalculator } from './components/ote-calculator/OteCalculator'
import { CommissionCalculator } from './components/commission-calc/CommissionCalculator'

function AppContent() {
  const { view } = useAppStore()

  return (
    <AppShell>
      {view === 'roles' && <RolesList />}
      {view === 'role-editor' && <RoleEditor />}
      {view === 'role-hub' && <RoleHub />}
      {view === 'comparison' && <ComparisonDashboard />}
      {view === 'resume' && <DraftsList />}
      {view === 'resume-editor' && <DraftEditor />}
      {view === 'work-history' && <WorkHistoryManager />}
      {view === 'settings' && <SettingsPanel />}
      {view === 'ote-calculator' && <OteCalculator />}
      {view === 'commission-calc' && <CommissionCalculator />}
    </AppShell>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AuthGate>
          <AppContent />
        </AuthGate>
      </AuthProvider>
    </ToastProvider>
  )
}
