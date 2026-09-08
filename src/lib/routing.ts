// Hash-based routing — maps the store's navigation state to/from a URL hash
// so refresh, browser back/forward, and sharing a link all work. No router
// dependency: the app has ~10 flat views, a lookup table is enough.

import { useEffect } from 'react'
import type { View } from './types'
import { useAppStore } from '../store/useAppStore'

export type RouteState = {
  view: View
  editingRoleId?: string | null
  hubRoleId?: string | null
  editingDraftId?: string | null
  activeComparison?: { currentRoleId: string; targetRoleId: string } | null
}

export function stateToHash(s: RouteState): string {
  switch (s.view) {
    case 'role-editor':
      return s.editingRoleId ? `#/role-editor/${s.editingRoleId}` : '#/roles'
    case 'role-hub':
      return s.hubRoleId ? `#/role-hub/${s.hubRoleId}` : '#/roles'
    case 'comparison':
      return s.activeComparison
        ? `#/compare/${s.activeComparison.currentRoleId}/${s.activeComparison.targetRoleId}`
        : '#/roles'
    case 'resume-editor':
      return s.editingDraftId ? `#/resume-editor/${s.editingDraftId}` : '#/resume'
    case 'resume': return '#/resume'
    case 'work-history': return '#/work-history'
    case 'settings': return '#/settings'
    case 'ote-calculator': return '#/ote-calculator'
    case 'commission-calc': return '#/commission-calc'
    case 'roles':
    default:
      return '#/roles'
  }
}

export function hashToState(hash: string): RouteState | null {
  const path = hash.replace(/^#\/?/, '')
  const [seg, a, b] = path.split('/')

  switch (seg) {
    case '':
    case 'roles':
      return { view: 'roles' }
    case 'role-editor':
      return a ? { view: 'role-editor', editingRoleId: a } : { view: 'roles' }
    case 'role-hub':
      return a ? { view: 'role-hub', hubRoleId: a } : { view: 'roles' }
    case 'compare':
      return a && b ? { view: 'comparison', activeComparison: { currentRoleId: a, targetRoleId: b } } : { view: 'roles' }
    case 'resume-editor':
      return a ? { view: 'resume-editor', editingDraftId: a } : { view: 'resume' }
    case 'resume':
      return { view: 'resume' }
    case 'work-history':
      return { view: 'work-history' }
    case 'settings':
      return { view: 'settings' }
    case 'ote-calculator':
      return { view: 'ote-calculator' }
    case 'commission-calc':
      return { view: 'commission-calc' }
    default:
      return null
  }
}

/** Two-way sync between the URL hash and the store's navigation state.
 *  Mount once near the app root. */
export function useHashRouting() {
  const view = useAppStore(s => s.view)
  const editingRoleId = useAppStore(s => s.editingRoleId)
  const hubRoleId = useAppStore(s => s.hubRoleId)
  const editingDraftId = useAppStore(s => s.editingDraftId)
  const activeComparison = useAppStore(s => s.activeComparison)
  const setView = useAppStore(s => s.setView)
  const setEditingRoleId = useAppStore(s => s.setEditingRoleId)
  const setHubRoleId = useAppStore(s => s.setHubRoleId)
  const setEditingDraftId = useAppStore(s => s.setEditingDraftId)
  const setActiveComparison = useAppStore(s => s.setActiveComparison)

  // URL → store: on first load, and on browser back/forward.
  useEffect(() => {
    function applyHash() {
      const parsed = hashToState(window.location.hash)
      if (!parsed) return
      setView(parsed.view)
      setEditingRoleId(parsed.editingRoleId ?? null)
      setHubRoleId(parsed.hubRoleId ?? null)
      setEditingDraftId(parsed.editingDraftId ?? null)
      setActiveComparison(parsed.activeComparison ?? null)
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Store → URL: reflect in-app navigation into the address bar.
  // Guarded by an equality check, so this never fights the effect above —
  // a hashchange-driven store update recomputes the same hash and no-ops here.
  useEffect(() => {
    const next = stateToHash({ view, editingRoleId, hubRoleId, editingDraftId, activeComparison })
    if (window.location.hash !== next) window.location.hash = next
  }, [view, editingRoleId, hubRoleId, editingDraftId, activeComparison])
}
