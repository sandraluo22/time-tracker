import { useState } from 'react'
import { startActivity, stopActivity, CATEGORIES } from '../db'
import { useRunningActivity, useElapsed, formatDuration } from '../hooks'
import { Play, Square } from 'lucide-react'

export default function Timer() {
  const running = useRunningActivity()
  const elapsed = useElapsed(running?.startTime ?? null)
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('Sleep')

  const handleStart = async () => {
    await startActivity(label.trim() || category, category)
    setLabel('')
  }

  const handleStop = async () => {
    if (running?.id) await stopActivity(running.id)
  }

  const runningCat = CATEGORIES.find(c => c.name === running?.category)
  const selectedCat = CATEGORIES.find(c => c.name === category)

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5 py-8">
      {/* Timer */}
      <div
        className="font-mono font-extralight tracking-tight mb-6 tabular-nums"
        style={{ fontSize: 'clamp(3.5rem, 15vw, 5rem)', color: running ? '#22c55e' : '#334155' }}
      >
        {formatDuration(elapsed)}
      </div>

      {running ? (
        <>
          <div className="text-lg mb-1 font-medium">
            {runningCat?.icon} {running.label}
          </div>
          <div className="text-xs px-3 py-1 rounded-full mb-8"
            style={{ backgroundColor: (runningCat?.color ?? '#64748b') + '18', color: runningCat?.color }}>
            {running.category}
          </div>
          <button onClick={handleStop}
            className="w-28 h-28 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-red-500/20"
            style={{ backgroundColor: '#ef4444' }}>
            <Square size={38} fill="white" color="white" />
          </button>
          <div className="text-xs mt-4" style={{ color: '#475569' }}>Tap to stop</div>
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="What are you doing?"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            className="w-full max-w-[280px] text-center text-base bg-transparent border-b-2 pb-2 mb-7 text-white outline-none transition-colors placeholder-gray-600"
            style={{ borderColor: selectedCat?.color ?? '#334155' }}
          />

          <div className="grid grid-cols-3 gap-2 mb-8 w-full max-w-[280px]">
            {CATEGORIES.map((cat) => {
              const sel = category === cat.name
              return (
                <button
                  key={cat.name}
                  onClick={() => setCategory(cat.name)}
                  className="flex flex-col items-center gap-0.5 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                  style={{
                    backgroundColor: sel ? cat.color + '22' : '#1e293b',
                    color: sel ? cat.color : '#64748b',
                    border: `1.5px solid ${sel ? cat.color + '66' : 'transparent'}`,
                  }}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>

          <button onClick={handleStart}
            className="w-28 h-28 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-lg"
            style={{ backgroundColor: selectedCat?.color ?? '#6366f1', boxShadow: `0 8px 30px ${selectedCat?.color ?? '#6366f1'}33` }}>
            <Play size={42} fill="white" color="white" className="ml-1" />
          </button>
          <div className="text-xs mt-4" style={{ color: '#475569' }}>Tap to start</div>
        </>
      )}
    </div>
  )
}
