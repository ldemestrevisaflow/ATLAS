import { useMemo } from 'react'
import { Target, Flag, AlertTriangle } from 'lucide-react'

const STATUS_COLORS = {
  complete: { bg: '#00ff9d', glow: 'rgba(0, 255, 157, 0.4)', text: '#0a0e12' },
  active: { bg: '#00d4ff', glow: 'rgba(0, 212, 255, 0.5)', text: '#0a0e12' },
  pending: { bg: '#2a3540', glow: 'transparent', text: '#8a9bae' },
  blocked: { bg: '#ff3d5a', glow: 'rgba(255, 61, 90, 0.4)', text: '#0a0e12' },
}

export default function BattleMap({ operation, phases, objectives, tasks }) {
  // Build task list with phase info
  const mapData = useMemo(() => {
    const allTasks = []
    
    phases.forEach((phase, phaseIndex) => {
      const phaseObjectives = objectives.filter(o => o.phase_id === phase.id)
      
      phaseObjectives.forEach(objective => {
        const objectiveTasks = tasks.filter(t => t.objective_id === objective.id)
        
        if (objectiveTasks.length === 0) {
          // If no tasks, use objective as waypoint
          allTasks.push({
            id: objective.id,
            name: objective.name,
            status: objective.status,
            type: 'objective',
            phase: phase.name,
            phaseCode: phase.code,
            phaseIndex,
          })
        } else {
          objectiveTasks.forEach(task => {
            allTasks.push({
              id: task.id,
              name: task.name,
              status: task.status,
              type: 'task',
              objectiveName: objective.name,
              phase: phase.name,
              phaseCode: phase.code,
              phaseIndex,
            })
          })
        }
      })
    })
    
    return allTasks
  }, [phases, objectives, tasks])

  // Calculate stats
  const stats = useMemo(() => {
    const total = mapData.length
    const complete = mapData.filter(t => t.status === 'complete').length
    const activeIndex = mapData.findIndex(t => t.status === 'active')
    const currentIndex = activeIndex >= 0 ? activeIndex : complete
    const progress = total > 0 ? Math.round((complete / total) * 100) : 0
    
    return { total, complete, currentIndex, progress }
  }, [mapData])

  // Group by phase for display
  const phaseGroups = useMemo(() => {
    const groups = {}
    phases.forEach(phase => {
      groups[phase.id] = {
        ...phase,
        tasks: mapData.filter(t => t.phaseCode === phase.code),
      }
    })
    return Object.values(groups)
  }, [phases, mapData])

  // Calculate path progress
  const pathProgress = stats.total > 0 ? ((stats.currentIndex + 1) / stats.total) * 100 : 0

  if (mapData.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Target className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No waypoints yet</h3>
        <p className="text-text-muted">Add phases, objectives, and tasks to see your campaign map.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-xs text-cyber-cyan font-mono tracking-widest mb-1">
          OPERATION {operation.code}
        </p>
        <h2 className="text-2xl font-bold text-gradient mb-2">{operation.name}</h2>
        <p className="text-sm text-text-muted font-mono">
          CAMPAIGN PROGRESS: {stats.complete}/{stats.total} WAYPOINTS SECURED
        </p>
      </div>

      {/* Map Container */}
      <div className="card overflow-hidden">
        <div className="relative bg-tactical-bg" style={{ 
          backgroundImage: `
            linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }}>
          
          {/* Phase Zones */}
          {phaseGroups.map((phase, phaseIdx) => {
            const phaseComplete = phase.tasks.every(t => t.status === 'complete')
            const phaseActive = phase.tasks.some(t => t.status === 'active')
            const phaseTasks = phase.tasks
            
            if (phaseTasks.length === 0) return null
            
            return (
              <div 
                key={phase.id} 
                className="relative p-6 border-b border-tactical-border"
                style={{
                  background: phaseComplete 
                    ? 'rgba(0, 255, 157, 0.03)' 
                    : phaseActive 
                      ? 'rgba(0, 212, 255, 0.03)' 
                      : 'transparent',
                }}
              >
                {/* Phase Label */}
                <div className="flex items-center gap-2 mb-4">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: phaseComplete ? '#00ff9d' : phaseActive ? '#00d4ff' : '#2a3540',
                      boxShadow: phaseActive ? '0 0 10px #00d4ff' : 'none',
                    }}
                  />
                  <span 
                    className="text-xs font-mono font-bold tracking-wider"
                    style={{ color: phaseComplete ? '#00ff9d' : phaseActive ? '#00d4ff' : '#5a6775' }}
                  >
                    {phase.code || phase.name}
                  </span>
                  <span className="text-xs text-text-muted font-mono">
                    — {phase.tasks.filter(t => t.status === 'complete').length}/{phase.tasks.length}
                  </span>
                </div>

                {/* Task Waypoints */}
                <div className="relative">
                  {/* Connection Line */}
                  <svg 
                    className="absolute top-6 left-0 w-full h-4 pointer-events-none" 
                    style={{ zIndex: 0 }}
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id={`grad-${phase.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00ff9d" />
                        <stop offset="100%" stopColor="#00d4ff" />
                      </linearGradient>
                    </defs>
                    {/* Background line */}
                    <line 
                      x1="40" y1="8" 
                      x2={`calc(100% - 40px)`} y2="8" 
                      stroke="#2a3540" 
                      strokeWidth="3"
                      strokeDasharray="8 8"
                    />
                    {/* Progress line */}
                    <line 
                      x1="40" y1="8" 
                      x2={`calc(100% - 40px)`} y2="8" 
                      stroke={`url(#grad-${phase.id})`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      style={{
                        strokeDasharray: 1000,
                        strokeDashoffset: 1000 - (phase.tasks.filter(t => t.status === 'complete').length / phase.tasks.length) * 1000,
                        transition: 'stroke-dashoffset 0.5s ease-out',
                        filter: 'drop-shadow(0 0 4px rgba(0, 212, 255, 0.5))',
                      }}
                    />
                  </svg>

                  {/* Waypoints */}
                  <div className="flex items-start justify-between relative" style={{ zIndex: 1 }}>
                    {phaseTasks.map((task, taskIdx) => {
                      const colors = STATUS_COLORS[task.status] || STATUS_COLORS.pending
                      const isActive = task.status === 'active'
                      const isComplete = task.status === 'complete'
                      const isBlocked = task.status === 'blocked'
                      
                      return (
                        <div 
                          key={task.id} 
                          className="flex flex-col items-center"
                          style={{ flex: 1, maxWidth: '120px' }}
                        >
                          {/* Waypoint Circle */}
                          <div className="relative">
                            {/* Glow effect */}
                            {(isActive || isComplete) && (
                              <div 
                                className="absolute inset-0 rounded-full animate-pulse"
                                style={{
                                  background: colors.glow,
                                  transform: 'scale(1.8)',
                                  opacity: isActive ? 1 : 0.5,
                                }}
                              />
                            )}
                            
                            {/* Main circle */}
                            <div 
                              className="relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300"
                              style={{
                                background: colors.bg,
                                color: colors.text,
                                boxShadow: isActive ? `0 0 20px ${colors.glow}` : 'none',
                                border: isActive ? '3px solid white' : 'none',
                              }}
                            >
                              {isComplete && '✓'}
                              {isActive && (
                                <div className="w-3 h-3 bg-current rounded-full animate-ping" />
                              )}
                              {task.status === 'pending' && (
                                <span className="font-mono text-xs">
                                  {mapData.findIndex(t => t.id === task.id) + 1}
                                </span>
                              )}
                              {isBlocked && <AlertTriangle className="w-5 h-5" />}
                            </div>

                            {/* Active marker pulse rings */}
                            {isActive && (
                              <>
                                <div 
                                  className="absolute inset-0 rounded-full border-2 border-cyber-cyan animate-ping"
                                  style={{ animationDuration: '2s' }}
                                />
                              </>
                            )}
                          </div>

                          {/* Label */}
                          <p 
                            className="text-xs mt-2 text-center font-mono leading-tight max-w-[100px]"
                            style={{ 
                              color: isComplete ? '#00ff9d' : isActive ? '#00d4ff' : '#5a6775',
                              fontWeight: isActive ? 'bold' : 'normal',
                            }}
                          >
                            {task.name.length > 20 ? task.name.slice(0, 20) + '...' : task.name}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Mission Complete Banner */}
          <div className="p-6 text-center border-t border-tactical-border bg-tactical-panel">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-lg border border-cyber-cyan bg-cyber-cyan/10">
              <Flag className="w-5 h-5 text-cyber-cyan" />
              <span className="text-cyber-cyan font-mono font-bold tracking-wider">
                {stats.progress === 100 ? '🎯 MISSION COMPLETE' : '🏁 MISSION OBJECTIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-xs font-mono">
        {[
          { status: 'complete', label: 'SECURED' },
          { status: 'active', label: 'ACTIVE' },
          { status: 'pending', label: 'PENDING' },
          { status: 'blocked', label: 'BLOCKED' },
        ].map(item => (
          <div key={item.status} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ 
                background: STATUS_COLORS[item.status].bg,
                boxShadow: item.status === 'active' ? '0 0 8px #00d4ff' : 'none',
              }}
            />
            <span className="text-text-muted">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
