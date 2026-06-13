import { create } from 'zustand'
import type {
  AppState, Role, Profile, ResumeJob, ResumeDraft, UserPreferences, View
} from '../lib/types'
import { getItem, setItem, clearAll, KEYS } from '../lib/storage'
import { scheduleSave, deleteUserData } from '../lib/cloudSync'

const DEFAULT_PREFERENCES: UserPreferences = {
  weights: { comp: 30, career: 25, lifestyle: 20, risk: 15, personal: 10 },
  currency: 'USD',
  honestyNudgesEnabled: true,
  verdictThresholds: { strongMove: 15, softMove: 5, softStay: -5, strongStay: -15 },
}

const DEFAULT_PROFILE: Profile = {
  name: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  education: [],
  certifications: [],
}

function loadState(): AppState {
  return {
    roles: getItem<Role[]>(KEYS.roles) ?? [],
    activeComparison: null,
    profile: getItem<Profile>(KEYS.profile) ?? DEFAULT_PROFILE,
    resumeJobs: getItem<ResumeJob[]>(KEYS.resumeJobs) ?? [],
    resumeDrafts: getItem<ResumeDraft[]>(KEYS.resumeDrafts) ?? [],
    preferences: getItem<UserPreferences>(KEYS.preferences) ?? DEFAULT_PREFERENCES,
  }
}

type SyncStatus = 'idle' | 'syncing' | 'error'

type StoreState = AppState & {
  view: View
  editingRoleId: string | null
  editingDraftId: string | null
  hubRoleId: string | null
  dismissedNudges: Record<string, string[]>
  syncStatus: SyncStatus
  currentUserId: string | null

  setView: (view: View) => void
  setEditingRoleId: (id: string | null) => void
  setEditingDraftId: (id: string | null) => void
  setHubRoleId: (id: string | null) => void
  setActiveComparison: (c: AppState['activeComparison']) => void
  setSyncStatus: (s: SyncStatus) => void
  setCurrentUser: (id: string | null) => void
  loadFromCloud: (data: AppState) => void

  // Role actions
  addRole: (role: Role) => void
  updateRole: (id: string, patch: Partial<Role>) => void
  deleteRole: (id: string) => void
  markRoleCurrent: (id: string) => void
  duplicateRole: (id: string) => Role | null

  // Profile actions
  updateProfile: (patch: Partial<Profile>) => void

  // ResumeJob actions
  addResumeJob: (job: ResumeJob) => void
  updateResumeJob: (id: string, patch: Partial<ResumeJob>) => void
  deleteResumeJob: (id: string) => void
  reorderResumeJobs: (jobs: ResumeJob[]) => void

  // ResumeDraft actions
  addResumeDraft: (draft: ResumeDraft) => void
  updateResumeDraft: (id: string, patch: Partial<ResumeDraft>) => void
  deleteResumeDraft: (id: string) => void
  duplicateResumeDraft: (id: string) => ResumeDraft | null

  // Preferences actions
  updatePreferences: (patch: Partial<UserPreferences>) => void

  // Nudge dismiss
  dismissNudge: (comparisonKey: string, nudgeType: string) => void

  // Data management
  exportData: () => string
  importData: (json: string) => void
  clearAllData: () => void
}

