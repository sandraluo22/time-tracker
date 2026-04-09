import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getCategoryColor } from '../db'
import { formatDuration } from '../hooks'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

type Range = 'today' | 'week' | 'month' | 'year'

export default function Dashboard() {
  const [range, setRange] = useState<Range>('week')

  const { from, to } = useMemo(() => {
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    if (range === 'today') return { from: today, to: now }
    if (range === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 6)
      return { from: weekAgo, to: now }
    }
    if (range === 'month') {
      const monthAgo = new Date(today)
      monthAgo.setDate(monthAgo.getDate() - 29)
      return { from: monthAgo, to: now }
    }
    // year
    const yearAgo = new Date(today)
    yearAgo.setFullYear(yearAgo.getFullYear() - 1)
    return { from: yearAgo, to: now }
  }, [range])

  const activities = useLiveQuery(
    () =>
      db.activities
        .where('startTime')
        .between(from.getTime(), to.getTime(), true, true)
        .toArray(),
    [from.getTime(), to.getTime()]
  )

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    if (!activities) return []
    const map = new Map<string, number>()
    for (const a of activities) {
      if (!a.endTime) continue
      const dur = a.endTime - a.startTime
      map.set(a.category, (map.get(a.category) ?? 0) + dur)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, color: getCategoryColor(name) }))
      .sort((a, b) => b.value - a.value)
  }, [activities])

  // Time-period breakdown for bar chart
  const barData = useMemo(() => {
    if (!activities) return []
    const map = new Map<string, Map<string, number>>()

    const getKey = (d: Date): string => {
      if (range === 'year') {
        // Group by week — show "Mon DD" of the week start
        const day = new Date(d)
        const dayOfWeek = day.getDay()
        day.setDate(day.getDate() - dayOfWeek)
        return day.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }
      return d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' })
    }

    for (const a of activities) {
      if (!a.endTime) continue
      const key = getKey(new Date(a.startTime))
      if (!map.has(key)) map.set(key, new Map())
      const bucket = map.get(key)!
      bucket.set(a.category, (bucket.get(a.category) ?? 0) + (a.endTime - a.startTime))
    }

    return Array.from(map.entries()).map(([period, catMap]) => {
      const row: Record<string, string | number> = { period }
      for (const [cat, ms] of catMap) {
        row[cat] = Math.round(ms / 60000) // minutes
      }
      return row
    })
  }, [activities, range])

  const totalMs = categoryData.reduce((s, d) => s + d.value, 0)
  const uniqueCategories = categoryData.map((d) => d.name)

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color || p.fill }}>
            {p.name}: {typeof p.value === 'number' && p.value > 60 ? formatDuration(p.value * 60000) : `${p.value}m`}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 px-4 pb-24 pt-4">
      {/* Range picker */}
      <div className="flex gap-2 mb-6 justify-center">
        {(['today', 'week', 'month', 'year'] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
            style={{
              backgroundColor: range === r ? '#6366f1' : '#1e293b',
              color: range === r ? 'white' : '#94a3b8',
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#1e293b' }}>
          <div className="text-2xl font-bold">{activities?.filter(a => a.endTime).length ?? 0}</div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>Activities</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#1e293b' }}>
          <div className="text-2xl font-bold">{formatDuration(totalMs)}</div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>Total</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#1e293b' }}>
          <div className="text-2xl font-bold">{uniqueCategories.length}</div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>Categories</div>
        </div>
      </div>

      {categoryData.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#94a3b8' }}>
          No data for this period
        </div>
      ) : (
        <>
          {/* Pie chart */}
          <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#1e293b' }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: '#94a3b8' }}>Time by Category</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {categoryData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value: string) => <span style={{ color: '#f1f5f9', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Percentage breakdown */}
            <div className="space-y-1 mt-2">
              {categoryData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span>{d.name}</span>
                  </div>
                  <span style={{ color: '#94a3b8' }}>
                    {formatDuration(d.value)} ({Math.round((d.value / totalMs) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar chart */}
          {range !== 'today' && barData.length > 1 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: '#1e293b' }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: '#94a3b8' }}>
                {range === 'year' ? 'Weekly' : 'Daily'} Breakdown (minutes)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <XAxis
                    dataKey="period"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    angle={range === 'year' ? -45 : 0}
                    textAnchor={range === 'year' ? 'end' : 'middle'}
                    height={range === 'year' ? 60 : 30}
                    interval={range === 'year' ? 3 : 0}
                  />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  {uniqueCategories.map((cat) => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={getCategoryColor(cat)} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
