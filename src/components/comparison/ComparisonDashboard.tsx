import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { compareRoles } from '../../lib/scoring'
import { computeAllNudges } from '../../lib/nudges'
import { VerdictCard } from './VerdictCard'
import { TradeoffMap } from './TradeoffMap'
import { RadarChartView } from './RadarChartView'
import { ScoreBarChart } from './ScoreBarChart'
import { OTEBreakdownChart } from './OTEBreakdownChart'
import { ExpandableChartCard } from './ExpandableChartCard'
import { SectionBreakdown } from './SectionBreakdown'
import { SensitivityPanel } from './SensitivityPanel'
import { WouldYouTakeItModal } from './WouldYouTakeItModal'
import { NudgeCard } from '../nudges/NudgeCard'
import { Button } from '../ui/button'
import { ArrowLeft } from 'lucide-react'

export function ComparisonDashboard() {
  const { roles, activeComparison, preferences, setView, dismissedNudges, dismissNudge } = useAppStore()

  const target = roles.find(r => activeComparison && r.id === activeComparison.targetRoleId)
  const current = roles.find(r => activeComparison && r.id === activeComparison.currentRoleId)

  const [showModal, setShowModal] = useState(() => target?.mode === 'decision')
  const [wouldTakeIt, setWouldTakeIt] = useState<'yes' | 'no' | null>(null)

  if (!target || !current) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Comparison not available. Go back to Roles and try again.</p>
        <Button className="mt-4" variant="secondary" onClick={() => setView('roles')}>← Roles</Button>
      </div>
    )
  }

  const result = compareRoles(target, current, preferences)
  const comparisonKey = `${current.id}__${target.id}`
  const allNudges = computeAllNudges(target, current, preferences)
  const dismissed = dismissedNudges[comparisonKey] ?? []
  const activeNudges = allNudges.filter(n => !dismissed.includes(n.type))

  function handleModalAnswer(answer: 'yes' | 'no') {
    setWouldTakeIt(answer)
    setShowModal(false)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setView('roles')}>
          <ArrowLeft size={14} /> Roles
        </Button>
        <h1 className="text-lg font-bold text-slate-900">
          {target.basics.company} <span className="text-slate-400 font-normal">vs.</span> {current.basics.company}
        </h1>
      </div>

      <WouldYouTakeItModal
        open={showModal}
        targetCompany={target.basics.company}
        onAnswer={handleModalAnswer}
      />

      <div className="space-y-6">
        <VerdictCard
          result={result}
          target={target}
          current={current}
          wouldTakeItSameComp={wouldTakeIt}
        />

        {activeNudges.length > 0 && (
          <div className="space-y-2">
            {activeNudges.map(nudge => (
              <NudgeCard
                key={nudge.type}
                nudge={nudge}
                onDismiss={() => dismissNudge(comparisonKey, nudge.type)}
              />
            ))}
          </div>
        )}

        <TradeoffMap result={result} target={target} current={current} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ExpandableChartCard title="Section Scores" compactHeight={260} expandedHeight={480}>
            {(h) => <RadarChartView result={result} target={target} current={current} height={h} />}
          </ExpandableChartCard>
          <ExpandableChartCard title="Weighted Section Scores" compactHeight={220} expandedHeight={420}>
            {(h) => <ScoreBarChart result={result} target={target} current={current} height={h} />}
          </ExpandableChartCard>
          <ExpandableChartCard title="OTE Breakdown" compactHeight={220} expandedHeight={420}>
            {(h) => <OTEBreakdownChart target={target} current={current} height={h} />}
          </ExpandableChartCard>
        </div>

        <SectionBreakdown result={result} target={target} current={current} />

        <SensitivityPanel target={target} current={current} preferences={preferences} />
      </div>
    </div>
  )
}
