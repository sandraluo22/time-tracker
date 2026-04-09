import { useState, useEffect, useRef } from 'react'
import { getSupabaseConfig, setSupabaseConfig, clearSupabaseConfig, syncToCloud, subscribeToRealtime, unsubscribeFromRealtime } from '../supabase'
import { Cloud, CloudOff, RefreshCw, Trash2, Download, Upload } from 'lucide-react'
import { db } from '../db'
import { exportToCSV, downloadCSV, importFromCSV, importFromLegacy } from '../csv'

export default function Settings() {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [connected, setConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState('')
  const [csvStatus, setCsvStatus] = useState('')
  const [legacyText, setLegacyText] = useState('')
  const [legacyYear, setLegacyYear] = useState(new Date().getFullYear().toString())
  const [legacyStatus, setLegacyStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const legacyFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const config = getSupabaseConfig()
    if (config) {
      setUrl(config.url)
      setAnonKey(config.anonKey)
      setConnected(true)
    }
  }, [])

  const handleConnect = () => {
    if (!url.trim() || !anonKey.trim()) return
    setSupabaseConfig(url.trim(), anonKey.trim())
    setConnected(true)
    subscribeToRealtime()
  }

  const handleDisconnect = () => {
    unsubscribeFromRealtime()
    clearSupabaseConfig()
    setConnected(false)
    setUrl('')
    setAnonKey('')
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult('')
    try {
      const result = await syncToCloud()
      setSyncResult(`Pushed ${result.pushed}, pulled ${result.pulled}`)
    } catch (e: any) {
      setSyncResult(`Error: ${e.message}`)
    }
    setSyncing(false)
  }

  const handleClearLocal = async () => {
    if (confirm('Delete all local data? This cannot be undone.')) {
      await db.activities.clear()
    }
  }

  return (
    <div className="flex-1 px-4 pb-4 pt-4">
      <h2 className="text-xl font-semibold mb-6">Settings</h2>

      {/* Supabase config */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex items-center gap-2 mb-3">
          {connected ? <Cloud size={18} color="#22c55e" /> : <CloudOff size={18} color="#94a3b8" />}
          <h3 className="font-medium">Cloud Sync</h3>
          {connected && <span className="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-400">Connected</span>}
        </div>

        {!connected ? (
          <>
            <p className="text-sm mb-3" style={{ color: '#94a3b8' }}>
              Connect to Supabase for cloud sync. Create a free project at{' '}
              <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline" style={{ color: '#818cf8' }}>
                supabase.com
              </a>
            </p>
            <input
              type="url"
              placeholder="Supabase Project URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ backgroundColor: '#334155' }}
            />
            <input
              type="text"
              placeholder="Anon Key"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ backgroundColor: '#334155' }}
            />
            <button
              onClick={handleConnect}
              className="w-full py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#6366f1' }}
            >
              Connect
            </button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: '#6366f1' }}
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleDisconnect}
                className="py-2 px-4 rounded-lg text-sm"
                style={{ backgroundColor: '#334155', color: '#94a3b8' }}
              >
                Disconnect
              </button>
            </div>
            {syncResult && (
              <div className="text-xs mt-2" style={{ color: syncResult.startsWith('Error') ? '#ef4444' : '#22c55e' }}>
                {syncResult}
              </div>
            )}
          </>
        )}
      </div>

      {/* CSV Export/Import */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#1e293b' }}>
        <h3 className="font-medium mb-3">CSV Data</h3>
        <div className="flex gap-2 mb-2">
          <button
            onClick={async () => {
              setCsvStatus('')
              const csv = await exportToCSV()
              const date = new Date().toISOString().slice(0, 10)
              downloadCSV(csv, `time-tracker-${date}.csv`)
              setCsvStatus('Exported successfully')
            }}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: '#6366f1' }}
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            style={{ backgroundColor: '#334155', color: '#f1f5f9' }}
          >
            <Upload size={14} />
            Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setCsvStatus('Importing...')
              const text = await file.text()
              const result = await importFromCSV(text)
              setCsvStatus(`Added ${result.added}, updated ${result.updated}${result.errors ? `, ${result.errors} errors` : ''}`)
              e.target.value = ''
            }}
          />
        </div>
        {csvStatus && (
          <div className="text-xs" style={{ color: csvStatus.includes('error') ? '#f59e0b' : '#22c55e' }}>
            {csvStatus}
          </div>
        )}
        <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>
          CSV format: id, label, category, start_time (ISO), end_time (ISO), duration_minutes
        </p>
      </div>

      {/* Legacy Spreadsheet Import */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#1e293b' }}>
        <h3 className="font-medium mb-2">Import from Spreadsheet</h3>
        <p className="text-xs mb-3" style={{ color: '#94a3b8' }}>
          Paste tab-separated data with columns: Date, Wake, Sleep, Time, Breakfast, Time, Lunch, Time, Dinner, Time, Snacks.
          Or upload a .tsv/.csv file.
        </p>
        <div className="flex gap-2 mb-2 items-center">
          <label className="text-xs" style={{ color: '#94a3b8' }}>Year:</label>
          <input
            type="number"
            value={legacyYear}
            onChange={(e) => setLegacyYear(e.target.value)}
            className="w-20 px-2 py-1 rounded text-sm text-white outline-none"
            style={{ backgroundColor: '#334155' }}
            min="2000"
            max="2099"
          />
          <button
            onClick={() => legacyFileRef.current?.click()}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
            style={{ backgroundColor: '#334155', color: '#f1f5f9' }}
          >
            <Upload size={12} /> Upload File
          </button>
          <input
            ref={legacyFileRef}
            type="file"
            accept=".tsv,.csv,.txt"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const text = await file.text()
              setLegacyText(text)
              e.target.value = ''
            }}
          />
        </div>
        <textarea
          value={legacyText}
          onChange={(e) => setLegacyText(e.target.value)}
          placeholder={"Date\tWake\tSleep\tTime\tBreakfast\tTime\tLunch\t...\nMon Mar 23\t13:30\t5:58\t\t\t15:45-16:15\t..."}
          rows={5}
          className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none font-mono mb-2 resize-y"
          style={{ backgroundColor: '#334155' }}
        />
        <button
          onClick={async () => {
            if (!legacyText.trim()) return
            setLegacyStatus('Importing...')
            const result = await importFromLegacy(legacyText, parseInt(legacyYear))
            setLegacyStatus(
              `Added ${result.added} activities${result.skipped ? `, ${result.skipped} skipped` : ''}${result.errors ? `, ${result.errors} errors` : ''}`
            )
          }}
          className="w-full py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#6366f1' }}
        >
          Import Spreadsheet Data
        </button>
        {legacyStatus && (
          <div className="text-xs mt-2" style={{ color: legacyStatus.includes('error') ? '#f59e0b' : '#22c55e' }}>
            {legacyStatus}
          </div>
        )}
      </div>

      {/* Supabase setup instructions */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#1e293b' }}>
        <h3 className="font-medium mb-2">Supabase Setup</h3>
        <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: '#94a3b8' }}>
          <li>Create a project at supabase.com</li>
          <li>Go to SQL Editor and run:</li>
        </ol>
        <pre className="mt-2 p-3 rounded-lg text-xs overflow-x-auto" style={{ backgroundColor: '#0f172a' }}>
{`create table activities (
  id uuid primary key,
  label text not null,
  category text not null,
  start_time bigint not null,
  end_time bigint,
  updated_at bigint not null
);

-- Disable RLS for single-user
alter table activities enable row level security;
create policy "allow all"
  on activities for all
  using (true)
  with check (true);

-- Enable realtime sync
alter publication supabase_realtime
  add table activities;`}
        </pre>
        <ol start={3} className="text-sm space-y-1 list-decimal list-inside mt-2" style={{ color: '#94a3b8' }}>
          <li>Copy URL and anon key from Settings &gt; API</li>
          <li>Paste them above and connect</li>
        </ol>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid #ef444433' }}>
        <h3 className="font-medium mb-2 text-red-400">Danger Zone</h3>
        <button
          onClick={handleClearLocal}
          className="flex items-center gap-2 text-sm text-red-400"
        >
          <Trash2 size={14} />
          Clear all local data
        </button>
      </div>
    </div>
  )
}
