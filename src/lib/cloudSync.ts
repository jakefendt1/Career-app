import { supabase } from './supabase'
import type { AppState } from './types'

export async function loadUserData(userId: string): Promise<AppState | null> {
  const { data, error } = await supabase
    .from('user_data')
    .select('roles, profile, resume_jobs, resume_drafts, preferences')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null

  return {
    roles: (data.roles as AppState['roles']) ?? [],
    profile: (data.profile as AppState['profile']) ?? {},
    resumeJobs: (data.resume_jobs as AppState['resumeJobs']) ?? [],
    resumeDrafts: (data.resume_drafts as AppState['resumeDrafts']) ?? [],
    preferences: (data.preferences as AppState['preferences']) ?? {},
    activeComparison: null,
  } as AppState
}

export async function saveUserData(userId: string, state: AppState): Promise<void> {
  await supabase.from('user_data').upsert(
    {
      user_id: userId,
      roles: state.roles,
      profile: state.profile,
      resume_jobs: state.resumeJobs,
      resume_drafts: state.resumeDrafts,
      preferences: state.preferences,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
}

export async function deleteUserData(userId: string): Promise<void> {
  await supabase.from('user_data').delete().eq('user_id', userId)
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleSave(
  userId: string,
  getState: () => AppState,
  onStatus: (s: 'syncing' | 'idle' | 'error') => void
): void {
  onStatus('syncing')
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    try {
      await saveUserData(userId, getState())
      onStatus('idle')
    } catch {
      onStatus('error')
    }
  }, 500)
}
