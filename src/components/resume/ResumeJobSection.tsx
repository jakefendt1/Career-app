import type { ResumeJob, ResumeDraft } from '../../lib/types'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { ExternalLink } from 'lucide-react'

type Props = {
  job: ResumeJob
  content: ResumeDraft['jobContent'][string] | undefined
  onChange: (patch: { summary?: string; bullets?: string }) => void
  onEditJob: () => void
}

export function ResumeJobSection({ job, content, onChange, onEditJob }: Props) {
  const summary = content?.summary ?? ''
  const bullets = content?.bullets ?? ''

  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-lg">
        <div>
          <p className="font-semibold text-sm text-slate-800">{job.title}</p>
          <p className="text-xs text-slate-500">{job.company} · {job.location} · {job.startDate}–{job.endDate}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onEditJob}>
          <ExternalLink size={12} /> Edit job details
        </Button>
      </div>
      <div className="p-4 space-y-3">
        <Textarea
          label="Role Summary (italic line, optional)"
          value={summary}
          onChange={e => onChange({ summary: e.target.value })}
          placeholder="Own revenue growth for a $7M+ B2B territory..."
          className="min-h-[60px]"
        />
        <Textarea
          label="Bullets (one per line, no dashes needed)"
          value={bullets}
          onChange={e => onChange({ bullets: e.target.value })}
          placeholder={`Grew territory revenue 23% YoY\nLanded 4 net-new accounts in Q3\n...`}
          className="min-h-[120px] font-mono text-xs"
        />
      </div>
    </div>
  )
}
