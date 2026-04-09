import { useState } from 'react'
import { startActivity, stopActivity, CATEGORIES } from '../db'
import { useRunningActivity, useElapsed, formatDuration } from '../hooks'
import { Play, Square } from 'lucide-react'

export default function Timer() {
  const running = useRunningActivity()
  const elapsed = useElapsed(running?.startTime ?? null)
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('Work')

  const handleStart = async () => {
    const activityLabel = label.trim() || category
    await startActivity(activityLabel, category)
    setLabel('')
  }

  const handleStop = async () => {
    if (running?.id) await stopActivity(running.id)
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 pb-24">
      {/* Duration display */}
      <div className="text-7xl font-mono font-light tracking-tight mb-8" style={{ color: running ? '#22c55e' : '#94a3b8' }}>
        {formatDuration(elapsed)}
      </div>

      {running ? (
        /* Running state */
        <>
          <div className="text-xl mb-2 font-medium">{running.label}</div>
          <div
            className="text-sm px-3 py-1 rounded-full mb-10"
            style={{ backgroundColor: CATEGORIES.find(c => c.name === running.category)?.color + '33', color: CATEGORIES.find(c => c.name === running.category)?.color }}
          >
            {running.category}
          </div>
          <button
            onClick={handleStop}
            className="w-28 h-28 rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{ backgroundColor: '#ef4444' }}
          >
            <Square size={40} fill="white" color="white" />
          </button>
          <div className="text-sm mt-4" style={{ color: '#94a3b8' }}>Tap to stop</div>
        </>
      ) : (
        /* Idle state */
        <>
          {/* Label input */}
          <input
            type="text"
            placeholder="What are you doing?"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            className="w-full max-w-xs text-center text-lg bg-transparent border-b-2 border-gray-600 focus:border-indigo-400 outline-none pb-2 mb-6 text-white placeholder-gray-500"
          />

          {/* Category picker */}
          <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-sm">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setCategory(cat.name)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: category === cat.name ? cat.color + 'cc' : cat.color + '22',
                  color: category === cat.name ? 'white' : cat.color,
                  border: `1px solid ${cat.color}44`,
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            className="w-28 h-28 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg"
            style={{ backgroundColor: '#6366f1' }}
          >
            <Play size={44} fill="white" color="white" className="ml-1" />
          </button>
          <div className="text-sm mt-4" style={{ color: '#94a3b8' }}>Tap to start</div>
        </>
      )}
    </div>
  )
}
