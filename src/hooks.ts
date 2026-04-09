import { useState, useEffect } from 'react'
import { db } from './db'
import { useLiveQuery } from 'dexie-react-hooks'

export function useRunningActivity() {
  const running = useLiveQuery(() =>
    db.activities.filter((a) => a.endTime === null).first()
  )
  return running ?? null
}

export function useActivitiesForDay(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const activities = useLiveQuery(
    () =>
      db.activities
        .where('startTime')
        .between(start.getTime(), end.getTime(), true, true)
        .sortBy('startTime'),
    [date.toDateString()]
  )
  return activities ?? []
}

export function useElapsed(startTime: number | null) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (startTime === null) {
      setElapsed(0)
      return
    }
    const update = () => setElapsed(Date.now() - startTime)
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startTime])

  return elapsed
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}
