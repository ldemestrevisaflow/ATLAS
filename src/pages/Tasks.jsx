import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, Calendar, Clock, Flag, Filter, Sparkles, Download, ChevronDown, AlertTriangle, Target, FileText, FileSpreadsheet, CalendarDays } from 'lucide-react'
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
  const navigate = useNavigate()
  const [operations, setOperations] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [objectives, setObjectives] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [operationFilter, setOperationFilter] = useState('all')
  const [showExportMenu, setShowExportMenu] = useState(false)

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
    if (filter !== 'all' && task.status === 'complete') return false
    if (filter === 'today' && !isToday(task.due_date)) return false
    if (filter === 'week' && !isThisWeek(task.due_date)) return false
    if (filter === 'overdue' && !isOverdue(task.due_date)) return false
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
    if (operationFilter !== 'all' && task.operation_id !== operationFilter) return false
    return true
  })

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === 'complete' && b.status !== 'complete') return 1
    if (a.status !== 'complete' && b.status === 'complete') return -1
    const aOverdue = isOverdue(a.due_date)
    const bOverdue = isOverdue(b.due_date)
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date)
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
  })

  // Export functions
  const exportToCSV = () => {
    const headers = ['Task', 'Operation', 'Objective', 'Status', 'Priority', 'Due Date', 'Estimated Minutes']
    const rows = sortedTasks.map(task => [
      task.name,
      task.operationCode || '',
      getObjectiveName(task.objective_id),
      task.status,
      task.priority || 'medium',
      task.due_date || '',
      task.estimated_minutes || 30
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atlas-tasks-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  const exportToICS = () => {
    const tasksWithDates = sortedTasks.filter(t => t.due_date && t.status !== 'complete')
    
    if (tasksWithDates.length === 0) {
      alert('No tasks with due dates to export. Add due dates to your tasks first!')
      return
    }

    const formatICSDate = (dateStr, timeStr) => {
      const date = new Date(dateStr)
      if (timeStr) {
        const [hours, minutes] = timeStr.split(':')
        date.setHours(parseInt(hours), parseInt(minutes))
      } else {
        date.setHours(9, 0)
      }
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const events = tasksWithDates.map(task => {
      const startDate = formatICSDate(task.due_date, task.scheduled_time)
      const endDate = new Date(new Date(task.due_date).getTime() + (task.estimated_minutes || 30) * 60000)
      const endDateStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const uid = `${task.id}@atlas`
      
      return `BEGIN:VEVENT
UID:${uid}
DTSTART:${startDate}
DTEND:${endDateStr}
SUMMARY:[${task.operationCode}] ${task.name}
DESCRIPTION:Operation: ${task.operationName}\\nObjective: ${getObjectiveName(task.objective_id)}\\nPriority: ${task.priority || 'medium'}
STATUS:${task.status === 'complete' ? 'COMPLETED' : 'NEEDS-ACTION'}
END:VEVENT`
    }).join('\n')

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ATLAS//Strategic Command//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events}
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atlas-tasks-${new Date().toISOString().split('T')[0]}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  const exportToDocx = () => {
    const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ATLAS Tasks Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { color: #00d4ff; border-bottom: 2px solid #00d4ff; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    .meta { color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #0d1117; color: #00d4ff; text-align: left; padding: 12px; border: 1px solid #2a3540; }
    td { padding: 10px; border: 1px solid #ddd; vertical-align: top; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .priority-high { color: #ff3d5a; font-weight: bold; }
    .priority-medium { color: #f59e0b; }
    .priority-low { color: #00ff9d; }
    .status-complete { text-decoration: line-through; color: #999; }
    .overdue { color: #ff3d5a; font-weight: bold; }
  </style>
</head>
<body>
  <h1>ATLAS Tasks Report</h1>
  <p class="meta">Generated: ${today} | Total Tasks: ${sortedTasks.length}</p>
  
  <h2>Task List</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30%">Task</th>
        <th style="width: 15%">Operation</th>
        <th style="width: 20%">Objective</th>
        <th style="width: 10%">Priority</th>
        <th style="width: 12%">Due Date</th>
        <th style="width: 8%">Time</th>
        <th style="width: 5%">Status</th>
      </tr>
    </thead>
    <tbody>
      ${sortedTasks.map(task => {
        const priorityClass = `priority-${task.priority || 'medium'}`
        const statusClass = task.status === 'complete' ? 'status-complete' : ''
        const overdueClass = isOverdue(task.due_date) && task.status !== 'complete' ? 'overdue' : ''
        const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
        const estTime = task.estimated_minutes ? `${task.estimated_minutes}m` : '30m'
        
        return `
          <tr class="${statusClass}">
            <td>${task.name}</td>
            <td>${task.operationCode || '-'}</td>
            <td>${getObjectiveName(task.objective_id) || '-'}</td>
            <td class="${priorityClass}">${(task.priority || 'medium').toUpperCase()}</td>
            <td class="${overdueClass}">${dueDate}</td>
            <td>${estTime}</td>
            <td>${task.status === 'complete' ? '✓' : '○'}</td>
          </tr>
        `
      }).join('')}
    </tbody>
  </table>
  
  <h2>Summary by Operation</h2>
  <table>
    <thead>
      <tr>
        <th>Operation</th>
        <th>Total Tasks</th>
        <th>Completed</th>
        <th>Pending</th>
        <th>Overdue</th>
      </tr>
    </thead>
    <tbody>
      ${operations.map(op => {
        const opTasks = sortedTasks.filter(t => t.operation_id === op.id)
        const completed = opTasks.filter(t => t.status === 'complete').length
        const pending = opTasks.filter(t => t.status !== 'complete').length
        const overdue = opTasks.filter(t => t.status !== 'complete' && isOverdue(t.due_date)).length
        return `
          <tr>
            <td><strong>${op.code}</strong> - ${op.name}</td>
            <td>${opTasks.length}</td>
            <td>${completed}</td>
            <td>${pending}</td>
            <td class="${overdue > 0 ? 'overdue' : ''}">${overdue}</td>
          </tr>
        `
      }).join('')}
    </tbody>
  </table>
</body>
</html>`

    const blob = new Blob([htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atlas-tasks-${new Date().toISOString().split('T')[0]}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

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
          <button 
            onClick={() => navigate('/ai-scheduler')}
            className="btn-primary flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Schedule</span>
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-tactical-panel border border-tactical-border rounded-lg shadow-lg z-10">
                <button 
                  onClick={exportToCSV}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-tactical-hover transition-colors rounded-t-lg flex items-center gap-3"
                >
                  <FileSpreadsheet className="w-4 h-4 text-cyber-green" />
                  <div>
                    <p className="font-medium">Export to CSV</p>
                    <p className="text-xs text-text-muted">Open in Excel</p>
                  </div>
                </button>
                <button 
                  onClick={exportToDocx}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-tactical-hover transition-colors flex items-center gap-3 border-t border-tactical-border"
                >
                  <FileText className="w-4 h-4 text-cyber-cyan" />
                  <div>
                    <p className="font-medium">Export to Word</p>
                    <p className="text-xs text-text-muted">Formatted report</p>
                  </div>
                </button>
                <button 
                  onClick={exportToICS}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-tactical-hover transition-colors rounded-b-lg flex items-center gap-3 border-t border-tactical-border"
                >
                  <CalendarDays className="w-4 h-4 text-cyber-amber" />
                  <div>
                    <p className="font-medium">Export to Outlook</p>
                    <p className="text-xs text-text-muted">Calendar events (.ics)</p>
                  </div>
                </button>
              </div>
            )}
          </div>
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
