import Dexie, { type Table } from 'dexie'

export interface Activity {
  id?: string
  label: string
  category: string
  startTime: number // unix ms
  endTime: number | null // null = running
  updatedAt: number
  synced: boolean
}

export const CATEGORIES = [
  { name: 'Work', color: '#6366f1' },
  { name: 'Study', color: '#f59e0b' },
  { name: 'Exercise', color: '#22c55e' },
  { name: 'Leisure', color: '#ec4899' },
  { name: 'Social', color: '#14b8a6' },
  { name: 'Chores', color: '#f97316' },
  { name: 'Sleep', color: '#8b5cf6' },
  { name: 'Other', color: '#64748b' },
]

export function getCategoryColor(category: string): string {
  return CATEGORIES.find((c) => c.name === category)?.color ?? '#64748b'
}

class TrackerDB extends Dexie {
  activities!: Table<Activity, string>

  constructor() {
    super('TimeTrackerDB')
    this.version(1).stores({
      activities: 'id, label, category, startTime, endTime, updatedAt, synced',
    })
  }
}

export const db = new TrackerDB()

export function generateId(): string {
  return crypto.randomUUID()
}

export async function startActivity(label: string, category: string): Promise<string> {
  const id = generateId()
  const now = Date.now()
  await db.activities.add({
    id,
    label,
    category,
    startTime: now,
    endTime: null,
    updatedAt: now,
    synced: false,
  })
  return id
}

export async function stopActivity(id: string): Promise<void> {
  const now = Date.now()
  await db.activities.update(id, { endTime: now, updatedAt: now, synced: false })
}

export async function getRunningActivity(): Promise<Activity | undefined> {
  return db.activities.where('endTime').equals(0).or('endTime').equals('').first()
    .then(() => db.activities.filter((a) => a.endTime === null).first())
}

export async function updateActivity(
  id: string,
  updates: Partial<Pick<Activity, 'label' | 'category' | 'startTime' | 'endTime'>>
): Promise<void> {
  await db.activities.update(id, { ...updates, updatedAt: Date.now(), synced: false })
}

export async function deleteActivity(id: string): Promise<void> {
  await db.activities.delete(id)
}

export async function getActivitiesForDay(date: Date): Promise<Activity[]> {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return db.activities
    .where('startTime')
    .between(start.getTime(), end.getTime(), true, true)
    .sortBy('startTime')
}

export async function getActivitiesForRange(from: Date, to: Date): Promise<Activity[]> {
  return db.activities
    .where('startTime')
    .between(from.getTime(), to.getTime(), true, true)
    .sortBy('startTime')
}
