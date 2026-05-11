import { useState } from 'react'
import type { ComparisonResult, Role } from '../../lib/types'
import { formatCurrency } from '../../lib/formatting'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/cn'
import { ChevronDown, ChevronRight } from 'lucide-react'

type Props = {
  result: ComparisonResult
  target: Role
  current: Role
}

type SectionRow = {
  label: string
  targetScore: number
  currentScore: number
}

function deltaColor(d: number): string {
  if (d > 5) return 'text-green-600'
  if (d < -5) return 'text-red-600'
  return 'text-slate-500'
}

function SectionAccordion({ label, targetScore, currentScore, children }: SectionRow & { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const delta = targetScore - currentScore

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center px-4 py-3 bg-white hover:bg-slate-50 text-left gap-3"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
        <span className="font-medium text-sm text-slate-700 flex-1">{label}</span>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-blue-600 font-semibold">{targetScore.toFixed(0)}</span>
          <span className="text-slate-400">{currentScore.toFixed(0)}</span>
          <span className={cn('font-semibold w-10 text-right', deltaColor(delta))}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(0)}
          </span>
        </div>
      </button>
      {open && children && (
        <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  )
}

export function SectionBreakdown({ result, target, current }: Props) {
  const { preferences } = useAppStore()

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <span className="flex-1">Section</span>
        <span className="text-blue-600">{target.basics.company}</span>
        <span className="text-slate-400">{current.basics.company}</span>
        <span className="w-10 text-right">Δ</span>
      </div>

      <div className="space-y-1">
        <SectionAccordion
          label="Compensation"
          targetScore={result.target.compScore}
          currentScore={result.current.compScore}
        >
          <div className="text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Real OTE</span>
              <span>{formatCurrency(result.target.realOTE, preferences.currency)} vs. {formatCurrency(result.current.realOTE, preferences.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Risk-Adj OTE</span>
              <span>{formatCurrency(result.target.riskAdjustedOTE, preferences.currency)} vs. {formatCurrency(result.current.riskAdjustedOTE, preferences.currency)}</span>
            </div>
          </div>
        </SectionAccordion>

        <SectionAccordion label="Career & Growth" targetScore={result.target.careerScore} currentScore={result.current.careerScore}>
          <div className="text-xs space-y-1 text-slate-600">
            {(['titleTrajectory', 'scopeSize', 'skillDevelopment', 'companyPrestige', 'networkValue', 'exitOptionality'] as const).map(k => (
              <div key={k} className="flex justify-between">
                <span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                <span>{target.career[k]} vs. {current.career[k]}</span>
              </div>
            ))}
          </div>
        </SectionAccordion>

        <SectionAccordion label="Lifestyle" targetScore={result.target.lifestyleScore} currentScore={result.current.lifestyleScore}>
          <div className="text-xs space-y-1 text-slate-600">
            <div className="flex justify-between"><span>Flexibility</span><span>{target.lifestyle.flexibilityScore} vs. {current.lifestyle.flexibilityScore}</span></div>
            <div className="flex justify-between"><span>Manager Quality</span><span>{target.lifestyle.managerQuality} vs. {current.lifestyle.managerQuality}</span></div>
            <div className="flex justify-between"><span>Team Culture</span><span>{target.lifestyle.teamCulture} vs. {current.lifestyle.teamCulture}</span></div>
            <div className="flex justify-between"><span>Travel Days/Month</span><span>{target.lifestyle.travelDaysPerMonth} vs. {current.lifestyle.travelDaysPerMonth}</span></div>
            <div className="flex justify-between"><span>Hours/Week</span><span>{target.lifestyle.hoursPerWeek} vs. {current.lifestyle.hoursPerWeek}</span></div>
          </div>
        </SectionAccordion>

        <SectionAccordion label="Risk" targetScore={result.target.riskScore} currentScore={result.current.riskScore}>
          <div className="text-xs space-y-1 text-slate-600">
            {(['companyHealth', 'industryTrajectory', 'roleStability', 'compCeiling', 'cultureFitRisk'] as const).map(k => (
              <div key={k} className="flex justify-between">
                <span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                <span>{target.risk[k]} vs. {current.risk[k]}</span>
              </div>
            ))}
          </div>
        </SectionAccordion>

        <SectionAccordion label="Personal" targetScore={result.target.personalScore} currentScore={result.current.personalScore}>
          <div className="text-xs space-y-1 text-slate-600">
            <div className="flex justify-between"><span>Excitement</span><span>{target.personal.excitement} vs. {current.personal.excitement}</span></div>
          </div>
        </SectionAccordion>
      </div>
    </div>
  )
}
