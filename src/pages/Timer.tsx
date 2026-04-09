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
    const activityLabel = label.trim() || category
    await startActivity(activityLabel, category)
    setLabel('')
  }

  const handleStop = async () => {
    if (running?.id) await stopActivity(running.id)
  }

  const runningCat = CATEGORIES.find(c => c.name === running?.category)

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 pb-24">
      {/* Duration display */}
      <div
        className="font-mono font-light tracking-tight mb-6"
        style={{
          fontSize: running ? '5rem' : '4.5rem',
          color: running ? '#22c55e' : '#334155',
        }}
      >
        {formatDuration(elapsed)}
      </div>

      {running ? (
        <>
          <div className="text-2xl mb-1 font-medium flex items-center gap-2">
            <span>{runningCat?.icon}</span>
            <span>{running.label}</span>
          </div>
          <div
            className="text-sm px-4 py-1 rounded-full mb-10"
            style={{
              backgroundColor: (runningCat?.color ?? '#64748b') + '22',
              color: runningCat?.color ?? '#64748b',
            }}
          >
            {running.category}
          </div>
          <button
            onClick={handleStop}
            className="w-32 h-32 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-xl"
            style={{ backgroundColor: '#ef4444' }}
          >
            <Square size={44} fill="white" color="white" />
          </button>
          <div className="text-sm mt-5 font-medium" style={{ color: '#94a3b8' }}>
            Tap to stop
          </div>
        </>
      ) : (
        <>
          {/* Label input */}
          <input
            type="text"
            placeholder="What are you doing?"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            className="w-full max-w-xs text-center text-lg bg-transparent border-b-2 pb-2 mb-8 text-white outline-none transition-colors"
            style={{ borderColor: CATEGORIES.find(c => c.name === category)?.color ?? '#475569' }}
          />

          {/* Category picker */}
          <div className="grid grid-cols-3 gap-3 mb-10 w-full max-w-xs">
            {CATEGORIES.map((cat) => {
              const selected = category === cat.name
              return (
                <button
                  key={cat.name}
                  onClick={() => setCategory(cat.name)}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
                  style={{
                    backgroundColor: selected ? cat.color + '33' : '#1e293b',
                    color: selected ? cat.color : '#94a3b8',
                    border: `2px solid ${selected ? cat.color : 'transparent'}`,
                  }}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            className="w-32 h-32 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-xl"
            style={{ backgroundColor: CATEGORIES.find(c => c.name === category)?.color ?? '#6366f1' }}
          >
            <Play size={48} fill="white" color="white" className="ml-1" />
          </button>
          <div className="text-sm mt-5 font-medium" style={{ color: '#94a3b8' }}>
            Tap to start
          </div>
        </>
      )}
    </div>
  )
}
