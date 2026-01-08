import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Target, Calendar, CheckCircle2, Clock, AlertTriangle, Trash2 } from 'lucide-react'
import { getOperations, deleteOperation, getOperationStats } from '../lib/data'

export default function Dashboard() {
  const [operations, setOperations] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { loadOperations() }, [])

  const loadOperations = async () => {
    try {
      setLoading(true)
      const ops = await getOperations()
      setOperations(ops)
      const statsMap = {}
      for (const op of ops) {
        statsMap[op.id] = await getOperationStats(op.id)
      }
      setStats(statsMap)
    } catch (error) {
      console.error('Failed to load operations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteOperation(id)
      setOperations(operations.filter(op => op.id !== id))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted font-mono text-sm">LOADING...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Operations Dashboard</h1>
          <p className="text-text-muted text-sm mt-1">Manage your tactical operations</p>
        </div>
        <Link to="/operation/new" className="btn-primary flex items-center gap-2 w-fit">
          <Plus className="w-4 h-4" />
          <span>New Operation</span>
        </Link>
      </div>

      {operations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyber-cyan/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-cyber-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold">{operations.length}</p>
                <p className="text-xs text-text-muted font-mono">OPERATIONS</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyber-green/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-cyber-green" />
              </div>
              <div>
                <p className="text-2xl font-bold">{operations.filter(op => op.status === 'complete').length}</p>
                <p className="text-xs text-text-muted font-mono">COMPLETE</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyber-cyan/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-cyber-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold">{operations.filter(op => op.status === 'active').length}</p>
                <p className="text-xs text-text-muted font-mono">ACTIVE</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyber-amber/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-cyber-amber" />
              </div>
              <div>
                <p className="text-2xl font-bold">{operations.filter(op => op.status === 'planning').length}</p>
                <p className="text-xs text-text-muted font-mono">PLANNING</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {operations.length === 0 ? (
        <div className="card p-12 text-center">
          <Target className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Operations Yet</h2>
          <p className="text-text-muted mb-6">Create your first operation to get started</p>
          <Link to="/operation/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Create Operation</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {operations.map((op) => {
            const opStats = stats[op.id] || {}
            return (
              <div key={op.id} className="card-hover group relative">
                <Link to={`/operation/${op.id}`} className="block p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-mono font-medium status-${op.status}`}>
                      {op.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                    <span className="text-xs text-text-muted font-mono">{op.code || 'OP-001'}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-1 group-hover:text-cyber-cyan transition-colors">{op.name}</h3>
                  <p className="text-sm text-text-secondary line-clamp-2 mb-4">{op.description || 'No description'}</p>
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-text-muted font-mono">PROGRESS</span>
                      <span className="text-cyber-cyan font-mono">{opStats.progress || 0}%</span>
                    </div>
                    <div className="h-2 bg-tactical-bg rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-green" style={{ width: `${opStats.progress || 0}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold">{opStats.totalObjectives || 0}</p>
                      <p className="text-[10px] text-text-muted font-mono">OBJECTIVES</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-cyber-green">{opStats.completedObjectives || 0}</p>
                      <p className="text-[10px] text-text-muted font-mono">COMPLETE</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{opStats.totalTasks || 0}</p>
                      <p className="text-[10px] text-text-muted font-mono">TASKS</p>
                    </div>
                  </div>
                </Link>
                <button 
                  onClick={(e) => { e.preventDefault(); setDeleteConfirm(op.id) }} 
                  className="absolute top-4 right-4 p-2 text-text-muted hover:text-cyber-red opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {deleteConfirm === op.id && (
                  <div className="absolute inset-0 bg-tactical-panel/95 rounded-lg flex items-center justify-center p-4">
                    <div className="text-center">
                      <p className="mb-4">Delete this operation?</p>
                      <div className="flex gap-3 justify-center">
                        <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
                        <button onClick={() => handleDelete(op.id)} className="btn-danger">Delete</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
