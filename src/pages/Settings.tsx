import { useState, useEffect, useRef } from 'react'
import { getSupabaseConfig, setSupabaseConfig, clearSupabaseConfig, syncToCloud, subscribeToRealtime, unsubscribeFromRealtime } from '../supabase'
import { Cloud, CloudOff, RefreshCw, Trash2, Download, Upload, ChevronDown } from 'lucide-react'
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
  const [showSetup, setShowSetup] = useState(false)
  const [showLegacy, setShowLegacy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const legacyFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const config = getSupabaseConfig()
    if (config) { setUrl(config.url); setAnonKey(config.anonKey); setConnected(true) }
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
    setConnected(false); setUrl(''); setAnonKey('')
  }

  const handleSync = async () => {
    setSyncing(true); setSyncResult('')
    try {
      const r = await syncToCloud()
      setSyncResult(`Pushed ${r.pushed}, pulled ${r.pulled}`)
    } catch (e: any) { setSyncResult(`Error: ${e.message}`) }
    setSyncing(false)
  }

  return (
    <div className="px-4 py-5 space-y-3">

      {/* Cloud Sync */}
      <section className="rounded-lg p-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex items-center gap-2 mb-3">
          {connected ? <Cloud size={16} color="#22c55e" /> : <CloudOff size={16} color="#64748b" />}
          <span className="text-sm font-semibold">Cloud Sync</span>
          {connected && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">Connected</span>}
        </div>

        {!connected ? (
          <div className="space-y-2">
            <input type="url" placeholder="Supabase Project URL" value={url} onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm text-white outline-none" style={{ backgroundColor: '#334155' }} />
            <input type="text" placeholder="Anon public key" value={anonKey} onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm text-white outline-none" style={{ backgroundColor: '#334155' }} />
            <button onClick={handleConnect} className="w-full py-2 rounded text-sm font-medium text-white" style={{ backgroundColor: '#6366f1' }}>
              Connect
            </button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <button onClick={handleSync} disabled={syncing}
                className="flex-1 py-2 rounded text-sm font-medium text-white flex items-center justify-center gap-1.5"
                style={{ backgroundColor: '#6366f1' }}>
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button onClick={handleDisconnect} className="py-2 px-3 rounded text-xs" style={{ backgroundColor: '#334155', color: '#94a3b8' }}>
                Disconnect
              </button>
            </div>
            {syncResult && <div className="text-xs mt-1.5" style={{ color: syncResult.startsWith('Error') ? '#ef4444' : '#22c55e' }}>{syncResult}</div>}
          </div>
        )}
      </section>

      {/* Setup Guide (collapsible) */}
      <section className="rounded-lg" style={{ backgroundColor: '#1e293b' }}>
        <button onClick={() => setShowSetup(!showSetup)} className="w-full flex items-center justify-between p-4 text-sm font-semibold">
          <span>Supabase Setup Guide</span>
          <ChevronDown size={16} color="#64748b" style={{ transform: showSetup ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
        </button>
        {showSetup && (
          <div className="px-4 pb-4">
            <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: '#94a3b8' }}>
              <li>Create a project at supabase.com</li>
              <li>Go to SQL Editor and run:</li>
            </ol>
            <pre className="mt-2 p-2.5 rounded text-[10px] overflow-x-auto leading-relaxed" style={{ backgroundColor: '#0f172a' }}>
{`create table activities (
  id uuid primary key,
  label text not null,
  category text not null,
  start_time bigint not null,
  end_time bigint,
  updated_at bigint not null
);

alter table activities enable row level security;
create policy "allow all"
  on activities for all
  using (true) with check (true);

alter publication supabase_realtime
  add table activities;`}
            </pre>
            <ol start={3} className="text-xs space-y-1 list-decimal list-inside mt-2" style={{ color: '#94a3b8' }}>
              <li>Go to Settings → API</li>
              <li>Copy the <strong>Project URL</strong> and <strong>anon public</strong> key</li>
              <li>Paste them above and connect</li>
            </ol>
          </div>
        )}
      </section>

      {/* CSV Export/Import */}
      <section className="rounded-lg p-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="text-sm font-semibold mb-3">Data</div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setCsvStatus('')
              const csv = await exportToCSV()
              downloadCSV(csv, `time-tracker-${new Date().toISOString().slice(0, 10)}.csv`)
              setCsvStatus('Exported')
            }}
            className="flex-1 py-2 rounded text-xs font-medium text-white flex items-center justify-center gap-1.5"
            style={{ backgroundColor: '#6366f1' }}>
            <Download size={13} /> Export CSV
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 rounded text-xs font-medium flex items-center justify-center gap-1.5"
            style={{ backgroundColor: '#334155', color: '#f1f5f9' }}>
            <Upload size={13} /> Import CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return
              setCsvStatus('Importing...')
              const r = await importFromCSV(await file.text())
              setCsvStatus(`Added ${r.added}, updated ${r.updated}${r.errors ? `, ${r.errors} errors` : ''}`)
              e.target.value = ''
            }} />
        </div>
        {csvStatus && <div className="text-xs mt-1.5" style={{ color: '#22c55e' }}>{csvStatus}</div>}
      </section>

      {/* Legacy Import (collapsible) */}
      <section className="rounded-lg" style={{ backgroundColor: '#1e293b' }}>
        <button onClick={() => setShowLegacy(!showLegacy)} className="w-full flex items-center justify-between p-4 text-sm font-semibold">
          <span>Import from Spreadsheet</span>
          <ChevronDown size={16} color="#64748b" style={{ transform: showLegacy ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
        </button>
        {showLegacy && (
          <div className="px-4 pb-4 space-y-2">
            <p className="text-xs" style={{ color: '#64748b' }}>
              Paste tab-separated data (Date, Wake, Sleep, Time, Breakfast, ...) or upload a file.
            </p>
            <div className="flex gap-2 items-center">
              <label className="text-xs" style={{ color: '#64748b' }}>Year:</label>
              <input type="number" value={legacyYear} onChange={(e) => setLegacyYear(e.target.value)}
                className="w-16 px-2 py-1 rounded text-sm text-white outline-none" style={{ backgroundColor: '#334155' }} />
              <button onClick={() => legacyFileRef.current?.click()}
                className="ml-auto px-2.5 py-1 rounded text-xs flex items-center gap-1" style={{ backgroundColor: '#334155', color: '#f1f5f9' }}>
                <Upload size={11} /> File
              </button>
              <input ref={legacyFileRef} type="file" accept=".tsv,.csv,.txt" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return
                  setLegacyText(await file.text()); e.target.value = ''
                }} />
            </div>
            <textarea value={legacyText} onChange={(e) => setLegacyText(e.target.value)}
              placeholder="Paste spreadsheet data here..."
              rows={4} className="w-full px-3 py-2 rounded text-xs text-white outline-none font-mono resize-y" style={{ backgroundColor: '#334155' }} />
            <button
              onClick={async () => {
                if (!legacyText.trim()) return
                setLegacyStatus('Importing...')
                const r = await importFromLegacy(legacyText, parseInt(legacyYear))
                setLegacyStatus(`Added ${r.added}${r.skipped ? `, ${r.skipped} skipped` : ''}${r.errors ? `, ${r.errors} errors` : ''}`)
              }}
              className="w-full py-2 rounded text-xs font-medium text-white" style={{ backgroundColor: '#6366f1' }}>
              Import
            </button>
            {legacyStatus && <div className="text-xs" style={{ color: '#22c55e' }}>{legacyStatus}</div>}
          </div>
        )}
      </section>

      {/* Danger */}
      <section className="rounded-lg p-4" style={{ backgroundColor: '#1e293b', border: '1px solid #ef444422' }}>
        <button
          onClick={() => { if (confirm('Delete all local data?')) db.activities.clear() }}
          className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300">
          <Trash2 size={13} /> Clear all local data
        </button>
      </section>
    </div>
  )
}
