import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { ComparisonResult, Role } from '../../lib/types'

type Props = {
  result: ComparisonResult
  target: Role
  current: Role
}

export function ScoreBarChart({ result, target, current }: Props) {
  const data = [
    { name: 'Comp', target: +result.target.compScore.toFixed(1), current: +result.current.compScore.toFixed(1) },
    { name: 'Career', target: +result.target.careerScore.toFixed(1), current: +result.current.careerScore.toFixed(1) },
    { name: 'Lifestyle', target: +result.target.lifestyleScore.toFixed(1), current: +result.current.lifestyleScore.toFixed(1) },
    { name: 'Risk', target: +result.target.riskScore.toFixed(1), current: +result.current.riskScore.toFixed(1) },
    { name: 'Personal', target: +result.target.personalScore.toFixed(1), current: +result.current.personalScore.toFixed(1) },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Weighted Section Scores</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="target" name={target.basics.company} fill="#2563eb" radius={[3, 3, 0, 0]} />
          <Bar dataKey="current" name={current.basics.company} fill="#94a3b8" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
