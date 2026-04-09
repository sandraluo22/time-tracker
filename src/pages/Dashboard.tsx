import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, CATEGORIES } from '../db'
import { formatDuration } from '../hooks'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer
} from 'recharts'

// Generate a consistent color from a string
function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 55%, 55%)`
}

type Range = 'today' | 'week' | 'month' | 'year'

export default function Dashboard() {
  const [range, setRange] = useState<Range>('week')
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const toggleCategory = (name: string) => {
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  const { from, to } = useMemo(() => {
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    if (range === 'today') return { from: today, to: now }
    if (range === 'week') {
      const d = new Date(today); d.setDate(d.getDate() - 6); return { from: d, to: now }
    }
    if (range === 'month') {
      const d = new Date(today); d.setDate(d.getDate() - 29); return { from: d, to: now }
    }
    const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return { from: d, to: now }
  }, [range])

  const activities = useLiveQuery(
    () => db.activities.where('startTime').between(from.getTime(), to.getTime(), true, true).toArray(),
    [from.getTime(), to.getTime()]
  )

  // All categories present in the data (for filter toggles)
  const allCategories = useMemo(() => {
    if (!activities) return []
    const seen = new Set<string>()
    for (const a of activities) if (a.endTime) seen.add(a.category)
    return CATEGORIES.filter(c => seen.has(c.name) && c.name !== 'Other')
  }, [activities])

  const categoryData = useMemo(() => {
    if (!activities) return []
    const map = new Map<string, number>()
    for (const a of activities) {
      if (!a.endTime || hidden.has(a.category)) continue
      // For "Other" category, use the label as the group name
      const key = a.category === 'Other' ? a.label : a.category
      map.set(key, (map.get(key) ?? 0) + (a.endTime - a.startTime))
    }
    return Array.from(map.entries())
      .map(([name, value]) => {
        const cat = CATEGORIES.find(c => c.name === name)
        return {
          name,
          value,
          color: cat?.color ?? stringToColor(name),
          icon: cat?.icon ?? '📌',
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [activities, hidden])

  const barData = useMemo(() => {
    if (!activities) return []
    const map = new Map<string, Map<string, number>>()
    const getKey = (d: Date): string => {
      if (range === 'year') {
        const day = new Date(d); day.setDate(day.getDate() - day.getDay())
        return day.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }
      return d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' })
    }
    for (const a of activities) {
      if (!a.endTime || hidden.has(a.category)) continue
      const key = getKey(new Date(a.startTime))
      const groupKey = a.category === 'Other' ? a.label : a.category
      if (!map.has(key)) map.set(key, new Map())
      map.get(key)!.set(groupKey, (map.get(key)!.get(groupKey) ?? 0) + (a.endTime - a.startTime))
    }
    return Array.from(map.entries()).map(([period, catMap]) => {
      const row: Record<string, string | number> = { period }
      for (const [cat, ms] of catMap) row[cat] = Math.round(ms / 60000)
      return row
    })
  }, [activities, range, hidden])

  const totalMs = categoryData.reduce((s, d) => s + d.value, 0)
  const uniqueCategories = categoryData.map((d) => d.name)

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color || p.fill }}>
            {p.name}: {p.value > 60 ? formatDuration(p.value * 60000) : `${p.value}m`}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="px-4 py-5">
      {/* Range picker */}
      <div className="flex gap-1 mb-5 rounded-lg p-1" style={{ backgroundColor: '#1e293b' }}>
        {(['today', 'week', 'month', 'year'] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-colors"
            style={{
              backgroundColor: range === r ? '#6366f1' : 'transparent',
              color: range === r ? 'white' : '#64748b',
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 rounded-lg px-3 py-2.5 text-center" style={{ backgroundColor: '#1e293b' }}>
          <div className="text-lg font-bold">{activities?.filter(a => a.endTime && !hidden.has(a.category)).length ?? 0}</div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: '#64748b' }}>Activities</div>
        </div>
        <div className="flex-1 rounded-lg px-3 py-2.5 text-center" style={{ backgroundColor: '#1e293b' }}>
          <div className="text-lg font-bold">{formatDuration(totalMs)}</div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: '#64748b' }}>Total</div>
        </div>
      </div>

      {/* Category filters */}
      {allCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {allCategories.map((cat) => {
            const isHidden = hidden.has(cat.name)
            return (
              <button
                key={cat.name}
                onClick={() => toggleCategory(cat.name)}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95"
                style={{
                  backgroundColor: isHidden ? '#1e293b' : cat.color + '22',
                  color: isHidden ? '#475569' : cat.color,
                  border: `1px solid ${isHidden ? '#334155' : cat.color + '44'}`,
                  opacity: isHidden ? 0.5 : 1,
                  textDecoration: isHidden ? 'line-through' : 'none',
                }}
              >
                {cat.icon} {cat.name}
              </button>
            )
          })}
        </div>
      )}

      {categoryData.length === 0 ? (
        <div className="text-center py-20 text-sm" style={{ color: '#475569' }}>
          No data for this period
        </div>
      ) : (
        <>
          {/* Category breakdown */}
          <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#1e293b' }}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="sm:w-48 shrink-0">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} strokeWidth={0}>
                      {categoryData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {categoryData.map((d) => {
                  const pct = Math.round((d.value / totalMs) * 100)
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span>{d.icon} {d.name}</span>
                        <span className="text-xs" style={{ color: '#64748b' }}>{formatDuration(d.value)} · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bar chart */}
          {range !== 'today' && barData.length > 1 && (
            <div className="rounded-lg p-4" style={{ backgroundColor: '#1e293b' }}>
              <div className="text-xs font-medium mb-3" style={{ color: '#64748b' }}>
                {range === 'year' ? 'Weekly' : 'Daily'} breakdown
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <XAxis
                    dataKey="period"
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    angle={range === 'year' ? -45 : 0}
                    textAnchor={range === 'year' ? 'end' : 'middle'}
                    height={range === 'year' ? 50 : 25}
                    interval={range === 'year' ? 3 : 0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  {uniqueCategories.map((cat) => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={categoryData.find(d => d.name === cat)?.color ?? stringToColor(cat)} radius={[2, 2, 0, 0]} />
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
