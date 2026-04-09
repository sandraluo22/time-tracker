import { useState } from 'react'
import { useActivitiesForDay, formatTime, formatDuration, formatDateShort } from '../hooks'
import { updateActivity, deleteActivity, CATEGORIES, getCategoryColor } from '../db'

function getCategoryIcon(category: string): string {
  return CATEGORIES.find((c) => c.name === category)?.icon ?? '📌'
}
import { ChevronLeft, ChevronRight, Pencil, Trash2, Check, X, LayoutList, BarChart3 } from 'lucide-react'

export default function Timeline() {
  const [date, setDate] = useState(new Date())
  const activities = useActivitiesForDay(date)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ label: '', category: '', startTime: '', endTime: '' })
  const [view, setView] = useState<'timeline' | 'list'>('timeline')

  const prevDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    setDate(d)
  }
  const nextDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    setDate(d)
  }
  const isToday = date.toDateString() === new Date().toDateString()

  const startEdit = (a: typeof activities[0]) => {
    setEditingId(a.id!)
    setEditForm({
      label: a.label,
      category: a.category,
      startTime: new Date(a.startTime).toTimeString().slice(0, 5),
      endTime: a.endTime ? new Date(a.endTime).toTimeString().slice(0, 5) : '',
    })
  }

  const saveEdit = async (id: string) => {
    const base = new Date(date)
    const [sh, sm] = editForm.startTime.split(':').map(Number)
    base.setHours(sh, sm, 0, 0)
    const startTime = base.getTime()

    let endTime: number | null = null
    if (editForm.endTime) {
      const end = new Date(date)
      const [eh, em] = editForm.endTime.split(':').map(Number)
      end.setHours(eh, em, 0, 0)
      endTime = end.getTime()
    }

    await updateActivity(id, {
      label: editForm.label,
      category: editForm.category,
      startTime,
      endTime,
    })
    setEditingId(null)
  }

  const totalMs = activities.reduce((sum, a) => {
    if (!a.endTime) return sum
    return sum + (a.endTime - a.startTime)
  }, 0)

  return (
    <div className="flex-1 px-4 pb-4 pt-4">
      {/* Date nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevDay} className="p-2 rounded-lg" style={{ backgroundColor: '#1e293b' }}>
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="text-lg font-medium">{formatDateShort(date)}</div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>
            {activities.length} activities &middot; {formatDuration(totalMs)} tracked
          </div>
        </div>
        <button onClick={nextDay} className="p-2 rounded-lg" style={{ backgroundColor: '#1e293b' }} disabled={isToday}>
          <ChevronRight size={20} style={{ opacity: isToday ? 0.3 : 1 }} />
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 mb-4 justify-center">
        <button
          onClick={() => setView('timeline')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
          style={{ backgroundColor: view === 'timeline' ? '#6366f1' : '#1e293b', color: view === 'timeline' ? 'white' : '#94a3b8' }}
        >
          <BarChart3 size={13} /> Timeline
        </button>
        <button
          onClick={() => setView('list')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
          style={{ backgroundColor: view === 'list' ? '#6366f1' : '#1e293b', color: view === 'list' ? 'white' : '#94a3b8' }}
        >
          <LayoutList size={13} /> List
        </button>
      </div>

      {/* Visual timeline bar */}
      {view === 'timeline' && activities.length > 0 && (
        <div className="h-3 rounded-full overflow-hidden flex mb-6" style={{ backgroundColor: '#1e293b' }}>
          {activities.map((a) => {
            const duration = (a.endTime ?? Date.now()) - a.startTime
            const pct = (duration / (24 * 60 * 60 * 1000)) * 100
            return (
              <div
                key={a.id}
                style={{
                  width: `${Math.max(pct, 0.5)}%`,
                  backgroundColor: getCategoryColor(a.category),
                }}
              />
            )
          })}
        </div>
      )}

      {/* Activities */}
      {activities.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#94a3b8' }}>
          No activities tracked this day
        </div>
      ) : view === 'list' ? (
        /* Compact list view */
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: '#94a3b8' }}>Activity</th>
                <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: '#94a3b8' }}>Category</th>
                <th className="text-right px-3 py-2 text-xs font-medium" style={{ color: '#94a3b8' }}>Time</th>
                <th className="text-right px-3 py-2 text-xs font-medium" style={{ color: '#94a3b8' }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a, i) => (
                <tr
                  key={a.id}
                  style={{ borderBottom: i < activities.length - 1 ? '1px solid #334155' : undefined }}
                  className="hover:bg-white/5"
                >
                  <td className="px-3 py-2 truncate max-w-[120px]">
                    <span className="mr-1">{getCategoryIcon(a.category)}</span>
                    {a.label}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: getCategoryColor(a.category) + '22', color: getCategoryColor(a.category) }}
                    >
                      {a.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-xs" style={{ color: '#94a3b8' }}>
                    {formatTime(a.startTime)}-{a.endTime ? formatTime(a.endTime) : 'now'}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap font-mono text-xs">
                    {a.endTime ? formatDuration(a.endTime - a.startTime) : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card view with edit */
        <div className="space-y-2">
          {activities.map((a) => (
            <div
              key={a.id}
              className="rounded-xl p-3"
              style={{ backgroundColor: '#1e293b', borderLeft: `4px solid ${getCategoryColor(a.category)}` }}
            >
              {editingId === a.id ? (
                <div className="space-y-2">
                  <input
                    value={editForm.label}
                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    className="w-full bg-transparent border-b border-gray-600 text-white outline-none pb-1 text-sm"
                  />
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2 items-center text-sm">
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      className="bg-gray-700 text-white rounded px-2 py-1"
                    />
                    <span>-</span>
                    <input
                      type="time"
                      value={editForm.endTime}
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                      className="bg-gray-700 text-white rounded px-2 py-1"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => saveEdit(a.id!)} className="p-1.5 rounded bg-green-600"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded bg-gray-600"><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      <span className="mr-1">{getCategoryIcon(a.category)}</span>
                      {a.label}
                    </div>
                    <div className="text-xs" style={{ color: '#94a3b8' }}>
                      {formatTime(a.startTime)} - {a.endTime ? formatTime(a.endTime) : 'running'}
                      {a.endTime && <span className="ml-2">&middot; {formatDuration(a.endTime - a.startTime)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => startEdit(a)} className="p-1.5 rounded" style={{ backgroundColor: '#334155' }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteActivity(a.id!)} className="p-1.5 rounded" style={{ backgroundColor: '#334155' }}>
                      <Trash2 size={14} color="#ef4444" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add manual entry button */}
      <button
        onClick={async () => {
          const { startActivity } = await import('../db')
          const id = await startActivity('New Activity', 'Other')
          const { stopActivity } = await import('../db')
          await stopActivity(id)
        }}
        className="w-full mt-4 py-3 rounded-xl text-sm font-medium"
        style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}
      >
        + Add manual entry
      </button>
    </div>
  )
}
