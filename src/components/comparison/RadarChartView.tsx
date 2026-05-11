import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, Legend, ResponsiveContainer,
} from 'recharts'
import type { ComparisonResult, Role } from '../../lib/types'

type Props = {
  result: ComparisonResult
  target: Role
  current: Role
}

export function RadarChartView({ result, target, current }: Props) {
  const data = [
    { axis: 'Comp', target: result.target.compScore, current: result.current.compScore },
    { axis: 'Career', target: result.target.careerScore, current: result.current.careerScore },
    { axis: 'Lifestyle', target: result.target.lifestyleScore, current: result.current.lifestyleScore },
    { axis: 'Risk', target: result.target.riskScore, current: result.current.riskScore },
    { axis: 'Personal', target: result.target.personalScore, current: result.current.personalScore },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Section Scores</h3>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: '#64748b' }} />
          <Radar
            name={target.basics.company}
            dataKey="target"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.2}
          />
          <Radar
            name={current.basics.company}
            dataKey="current"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity={0.2}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
