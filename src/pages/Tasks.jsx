import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Calendar, Clock, Flag, Filter, Sparkles, Download, ChevronDown, AlertTriangle, Target } from 'lucide-react'
import { getOperations, getObjectivesByOperation, getTasksByOperation, updateTask } from '../lib/data'

const PRIORITY_CONFIG = {
  high: { color: 'text-cyber-red', bg: 'bg-cyber-red/20', label: 'High' },
  medium: { color: 'text-cyber-amber', bg: 'bg-cyber-amber/20', label: 'Medium' },
  low: { color: 'text-cyber-green', bg: 'bg-cyber-green/20', label: 'Low' },
}

const formatDate = (dateStr) => {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

const isOverdue = (dateStr) => {
  if (!dateStr) return false
  const due = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

const isToday = (dateStr) => {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

const isThisWeek = (dateStr) => {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const today = new Date()
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)
  return date >= today && date <= weekEnd
}

export default function Tasks() {
  const [operations, setOperations] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [objectives, setObjectives] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, today, week, overdue
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [operationFilter, setOperationFilter] = useState('all')

  useEffect(() => {
    loadAllTasks()
  }, [])

  const loadAllTasks = async () => {
    try {
      setLoading(true)
      const ops = await getOperations()
      setOperations(ops)

      let tasks = []
      let objs = []

      for (const op of ops) {
        const [opTasks, opObjectives] = await Promise.all([
          getTasksByOperation(op.id),
          getObjectivesByOperation(op.id)
        ])
        
        tasks = [...tasks, ...opTasks.map(t => ({ ...t, operationName: op.name, operationCode: op.code }))]
        objs = [...objs, ...opObjectives]
      }

      setAllTasks(tasks)
      setObjectives(objs)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleComplete = async (task) => {
    const newStatus = task.status === 'complete' ? 'pending' : 'complete'
    try {
      await updateTask(task.id, { status: newStatus })
      setAllTasks(allTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await updateTask(taskId, updates)
      setAllTasks(allTasks.map(t => t.id === taskId ? { ...t, ...updates } : t))
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const getObjectiveName = (objId) => objectives.find(o => o.id === objId)?.name || ''

  // Filter tasks
  const filteredTasks = allTasks.filter(task => {
    // Status filter (exclude completed unless showing all)
    if (filter !== 'all' && task.status === 'complete') return false
    
    // Time filter
    if (filter === 'today' && !isToday(task.due_date)) return false
    if (filter === 'week' && !isThisWeek(task.due_date)) return false
    if (filter === 'overdue' && !isOverdue(task.due_date)) return false
    
    // Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
    
    // Operation filter
    if (operationFilter !== 'all' && task.operation_id !== operationFilter) return false
    
    return true
  })

  // Sort: overdue first, then by due date, then by priority
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Completed tasks at bottom
    if (a.status === 'complete' && b.status !== 'complete') return 1
    if (a.status !== 'complete' && b.status === 'complete') return -1
    
    // Overdue first
    const aOverdue = isOverdue(a.due_date)
    const bOverdue = isOverdue(b.due_date)
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    
    // Then by due date
    if (a.due_date && b.due_date) {
      return new Date(a.due_date) - new Date(b.due_date)
    }
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1
    
    // Then by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
  })

  // Stats
  const stats = {
    total: allTasks.filter(t => t.status !== 'complete').length,
    today: allTasks.filter(t => t.status !== 'complete' && isToday(t.due_date)).length,
    overdue: allTasks.filter(t => t.status !== 'complete' && isOverdue(t.due_date)).length,
    completed: allTasks.filter(t => t.status === 'complete').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted font-mono text-sm">LOADING TASKS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Tasks</h1>
          <p className="text-text-muted text-sm mt-1">All tasks across operations</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Schedule</span>
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button 
          onClick={() => setFilter('all')}
          className={`card p-4 text-left transition-all ${filter === 'all' ? 'ring-2 ring-cyber-cyan' : ''}`}
        >
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-text-muted font-mono">ACTIVE TASKS</p>
        </button>
        <button 
          onClick={() => setFilter('today')}
          className={`card p-4 text-left transition-all ${filter === 'today' ? 'ring-2 ring-cyber-cyan' : ''}`}
        >
          <p className="text-2xl font-bold text-cyber-cyan">{stats.today}</p>
          <p className="text-xs text-text-muted font-mono">DUE TODAY</p>
        </button>
        <button 
          onClick={() => setFilter('overdue')}
          className={`card p-4 text-left transition-all ${filter === 'overdue' ? 'ring-2 ring-cyber-red' : ''}`}
        >
          <p className="text-2xl font-bold text-cyber-red">{stats.overdue}</p>
          <p className="text-xs text-text-muted font-mono">OVERDUE</p>
        </button>
        <div className="card p-4">
          <p className="text-2xl font-bold text-cyber-green">{stats.completed}</p>
          <p className="text-xs text-text-muted font-mono">COMPLETED</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="input py-1 text-sm"
          >
            <option value="all">All Tasks</option>
            <option value="today">Due Today</option>
            <option value="week">This Week</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        
        <select 
          value={priorityFilter} 
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="input py-1 text-sm"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>

        <select 
          value={operationFilter} 
          onChange={(e) => setOperationFilter(e.target.value)}
          className="input py-1 text-sm"
        >
          <option value="all">All Operations</option>
          {operations.map(op => (
            <option key={op.id} value={op.id}>{op.code}</option>
          ))}
        </select>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {sortedTasks.length === 0 ? (
          <div className="card p-8 text-center">
            <Target className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">No tasks match your filters</p>
          </div>
        ) : (
          sortedTasks.map(task => {
            const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
            const overdue = isOverdue(task.due_date) && task.status !== 'complete'
            const today = isToday(task.due_date)
            
            return (
              <div 
                key={task.id} 
                className={`card p-4 transition-all ${task.status === 'complete' ? 'opacity-50' : ''} ${overdue ? 'border-l-4 border-cyber-red' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button 
                    onClick={() => handleToggleComplete(task)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {task.status === 'complete' ? (
                      <CheckCircle2 className="w-5 h-5 text-cyber-green" />
                    ) : (
                      <Circle className="w-5 h-5 text-text-muted hover:text-cyber-cyan" />
                    )}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-medium ${task.status === 'complete' ? 'line-through text-text-muted' : ''}`}>
                          {task.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Link 
                            to={`/operation/${task.operation_id}`}
                            className="text-xs text-cyber-cyan hover:text-cyber-green font-mono"
                          >
                            {task.operationCode}
                          </Link>
                          {getObjectiveName(task.objective_id) && (
                            <span className="text-xs text-text-muted">
                              → {getObjectiveName(task.objective_id)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Priority Badge */}
                      <select
                        value={task.priority || 'medium'}
                        onChange={(e) => handleUpdateTask(task.id, { priority: e.target.value })}
                        className={`text-xs px-2 py-1 rounded border-0 ${priority.bg} ${priority.color} font-medium`}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    {/* Meta Row */}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      {/* Due Date */}
                      <div className="flex items-center gap-1">
                        <Calendar className={`w-3 h-3 ${overdue ? 'text-cyber-red' : today ? 'text-cyber-cyan' : 'text-text-muted'}`} />
                        <input
                          type="date"
                          value={task.due_date || ''}
                          onChange={(e) => handleUpdateTask(task.id, { due_date: e.target.value || null })}
                          className={`bg-transparent border-0 p-0 text-xs ${overdue ? 'text-cyber-red' : today ? 'text-cyber-cyan' : 'text-text-muted'}`}
                        />
                        {overdue && <AlertTriangle className="w-3 h-3 text-cyber-red" />}
                      </div>

                      {/* Estimated Time */}
                      <div className="flex items-center gap-1 text-text-muted">
                        <Clock className="w-3 h-3" />
                        <select
                          value={task.estimated_minutes || 30}
                          onChange={(e) => handleUpdateTask(task.id, { estimated_minutes: parseInt(e.target.value) })}
                          className="bg-transparent border-0 p-0 text-xs text-text-muted"
                        >
                          <option value={15}>15m</option>
                          <option value={30}>30m</option>
                          <option value={45}>45m</option>
                          <option value={60}>1h</option>
                          <option value={90}>1.5h</option>
                          <option value={120}>2h</option>
                          <option value={180}>3h</option>
                          <option value={240}>4h</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
