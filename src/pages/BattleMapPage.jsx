import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Map, Target, ChevronDown, Flag, AlertTriangle } from 'lucide-react'
import { getOperations, getPhases, getObjectivesByOperation, getTasksByOperation } from '../lib/data'

const STATUS_COLORS = {
  complete: { bg: '#00ff9d', glow: 'rgba(0, 255, 157, 0.4)', text: '#0a0e12' },
  active: { bg: '#00d4ff', glow: 'rgba(0, 212, 255, 0.5)', text: '#0a0e12' },
  pending: { bg: '#2a3540', glow: 'transparent', text: '#8a9bae' },
  blocked: { bg: '#ff3d5a', glow: 'rgba(255, 61, 90, 0.4)', text: '#0a0e12' },
}

export default function BattleMapPage() {
  const [operations, setOperations] = useState([])
  const [selectedOpId, setSelectedOpId] = useState(null)
  const [phases, setPhases] = useState([])
  const [objectives, setObjectives] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMap, setLoadingMap] = useState(false)

  useEffect(() => {
    loadOperations()
  }, [])

  useEffect(() => {
    if (selectedOpId) {
      loadOperationData(selectedOpId)
    }
  }, [selectedOpId])

  const loadOperations = async () => {
    try {
      setLoading(true)
      const ops = await getOperations()
      setOperations(ops)
      if (ops.length > 0) {
        setSelectedOpId(ops[0].id)
      }
    } catch (error) {
      console.error('Failed to load operations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadOperationData = async (opId) => {
    try {
      setLoadingMap(true)
      const [phs, objs, tsks] = await Promise.all([
        getPhases(opId),
        getObjectivesByOperation(opId),
        getTasksByOperation(opId)
      ])
      setPhases(phs)
      setObjectives(objs)
      setTasks(tsks)
    } catch (error) {
      console.error('Failed to load operation data:', error)
    } finally {
      setLoadingMap(false)
    }
  }

  const selectedOperation = operations.find(o => o.id === selectedOpId)

  // Build waypoints from TASKS only (grouped by phase)
  const getPhaseWaypoints = (phaseId) => {
    const phaseObjectives = objectives.filter(o => o.phase_id === phaseId)
    const waypoints = []
    
    phaseObjectives.forEach(obj => {
      const objTasks = tasks.filter(t => t.objective_id === obj.id)
      
      if (objTasks.length > 0) {
        // Add each task as a waypoint
        objTasks.forEach(task => {
          waypoints.push({
            id: task.id,
            name: task.name,
            status: task.status,
            type: 'task',
            objectiveName: obj.name,
          })
        })
      } else {
        // If no tasks, add the objective itself as a waypoint
        waypoints.push({
          id: obj.id,
          name: obj.name,
          status: obj.status,
          type: 'objective',
        })
      }
    })
    
    return waypoints
  }

  // Calculate total stats
  const allWaypoints = phases.flatMap(p => getPhaseWaypoints(p.id))
  const completedCount = allWaypoints.filter(w => w.status === 'complete').length
  const totalCount = allWaypoints.length

  // Global waypoint index counter
  let globalIndex = 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted font-mono text-sm">LOADING BATTLE MAP...</p>
        </div>
      </div>
    )
  }

  if (operations.length === 0) {
    return (
      <div className="text-center py-12">
        <Map className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Operations Yet</h2>
        <p className="text-text-muted mb-4">Create an operation to see your campaign map.</p>
        <Link to="/operation/new" className="btn-primary">+ New Operation</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Map className="w-7 h-7 text-cyber-cyan" />
            Battle Map
          </h1>
          <p className="text-text-muted text-sm mt-1">Visual campaign progress tracker</p>
        </div>
        
        {/* Operation Selector */}
        <div className="relative">
          <select
            value={selectedOpId || ''}
            onChange={(e) => setSelectedOpId(e.target.value)}
            className="input pr-10 min-w-[250px] font-medium"
          >
            {operations.map(op => (
              <option key={op.id} value={op.id}>
                {op.code} — {op.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Map Container */}
      {selectedOperation && (
        <div className="space-y-4">
          {/* Operation Header */}
          <div className="text-center mb-6">
            <p className="text-xs text-cyber-cyan font-mono tracking-widest mb-1">
              OPERATION {selectedOperation.code}
            </p>
            <h2 className="text-2xl font-bold text-gradient mb-2">{selectedOperation.name}</h2>
            <p className="text-sm text-text-muted font-mono">
              CAMPAIGN PROGRESS: {completedCount}/{totalCount} WAYPOINTS SECURED
            </p>
            
            {/* Progress Bar */}
            <div className="max-w-md mx-auto mt-4">
              <div className="h-3 bg-tactical-bg rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-green transition-all duration-500" 
                  style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }} 
                />
              </div>
            </div>
          </div>

          {loadingMap ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : phases.length === 0 ? (
            <div className="card p-12 text-center">
              <Target className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No waypoints yet</h3>
              <p className="text-text-muted mb-4">Add phases, objectives, and tasks to see your campaign map.</p>
              <Link to={`/operation/${selectedOpId}`} className="btn-primary">
                Open Operation
              </Link>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div 
                className="relative bg-tactical-bg" 
                style={{ 
                  backgroundImage: `
                    linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: '30px 30px',
                }}
              >
                {/* START Banner */}
                <div className="p-4 text-center border-b border-tactical-border">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyber-green text-tactical-bg font-mono font-bold text-sm">
                    ▶ START
                  </div>
                </div>

                {/* Phase Zones */}
                {phases.map((phase, phaseIdx) => {
                  const waypoints = getPhaseWaypoints(phase.id)
                  const phaseComplete = waypoints.length > 0 && waypoints.every(w => w.status === 'complete')
                  const phaseActive = waypoints.some(w => w.status === 'active')
                  const phaseCompletedCount = waypoints.filter(w => w.status === 'complete').length
                  
                  if (waypoints.length === 0) return null
                  
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
                      <div className="flex items-center gap-2 mb-6">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            background: phaseComplete ? '#00ff9d' : phaseActive ? '#00d4ff' : '#2a3540',
                            boxShadow: phaseActive ? '0 0 10px #00d4ff' : 'none',
                          }}
                        />
                        <span 
                          className="text-sm font-mono font-bold tracking-wider"
                          style={{ color: phaseComplete ? '#00ff9d' : phaseActive ? '#00d4ff' : '#5a6775' }}
                        >
                          {phase.code || phase.name}
                        </span>
                        <span className="text-xs text-text-muted font-mono">
                          — {phaseCompletedCount}/{waypoints.length}
                        </span>
                        {phaseComplete && <span className="text-cyber-green text-xs">✓</span>}
                      </div>

                      {/* Waypoints Row */}
                      <div className="relative">
                        {/* Connection Line */}
                        <div className="absolute top-6 left-6 right-6 h-1 bg-tactical-border" style={{ zIndex: 0 }}>
                          <div 
                            className="h-full bg-gradient-to-r from-cyber-green to-cyber-cyan transition-all duration-700"
                            style={{ 
                              width: waypoints.length > 0 ? `${(phaseCompletedCount / waypoints.length) * 100}%` : '0%',
                              boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
                            }}
                          />
                        </div>

                        {/* Waypoint Circles */}
                        <div className="flex items-start justify-around relative" style={{ zIndex: 1 }}>
                          {waypoints.map((waypoint, wpIdx) => {
                            globalIndex++
                            const currentGlobalIndex = globalIndex
                            const colors = STATUS_COLORS[waypoint.status] || STATUS_COLORS.pending
                            const isActive = waypoint.status === 'active'
                            const isComplete = waypoint.status === 'complete'
                            const isBlocked = waypoint.status === 'blocked'
                            
                            return (
                              <div 
                                key={waypoint.id} 
                                className="flex flex-col items-center"
                                style={{ minWidth: '80px', maxWidth: '120px' }}
                              >
                                {/* Waypoint Circle */}
                                <div className="relative">
                                  {/* Glow effect */}
                                  {(isActive || isComplete) && (
                                    <div 
                                      className={`absolute inset-0 rounded-full ${isActive ? 'animate-pulse' : ''}`}
                                      style={{
                                        background: colors.glow,
                                        transform: 'scale(1.6)',
                                      }}
                                    />
                                  )}
                                  
                                  {/* Main circle */}
                                  <div 
                                    className="relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300"
                                    style={{
                                      background: colors.bg,
                                      color: colors.text,
                                      boxShadow: isActive ? `0 0 20px ${colors.glow}, 0 0 40px ${colors.glow}` : 
                                                 isComplete ? `0 0 10px ${colors.glow}` : 'none',
                                      border: isActive ? '3px solid white' : 'none',
                                    }}
                                  >
                                    {isComplete && <span className="text-lg">✓</span>}
                                    {isActive && (
                                      <div className="w-3 h-3 bg-current rounded-full animate-ping" />
                                    )}
                                    {waypoint.status === 'pending' && (
                                      <span className="font-mono text-xs">{currentGlobalIndex}</span>
                                    )}
                                    {isBlocked && <AlertTriangle className="w-5 h-5" />}
                                  </div>

                                  {/* Ping animation for active */}
                                  {isActive && (
                                    <div className="absolute inset-0 rounded-full border-2 border-cyber-cyan animate-ping" style={{ animationDuration: '1.5s' }} />
                                  )}
                                </div>

                                {/* Label */}
                                <p 
                                  className="text-xs mt-3 text-center font-mono leading-tight px-1"
                                  style={{ 
                                    color: isComplete ? '#00ff9d' : isActive ? '#00d4ff' : '#5a6775',
                                    fontWeight: isActive ? 'bold' : 'normal',
                                  }}
                                >
                                  {waypoint.name.length > 18 ? waypoint.name.slice(0, 18) + '...' : waypoint.name}
                                </p>
                                
                                {/* Objective name for tasks */}
                                {waypoint.type === 'task' && waypoint.objectiveName && (
                                  <p className="text-[10px] text-text-muted mt-1 text-center">
                                    {waypoint.objectiveName.length > 15 ? waypoint.objectiveName.slice(0, 15) + '...' : waypoint.objectiveName}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Mission Complete Banner */}
                <div className="p-6 text-center bg-tactical-panel">
                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-lg border ${completedCount === totalCount && totalCount > 0 ? 'border-cyber-green bg-cyber-green/20' : 'border-cyber-cyan bg-cyber-cyan/10'}`}>
                    <Flag className={`w-5 h-5 ${completedCount === totalCount && totalCount > 0 ? 'text-cyber-green' : 'text-cyber-cyan'}`} />
                    <span className={`font-mono font-bold tracking-wider ${completedCount === totalCount && totalCount > 0 ? 'text-cyber-green' : 'text-cyber-cyan'}`}>
                      {completedCount === totalCount && totalCount > 0 ? '🎯 MISSION COMPLETE!' : '🏁 MISSION OBJECTIVE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {/* Link to operation */}
          <div className="text-center">
            <Link 
              to={`/operation/${selectedOpId}`} 
              className="text-sm text-cyber-cyan hover:text-cyber-green transition-colors"
            >
              Open full operation view →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
