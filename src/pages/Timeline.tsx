import { useState } from 'react'
import { useActivitiesForDay, formatTime, formatDuration, formatDateShort } from '../hooks'
import { updateActivity, deleteActivity, CATEGORIES, getCategoryColor } from '../db'
import { ChevronLeft, ChevronRight, Pencil, Trash2, Check, X, LayoutList, BarChart3 } from 'lucide-react'

function getCategoryIcon(category: string): string {
  return CATEGORIES.find((c) => c.name === category)?.icon ?? '📌'
}

export default function Timeline() {
  const [date, setDate] = useState(new Date())
  const activities = useActivitiesForDay(date)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ label: '', category: '', startTime: '', endTime: '' })
  const [view, setView] = useState<'cards' | 'list'>('cards')

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d) }
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d) }
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
    await updateActivity(id, { label: editForm.label, category: editForm.category, startTime, endTime })
    setEditingId(null)
  }

  const totalMs = activities.reduce((sum, a) => a.endTime ? sum + (a.endTime - a.startTime) : sum, 0)

  return (
    <div className="px-4 py-5">
      {/* Date nav */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevDay} className="p-2 rounded-lg hover:bg-white/5 active:bg-white/10">
          <ChevronLeft size={20} color="#94a3b8" />
        </button>
        <div className="text-center">
          <div className="text-base font-semibold">{formatDateShort(date)}</div>
          <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            {activities.length} activities · {formatDuration(totalMs)}
          </div>
        </div>
        <button onClick={nextDay} className="p-2 rounded-lg hover:bg-white/5 active:bg-white/10" disabled={isToday}>
          <ChevronRight size={20} color={isToday ? '#334155' : '#94a3b8'} />
        </button>
      </div>

      {/* Timeline bar */}
      {activities.length > 0 && (
        <div className="h-2 rounded-full overflow-hidden flex mb-5" style={{ backgroundColor: '#1e293b' }}>
          {activities.map((a) => {
            const duration = (a.endTime ?? Date.now()) - a.startTime
            const pct = (duration / (24 * 60 * 60 * 1000)) * 100
            return <div key={a.id} style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: getCategoryColor(a.category) }} />
          })}
        </div>
      )}

      {/* View toggle */}
      {activities.length > 0 && (
        <div className="flex gap-1 mb-4 rounded-lg p-0.5" style={{ backgroundColor: '#1e293b' }}>
          <button onClick={() => setView('cards')}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium"
            style={{ backgroundColor: view === 'cards' ? '#6366f1' : 'transparent', color: view === 'cards' ? 'white' : '#64748b' }}>
            <BarChart3 size={12} /> Cards
          </button>
          <button onClick={() => setView('list')}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium"
            style={{ backgroundColor: view === 'list' ? '#6366f1' : 'transparent', color: view === 'list' ? 'white' : '#64748b' }}>
            <LayoutList size={12} /> List
          </button>
        </div>
      )}

      {/* Activities */}
      {activities.length === 0 ? (
        <div className="text-center py-20 text-sm" style={{ color: '#475569' }}>
          Nothing tracked yet
        </div>
      ) : view === 'list' ? (
        /* List view */
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th className="text-left px-3 py-2 text-[10px] font-medium uppercase tracking-wide" style={{ color: '#64748b' }}>Activity</th>
                <th className="text-right px-3 py-2 text-[10px] font-medium uppercase tracking-wide" style={{ color: '#64748b' }}>Time</th>
                <th className="text-right px-3 py-2 text-[10px] font-medium uppercase tracking-wide" style={{ color: '#64748b' }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: i < activities.length - 1 ? '1px solid #334155' : undefined }} className="hover:bg-white/5">
                  <td className="px-3 py-2 text-sm truncate max-w-[180px]">
                    <span className="mr-1">{getCategoryIcon(a.category)}</span>{a.label}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-xs" style={{ color: '#64748b' }}>
                    {formatTime(a.startTime)}→{a.endTime ? formatTime(a.endTime) : 'now'}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap font-mono text-xs">
                    {a.endTime ? formatDuration(a.endTime - a.startTime) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card view */
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="rounded-lg p-3" style={{ backgroundColor: '#1e293b' }}>
              {editingId === a.id ? (
                <div className="space-y-2">
                  <input value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    className="w-full bg-transparent border-b border-white/10 text-white outline-none pb-1 text-sm" />
                  <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="text-sm rounded px-2 py-1 text-white outline-none" style={{ backgroundColor: '#334155' }}>
                    {CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                  <div className="flex gap-2 items-center text-sm">
                    <input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      className="rounded px-2 py-1 text-white outline-none" style={{ backgroundColor: '#334155' }} />
                    <span style={{ color: '#475569' }}>→</span>
                    <input type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                      className="rounded px-2 py-1 text-white outline-none" style={{ backgroundColor: '#334155' }} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => saveEdit(a.id!)} className="p-1.5 rounded bg-green-600 active:bg-green-700"><Check size={14} /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded active:bg-white/10" style={{ backgroundColor: '#334155' }}><X size={14} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: getCategoryColor(a.category) }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {getCategoryIcon(a.category)} {a.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                      {formatTime(a.startTime)} → {a.endTime ? formatTime(a.endTime) : 'now'}
                      {a.endTime && <span className="ml-1.5">· {formatDuration(a.endTime - a.startTime)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(a)} className="p-1.5 rounded hover:bg-white/10 active:bg-white/15">
                      <Pencil size={13} color="#64748b" />
                    </button>
                    <button onClick={() => deleteActivity(a.id!)} className="p-1.5 rounded hover:bg-white/10 active:bg-white/15">
                      <Trash2 size={13} color="#ef4444" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add manual entry */}
      <button
        onClick={async () => {
          const { startActivity } = await import('../db')
          const id = await startActivity('New Activity', 'Other')
          const { stopActivity } = await import('../db')
          await stopActivity(id)
        }}
        className="w-full mt-3 py-2.5 rounded-lg text-sm font-medium hover:bg-white/5 active:bg-white/10"
        style={{ color: '#64748b', border: '1px dashed #334155' }}
      >
        + Add entry
      </button>
    </div>
  )
}