export const useAppStore = create<StoreState>((set, get) => {
  function cloudSave() {
    const { currentUserId } = get()
    if (!currentUserId) return
    const userId = currentUserId
    scheduleSave(
      userId,
      () => {
        const s = get()
        return {
          roles: s.roles,
          profile: s.profile,
          resumeJobs: s.resumeJobs,
          resumeDrafts: s.resumeDrafts,
          preferences: s.preferences,
          activeComparison: null,
        }
      },
      (status) => set({ syncStatus: status })
    )
  }

  return {
    ...loadState(),
    view: 'roles',
    editingRoleId: null,
    editingDraftId: null,
    hubRoleId: null,
    dismissedNudges: {},
    syncStatus: 'idle',
    currentUserId: null,

    setView: (view) => set({ view }),
    setEditingRoleId: (id) => set({ editingRoleId: id }),
    setEditingDraftId: (id) => set({ editingDraftId: id }),
    setHubRoleId: (id) => set({ hubRoleId: id }),
    setActiveComparison: (c) => set({ activeComparison: c }),
    setSyncStatus: (syncStatus) => set({ syncStatus }),
    setCurrentUser: (id) => set({ currentUserId: id }),

    loadFromCloud: (data) => {
      setItem(KEYS.roles, data.roles)
      setItem(KEYS.profile, data.profile)
      setItem(KEYS.resumeJobs, data.resumeJobs)
      setItem(KEYS.resumeDrafts, data.resumeDrafts)
      setItem(KEYS.preferences, data.preferences)
      set({
        roles: data.roles,
        profile: data.profile,
        resumeJobs: data.resumeJobs,
        resumeDrafts: data.resumeDrafts,
        preferences: data.preferences,
        activeComparison: null,
      })
    },

    addRole: (role) => set(s => {
      const roles = [...s.roles, role]
      setItem(KEYS.roles, roles)
      cloudSave()
      return { roles }
    }),

    updateRole: (id, patch) => set(s => {
      const roles = s.roles.map(r => r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)
      setItem(KEYS.roles, roles)
      cloudSave()
      return { roles }
    }),

    deleteRole: (id) => set(s => {
      const roles = s.roles.filter(r => r.id !== id)
      setItem(KEYS.roles, roles)
      cloudSave()
      const activeComparison = s.activeComparison &&
        (s.activeComparison.currentRoleId === id || s.activeComparison.targetRoleId === id)
        ? null : s.activeComparison
      return { roles, activeComparison }
    }),

    markRoleCurrent: (id) => set(s => {
      const roles = s.roles.map(r => ({
        ...r,
        isCurrent: r.id === id,
        status: r.id === id ? 'current' as const : r.status === 'current' ? 'evaluating' as const : r.status,
        updatedAt: new Date().toISOString(),
      }))
      setItem(KEYS.roles, roles)
      cloudSave()
      return { roles }
    }),

    duplicateRole: (id) => {
      const source = get().roles.find(r => r.id === id)
      if (!source) return null
      const dup: Role = {
        ...source,
        id: crypto.randomUUID(),
        isCurrent: false,
        status: 'evaluating',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        basics: { ...source.basics, company: source.basics.company + ' (copy)' },
      }
      set(s => {
        const roles = [...s.roles, dup]
        setItem(KEYS.roles, roles)
        cloudSave()
        return { roles }
      })
      return dup
    },

    updateProfile: (patch) => set(s => {
      const profile = { ...s.profile, ...patch }
      setItem(KEYS.profile, profile)
      cloudSave()
      return { profile }
    }),

    addResumeJob: (job) => set(s => {
      const resumeJobs = [...s.resumeJobs, job]
      setItem(KEYS.resumeJobs, resumeJobs)
      cloudSave()
      return { resumeJobs }
    }),

    updateResumeJob: (id, patch) => set(s => {
      const resumeJobs = s.resumeJobs.map(j => j.id === id ? { ...j, ...patch } : j)
      setItem(KEYS.resumeJobs, resumeJobs)
      cloudSave()
      return { resumeJobs }
    }),

    deleteResumeJob: (id) => set(s => {
      const resumeJobs = s.resumeJobs.filter(j => j.id !== id)
      setItem(KEYS.resumeJobs, resumeJobs)
      cloudSave()
      return { resumeJobs }
    }),

    reorderResumeJobs: (jobs) => set(() => {
      setItem(KEYS.resumeJobs, jobs)
      cloudSave()
      return { resumeJobs: jobs }
    }),

    addResumeDraft: (draft) => set(s => {
      const resumeDrafts = [...s.resumeDrafts, draft]
      setItem(KEYS.resumeDrafts, resumeDrafts)
      cloudSave()
      return { resumeDrafts }
    }),

    updateResumeDraft: (id, patch) => set(s => {
      const resumeDrafts = s.resumeDrafts.map(d =>
        d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d
      )
      setItem(KEYS.resumeDrafts, resumeDrafts)
      cloudSave()
      return { resumeDrafts }
    }),

    deleteResumeDraft: (id) => set(s => {
      const resumeDrafts = s.resumeDrafts.filter(d => d.id !== id)
      setItem(KEYS.resumeDrafts, resumeDrafts)
      cloudSave()
      return { resumeDrafts }
    }),

    duplicateResumeDraft: (id) => {
      const source = get().resumeDrafts.find(d => d.id === id)
      if (!source) return null
      const dup: ResumeDraft = {
        ...source,
        id: crypto.randomUUID(),
        targetCompany: source.targetCompany + ' (copy)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        jobContent: { ...source.jobContent },
      }
      set(s => {
        const resumeDrafts = [...s.resumeDrafts, dup]
        setItem(KEYS.resumeDrafts, resumeDrafts)
        cloudSave()
        return { resumeDrafts }
      })
      return dup
    },

    updatePreferences: (patch) => set(s => {
      const preferences = { ...s.preferences, ...patch }
      setItem(KEYS.preferences, preferences)
      cloudSave()
      return { preferences }
    }),

    dismissNudge: (comparisonKey, nudgeType) => set(s => ({
      dismissedNudges: {
        ...s.dismissedNudges,
        [comparisonKey]: [...(s.dismissedNudges[comparisonKey] ?? []), nudgeType],
      }
    })),

    exportData: () => {
      const s = get()
      return JSON.stringify({
        roles: s.roles,
        profile: s.profile,
        resumeJobs: s.resumeJobs,
        resumeDrafts: s.resumeDrafts,
        preferences: s.preferences,
      }, null, 2)
    },

    importData: (json) => {
      const data = JSON.parse(json) as Partial<AppState>
      const roles = data.roles ?? []
      const profile = data.profile ?? DEFAULT_PROFILE
      const resumeJobs = data.resumeJobs ?? []
      const resumeDrafts = data.resumeDrafts ?? []
      const preferences = data.preferences ?? DEFAULT_PREFERENCES
      setItem(KEYS.roles, roles)
      setItem(KEYS.profile, profile)
      setItem(KEYS.resumeJobs, resumeJobs)
      setItem(KEYS.resumeDrafts, resumeDrafts)
      setItem(KEYS.preferences, preferences)
      set({ roles, profile, resumeJobs, resumeDrafts, preferences })
      cloudSave()
    },

    clearAllData: async () => {
      const { currentUserId } = get()
      clearAll()
      if (currentUserId) {
        await deleteUserData(currentUserId)
      }
      set({
        roles: [],
        activeComparison: null,
        profile: DEFAULT_PROFILE,
        resumeJobs: [],
        resumeDrafts: [],
        preferences: DEFAULT_PREFERENCES,
      })
    },
  }
})
