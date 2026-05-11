import { useState } from 'react'
import type { ResumeJob } from '../../lib/types'
import { Dialog, DialogContent } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

type Props = {
  job?: ResumeJob
  open: boolean
  onClose: () => void
  onSave: (data: Omit<ResumeJob, 'id' | 'order'>) => void
}

export function JobEditDialog({ job, open, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    title: job?.title ?? '',
    company: job?.company ?? '',
    location: job?.location ?? '',
    startDate: job?.startDate ?? '',
    endDate: job?.endDate ?? '',
  })

  function handleSave() {
    if (!form.title || !form.company) return
    onSave(form)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent title={job ? 'Edit Job' : 'Add Job'}>
        <div className="space-y-4 mt-2">
          <Input
            label="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Account Manager"
          />
          <Input
            label="Company"
            value={form.company}
            onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
            placeholder="Intralox"
          />
          <Input
            label="Location"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="New Orleans, LA (Remote)"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              placeholder="2024"
            />
            <Input
              label="End Date"
              value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              placeholder="Present"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={!form.title || !form.company}>
              {job ? 'Save Changes' : 'Add Job'}
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
