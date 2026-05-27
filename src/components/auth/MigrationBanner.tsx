import { useState } from 'react'
import { saveUserData } from '../../lib/cloudSync'
import { useAppStore } from '../../store/useAppStore'

type Props = {
  userId: string
  onDone: () => void
}

export function MigrationBanner({ userId, onDone }: Props) {
  const [loading, setLoading] = useState(false)
  const { roles, profile, resumeJobs, resumeDrafts, preferences } = useAppStore()

  const handleUpload = async () => {
    setLoading(true)
    await saveUserData(userId, { roles, profile, resumeJobs, resumeDrafts, preferences, activeComparison: null })
    localStorage.setItem('career_migrated', 'true')
    setLoading(false)
    onDone()
  }

  const handleFresh = () => {
    localStorage.setItem('career_migrated', 'true')
    onDone()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <h2 className="text-base font-semibold text-slate-900 mb-2">Existing data found</h2>
        <p className="text-slate-500 text-sm mb-6">
          We found career data saved in this browser. Upload it to your account so it's available on every device?
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Uploading…' : 'Upload to account'}
          </button>
          <button
            onClick={handleFresh}
            disabled={loading}
            className="flex-1 border border-slate-200 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Start fresh
          </button>
        </div>
      </div>
    </div>
  )
}
