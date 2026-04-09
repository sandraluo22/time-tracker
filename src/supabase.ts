import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js'
import { db } from './db'

let syncTimer: ReturnType<typeof setTimeout> | null = null
let realtimeChannel: RealtimeChannel | null = null

/** Debounced auto-sync: call after any write. Waits 2s then syncs. */
export function triggerAutoSync() {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncToCloud().catch(() => {})
  }, 2000)
}

let supabase: SupabaseClient | null = null

const SUPABASE_URL_KEY = 'tt_supabase_url'
const SUPABASE_ANON_KEY = 'tt_supabase_anon'

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = localStorage.getItem(SUPABASE_URL_KEY)
  const anonKey = localStorage.getItem(SUPABASE_ANON_KEY)
  if (url && anonKey) return { url, anonKey }
  return null
}

export function setSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url)
  localStorage.setItem(SUPABASE_ANON_KEY, anonKey)
  supabase = createClient(url, anonKey)
}

export function clearSupabaseConfig() {
  localStorage.removeItem(SUPABASE_URL_KEY)
  localStorage.removeItem(SUPABASE_ANON_KEY)
  supabase = null
}

export function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase
  const config = getSupabaseConfig()
  if (config) {
    supabase = createClient(config.url, config.anonKey)
    return supabase
  }
  return null
}

export async function syncToCloud(): Promise<{ pushed: number; pulled: number }> {
  const client = getSupabase()
  if (!client) return { pushed: 0, pulled: 0 }

  let pushed = 0
  let pulled = 0

  // Push unsynced local activities
  const unsynced = await db.activities.filter((a) => !a.synced).toArray()
  for (const activity of unsynced) {
    const row = {
      id: activity.id,
      label: activity.label,
      description: activity.description || null,
      category: activity.category,
      start_time: activity.startTime,
      end_time: activity.endTime,
      updated_at: activity.updatedAt,
    }
    const { error } = await client.from('activities').upsert(row, { onConflict: 'id' })
    if (!error) {
      await db.activities.update(activity.id!, { synced: true })
      pushed++
    }
  }

  // Pull from cloud (last-write-wins)
  const lastSync = parseInt(localStorage.getItem('tt_last_sync') ?? '0')
  const { data, error } = await client
    .from('activities')
    .select('*')
    .gt('updated_at', lastSync)
    .order('updated_at', { ascending: true })

  if (!error && data) {
    for (const row of data) {
      const local = await db.activities.get(row.id)
      if (!local || row.updated_at > local.updatedAt) {
        await db.activities.put({
          id: row.id,
          label: row.label,
          description: row.description || undefined,
          category: row.category,
          startTime: row.start_time,
          endTime: row.end_time,
          updatedAt: row.updated_at,

          synced: true,
        })
        pulled++
      }
    }
  }

  localStorage.setItem('tt_last_sync', Date.now().toString())
  return { pushed, pulled }
}

/** Subscribe to realtime changes — other tabs/devices push updates, we pull them in */
export function subscribeToRealtime() {
  const client = getSupabase()
  if (!client) return

  // Clean up existing subscription
  if (realtimeChannel) {
    client.removeChannel(realtimeChannel)
    realtimeChannel = null
  }

  realtimeChannel = client
    .channel('activities-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activities' },
      async (payload) => {
        const row = payload.new as Record<string, any>
        if (!row || !row.id) return

        if (payload.eventType === 'DELETE') {
          await db.activities.delete((payload.old as any).id)
          return
        }

        // INSERT or UPDATE — apply if newer than local
        const local = await db.activities.get(row.id)
        if (!local || row.updated_at > local.updatedAt) {
          await db.activities.put({
            id: row.id,
            label: row.label,
            description: row.description || undefined,
            category: row.category,
            startTime: row.start_time,
            endTime: row.end_time,
            updatedAt: row.updated_at,
  
            synced: true,
          })
        }
      }
    )
    .subscribe()
}

/** Unsubscribe from realtime */
export function unsubscribeFromRealtime() {
  const client = getSupabase()
  if (client && realtimeChannel) {
    client.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}
