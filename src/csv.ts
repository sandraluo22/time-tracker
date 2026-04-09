import { db, generateId } from './db'

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function exportToCSV(): Promise<string> {
  const activities = await db.activities.orderBy('startTime').toArray()
  const header = 'id,label,category,start_time,end_time,duration_minutes'
  const rows = activities.map((a) => {
    const duration = a.endTime ? Math.round((a.endTime - a.startTime) / 60000) : ''
    return [
      a.id,
      escapeCSV(a.label),
      escapeCSV(a.category),
      new Date(a.startTime).toISOString(),
      a.endTime ? new Date(a.endTime).toISOString() : '',
      duration,
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function importFromCSV(csvText: string): Promise<{ added: number; updated: number; errors: number }> {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return { added: 0, updated: 0, errors: 0 }

  // Parse header
  const header = lines[0].toLowerCase()
  const hasId = header.startsWith('id,')

  let added = 0
  let updated = 0
  let errors = 0

  for (let i = 1; i < lines.length; i++) {
    try {
      const fields = parseCSVLine(lines[i])
      let idx = 0

      const id = hasId ? fields[idx++] : generateId()
      const label = fields[idx++] || 'Untitled'
      const category = fields[idx++] || 'Other'
      const startTimeStr = fields[idx++]
      const endTimeStr = fields[idx++]

      if (!startTimeStr) { errors++; continue }

      const startTime = new Date(startTimeStr).getTime()
      if (isNaN(startTime)) { errors++; continue }

      let endTime: number | null = null
      if (endTimeStr) {
        endTime = new Date(endTimeStr).getTime()
        if (isNaN(endTime)) endTime = null
      }

      const existing = await db.activities.get(id)
      const now = Date.now()

      if (existing) {
        await db.activities.update(id, {
          label, category, startTime, endTime, updatedAt: now, synced: false,
        })
        updated++
      } else {
        await db.activities.add({
          id, label, category, startTime, endTime, updatedAt: now, synced: false,
        })
        added++
      }
    } catch {
      errors++
    }
  }

  return { added, updated, errors }
}

/**
 * Import from the legacy spreadsheet format (tab-separated):
 * Date | Wake | Sleep | Time | Breakfast | Time | Lunch | Time | Dinner | Time | Snacks
 *
 * "Sleep" = time fell asleep (e.g. 5:58 = 5:58 AM previous night or same day)
 * "Wake"  = time woke up
 * Meal time columns are ranges like "15:45-16:15"
 */
export async function importFromLegacy(
  text: string,
  year: number
): Promise<{ added: number; skipped: number; errors: number }> {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return { added: 0, skipped: 0, errors: 0 }

  let added = 0
  let skipped = 0
  let errors = 0
  const now = Date.now()

  // Detect delimiter: if first line has tabs, use tabs; otherwise parse as CSV
  const isTabSeparated = lines[0].includes('\t')

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const fields = isTabSeparated
      ? lines[i].split('\t').map((f) => f.trim())
      : parseCSVLine(lines[i])
    if (fields.length < 2) { skipped++; continue }

    try {
      // Parse date: "Mon Mar 23" → need year
      const dateStr = fields[0]
      if (!dateStr) { skipped++; continue }
      const baseDate = parseLegacyDate(dateStr, year)
      if (!baseDate) { errors++; continue }

      const wake = fields[1] // e.g. "13:30"
      const sleep = fields[2] // e.g. "5:58"
      const breakfastTime = fields[3] // time range
      const breakfastDesc = fields[4]
      const lunchTime = fields[5]
      const lunchDesc = fields[6]
      const dinnerTime = fields[7]
      const dinnerDesc = fields[8]
      const snackTime = fields[9]
      const snackDesc = fields[10]

      // Create Sleep activity: sleep time → wake time
      // Sleep time is typically early AM (previous night carrying into this date)
      // Wake time is on this date
      if (wake && sleep) {
        const wakeMinutes = parseHHMM(wake)
        const sleepMinutes = parseHHMM(sleep)
        if (wakeMinutes !== null && sleepMinutes !== null) {
          // Sleep time: if sleep < wake, it's early AM of the same day
          // if sleep > wake, it's previous evening (shouldn't normally happen with this format)
          const sleepDate = new Date(baseDate)
          sleepDate.setHours(0, 0, 0, 0)
          sleepDate.setMinutes(sleepMinutes)

          const wakeDate = new Date(baseDate)
          wakeDate.setHours(0, 0, 0, 0)
          wakeDate.setMinutes(wakeMinutes)

          if (sleepDate.getTime() < wakeDate.getTime()) {
            await addLegacyActivity('Sleep', 'Sleep', sleepDate.getTime(), wakeDate.getTime(), now)
            added++
          }
        }
      }

      // Create meal activities from time ranges
      const meals: [string, string | undefined, string | undefined][] = [
        ['Breakfast', breakfastTime, breakfastDesc],
        ['Lunch', lunchTime, lunchDesc],
        ['Dinner', dinnerTime, dinnerDesc],
        ['Snacks', snackTime, snackDesc],
      ]

      for (const [mealName, timeRange, desc] of meals) {
        if (!timeRange && !desc) continue
        const label = desc || mealName
        const times = parseTimeRange(timeRange, baseDate)
        if (times) {
          await addLegacyActivity(label, 'Other', times.start, times.end, now)
          added++
        } else if (desc) {
          // Has description but no time — create a 30min placeholder at noon-ish
          const placeholder = new Date(baseDate)
          const hour = mealName === 'Breakfast' ? 9 : mealName === 'Lunch' ? 13 : mealName === 'Dinner' ? 19 : 15
          placeholder.setHours(hour, 0, 0, 0)
          await addLegacyActivity(label, 'Other', placeholder.getTime(), placeholder.getTime() + 30 * 60000, now)
          added++
        }
      }
    } catch {
      errors++
    }
  }

  return { added, skipped, errors }
}

async function addLegacyActivity(
  label: string,
  category: string,
  startTime: number,
  endTime: number,
  now: number
) {
  await db.activities.add({
    id: generateId(),
    label,
    category,
    startTime,
    endTime,
    updatedAt: now,
    synced: false,
  })
}

function parseLegacyDate(dateStr: string, year: number): Date | null {
  // "Mon Mar 23" or "Tue Mar 24"
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  const parts = dateStr.split(/\s+/)
  // Could be "Mon Mar 23" (3 parts) or "Mar 23" (2 parts)
  let monthStr: string
  let dayStr: string
  if (parts.length >= 3) {
    monthStr = parts[1]
    dayStr = parts[2]
  } else if (parts.length === 2) {
    monthStr = parts[0]
    dayStr = parts[1]
  } else {
    return null
  }

  const month = months[monthStr]
  const day = parseInt(dayStr)
  if (month === undefined || isNaN(day)) return null

  return new Date(year, month, day)
}

function parseHHMM(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

function parseTimeRange(
  range: string | undefined,
  baseDate: Date
): { start: number; end: number } | null {
  if (!range) return null
  const match = range.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/)
  if (!match) return null

  const startMin = parseHHMM(match[1])
  const endMin = parseHHMM(match[2])
  if (startMin === null || endMin === null) return null

  const start = new Date(baseDate)
  start.setHours(0, 0, 0, 0)
  start.setMinutes(startMin)

  const end = new Date(baseDate)
  end.setHours(0, 0, 0, 0)
  end.setMinutes(endMin)

  return { start: start.getTime(), end: end.getTime() }
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())
  return fields
}
