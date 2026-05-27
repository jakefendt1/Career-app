import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { LoginScreen } from './LoginScreen'
import { MigrationBanner } from './MigrationBanner'
import { loadUserData } from '../../lib/cloudSync'
import { useAppStore } from '../../store/useAppStore'
import { getItem, KEYS } from '../../lib/storage'

type GateState = 'loading' | 'ready'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { loadFromCloud, setCurrentUser } = useAppStore()
  const [gateState, setGateState] = useState<GateState>('loading')
  const [showMigration, setShowMigration] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      setGateState('ready')
      return
    }

    const userId = user.id

    async function init() {
      const cloudData = await loadUserData(userId)
      setCurrentUser(userId)

      if (cloudData) {
        loadFromCloud(cloudData)
      } else {
        const roles = getItem<unknown[]>(KEYS.roles)
        const hasLocalData = Array.isArray(roles) && roles.length > 0
        const alreadyMigrated = localStorage.getItem('career_migrated') === 'true'
        if (hasLocalData && !alreadyMigrated) {
          setShowMigration(true)
        }
      }

      setGateState('ready')
    }

    init()
  }, [user, loading, loadFromCloud, setCurrentUser])

  if (loading || gateState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading…</span>
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <>
      {showMigration && (
        <MigrationBanner userId={user.id} onDone={() => setShowMigration(false)} />
      )}
      {children}
    </>
  )
}
