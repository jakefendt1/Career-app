import { useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../ui/button'
import { Card, CardBody, CardHeader } from '../ui/card'
import { useToast } from '../ui/toast'
import { Download, Upload, Trash2, AlertTriangle } from 'lucide-react'

export function DataManagement() {
  const { exportData, importData, clearAllData, preferences, updatePreferences } = useAppStore()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [clearConfirmStep, setClearConfirmStep] = useState(0)

  function handleExport() {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `career-toolkit-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Data exported successfully')
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const json = ev.target?.result as string
        importData(json)
        toast('Data imported successfully')
      } catch {
        toast('Import failed — invalid file', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleClear() {
    if (clearConfirmStep === 0) {
      setClearConfirmStep(1)
      return
    }
    if (clearConfirmStep === 1) {
      setClearConfirmStep(2)
      return
    }
    clearAllData()
    setClearConfirmStep(0)
    toast('All data cleared', 'info')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">Preferences</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.honestyNudgesEnabled}
                onChange={e => updatePreferences({ honestyNudgesEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-700">Honesty nudges</p>
                <p className="text-xs text-slate-500">Surface warnings when scoring patterns suggest rationalization</p>
              </div>
            </label>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 w-24">Currency</label>
              <select
                value={preferences.currency}
                onChange={e => updatePreferences({ currency: e.target.value })}
                className="h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (CA$)</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">Export / Import</h3>
          <p className="text-sm text-slate-500 mt-1">All data stays in your browser. Export to back it up.</p>
        </CardHeader>
        <CardBody>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExport}>
              <Download size={14} /> Export JSON
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Import JSON
            </Button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800 text-red-700">Danger Zone</h3>
        </CardHeader>
        <CardBody>
          {clearConfirmStep === 0 && (
            <Button variant="destructive" onClick={handleClear}>
              <Trash2 size={14} /> Clear All Data
            </Button>
          )}
          {clearConfirmStep === 1 && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <AlertTriangle size={16} className="text-orange-600" />
              <p className="text-sm text-orange-800">This will permanently delete all roles, drafts, and profile data. Are you sure?</p>
              <Button variant="destructive" size="sm" onClick={handleClear}>Confirm</Button>
              <Button variant="ghost" size="sm" onClick={() => setClearConfirmStep(0)}>Cancel</Button>
            </div>
          )}
          {clearConfirmStep === 2 && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertTriangle size={16} className="text-red-600" />
              <p className="text-sm text-red-800 font-medium">Last chance — this cannot be undone.</p>
              <Button variant="destructive" size="sm" onClick={handleClear}>Delete Everything</Button>
              <Button variant="ghost" size="sm" onClick={() => setClearConfirmStep(0)}>Cancel</Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
