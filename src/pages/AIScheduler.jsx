import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Calendar, Clock, Download, ArrowLeft, Brain, Zap, Coffee, Sun, RefreshCw, CalendarDays, CheckCircle2, AlertTriangle, Target } from 'lucide-react'
import { getOperations, getObjectivesByOperation, getTasksByOperation } from '../lib/data'

export default function AIScheduler() {
  const [tasks, setTasks] = useState([])
  const [objectives, setObjectives] = useState([])
  const [operations, setOperations] = useState([])
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState(null)
  
  // User preferences
  const [preferences, setPreferences] = useState({
    workStart: '09:00',
    workEnd: '17:00',
    focusTime: 'morning',
    lunchStart: '12:00',
    lunchDuration: 60,
    maxTasksPerDay: 6,
    bufferBetweenTasks: 10,
    scheduleDays: 5,
  })

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const ops = await getOperations()
      setOperations(ops)
      
      let allTasks = []
      let allObjectives = []

      for (const op of ops) {
        const [opTasks, opObjs] = await Promise.all([
          getTasksByOperation(op.id),
          getObjectivesByOperation(op.id)
        ])
        
        allTasks = [...allTasks, ...opTasks.map(t => ({ 
          ...t, 
          operationName: op.name, 
          operationCode: op.code 
        }))]
        allObjectives = [...allObjectives, ...opObjs]
      }

      const incompleteTasks = allTasks.filter(t => t.status !== 'complete')
      setTasks(incompleteTasks)
      setObjectives(allObjectives)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const getObjectiveName = (objId) => objectives.find(o => o.id === objId)?.name || ''

  const generateSchedule = () => {
    if (tasks.length === 0) return

    // Parse work hours
    const [startHour, startMin] = preferences.workStart.split(':').map(Number)
    const [endHour, endMin] = preferences.workEnd.split(':').map(Number)
    const [lunchHour, lunchMin] = preferences.lunchStart.split(':').map(Number)
    const workMinutesPerDay = (endHour * 60 + endMin) - (startHour * 60 + startMin) - preferences.lunchDuration

    // Sort tasks by priority and due date
    const sortedTasks = [...tasks].sort((a, b) => {
      // Overdue tasks first
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const aOverdue = a.due_date && new Date(a.due_date) < today
      const bOverdue = b.due_date && new Date(b.due_date) < today
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1

      // Then by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      const aPriority = priorityOrder[a.priority] ?? 1
      const bPriority = priorityOrder[b.priority] ?? 1
      if (aPriority !== bPriority) return aPriority - bPriority

      // Then by due date
      if (a.due_date && b.due_date) {
        return new Date(a.due_date) - new Date(b.due_date)
      }
      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && b.due_date) return 1

      return 0
    })

    // Generate days
    const days = []
    const startDate = new Date()
    
    for (let i = 0; i < preferences.scheduleDays; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) {
        continue
      }

      days.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-AU', { weekday: 'long' }),
        tasks: [],
        totalMinutes: 0,
      })
    }

    // Assign tasks to days
    const scheduledTaskIds = new Set()
    const unscheduledTasks = []

    // Helper to add minutes to time string
    const addMinutes = (timeStr, mins) => {
      const [h, m] = timeStr.split(':').map(Number)
      const totalMins = h * 60 + m + mins
      const newH = Math.floor(totalMins / 60)
      const newM = totalMins % 60
      return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
    }

    // Helper to check if time is during lunch
    const isDuringLunch = (timeStr, duration) => {
      const [h, m] = timeStr.split(':').map(Number)
      const taskStart = h * 60 + m
      const taskEnd = taskStart + duration
      const lunchStart = lunchHour * 60 + lunchMin
      const lunchEnd = lunchStart + preferences.lunchDuration
      return (taskStart < lunchEnd && taskEnd > lunchStart)
    }

    // Schedule high priority tasks in focus time
    for (const task of sortedTasks) {
      if (scheduledTaskIds.has(task.id)) continue

      const taskDuration = (task.estimated_minutes || 30) + preferences.bufferBetweenTasks
      let scheduled = false

      // Try to find a slot
      for (const day of days) {
        if (day.tasks.length >= preferences.maxTasksPerDay) continue
        if (day.totalMinutes + taskDuration > workMinutesPerDay) continue

        // Calculate start time
        let currentTime = preferences.workStart
        
        // If focus time is morning and task is high priority, schedule early
        if (preferences.focusTime === 'morning' && task.priority === 'high') {
          // Find first available morning slot
          for (const existingTask of day.tasks) {
            const existingEnd = existingTask.endTime
            if (existingEnd > currentTime) {
              currentTime = existingEnd
            }
          }
        } else if (preferences.focusTime === 'afternoon' && task.priority === 'high') {
          // Start after lunch for high priority afternoon focus
          currentTime = addMinutes(preferences.lunchStart, preferences.lunchDuration)
        } else {
          // Find next available slot
          for (const existingTask of day.tasks) {
            const existingEnd = existingTask.endTime
            if (existingEnd > currentTime) {
              currentTime = existingEnd
            }
          }
        }

        // Skip lunch if task would overlap
        if (isDuringLunch(currentTime, task.estimated_minutes || 30)) {
          currentTime = addMinutes(preferences.lunchStart, preferences.lunchDuration)
        }

        // Check if task fits before end of day
        const [currentH, currentM] = currentTime.split(':').map(Number)
        const taskEndMins = currentH * 60 + currentM + (task.estimated_minutes || 30)
        const workEndMins = endHour * 60 + endMin

        if (taskEndMins <= workEndMins) {
          const endTime = addMinutes(currentTime, task.estimated_minutes || 30)
          
          day.tasks.push({
            time: currentTime,
            endTime: endTime,
            task: task.name,
            taskId: task.id,
            operation: task.operationCode,
            operationName: task.operationName,
            objective: getObjectiveName(task.objective_id),
            priority: task.priority || 'medium',
            estimatedMinutes: task.estimated_minutes || 30,
            dueDate: task.due_date,
          })

          // Sort tasks by time
          day.tasks.sort((a, b) => {
            const [aH, aM] = a.time.split(':').map(Number)
            const [bH, bM] = b.time.split(':').map(Number)
            return (aH * 60 + aM) - (bH * 60 + bM)
          })

          day.totalMinutes += taskDuration
          scheduledTaskIds.add(task.id)
          scheduled = true
          break
        }
      }

      if (!scheduled) {
        unscheduledTasks.push(task.name)
      }
    }

    // Calculate focus blocks per day
    days.forEach(day => {
      day.focusBlocks = day.tasks.filter(t => t.priority === 'high').length
    })

    // Generate recommendations
    const recommendations = []
    
    const overloadedDays = days.filter(d => d.tasks.length >= preferences.maxTasksPerDay)
    if (overloadedDays.length > 0) {
      recommendations.push(`${overloadedDays.length} day(s) are at max capacity. Consider spreading tasks out.`)
    }

    const highPriorityCount = tasks.filter(t => t.priority === 'high').length
    if (highPriorityCount > 5) {
      recommendations.push(`You have ${highPriorityCount} high-priority tasks. Consider re-prioritizing some.`)
    }

    const tasksWithoutDates = tasks.filter(t => !t.due_date).length
    if (tasksWithoutDates > 0) {
      recommendations.push(`${tasksWithoutDates} task(s) have no due date. Add due dates for better scheduling.`)
    }

    if (unscheduledTasks.length > 0) {
      recommendations.push(`${unscheduledTasks.length} task(s) couldn't fit. Consider extending your schedule or reducing task estimates.`)
    }

    setSchedule({
      schedule: days,
      summary: {
        totalTasks: tasks.length,
        scheduledTasks: scheduledTaskIds.size,
        unscheduledTasks,
        recommendations,
        totalHours: Math.round(days.reduce((sum, d) => sum + d.totalMinutes, 0) / 60),
      }
    })
  }

  const exportToOutlook = () => {
    if (!schedule) return

    const events = schedule.schedule.flatMap(day => 
      day.tasks.map(task => {
        // Parse the date and time properly
        const [year, month, dayNum] = day.date.split('-').map(Number)
        const [startH, startM] = task.time.split(':').map(Number)
        const [endH, endM] = task.endTime.split(':').map(Number)
        
        // Create dates in local time, then convert to UTC for ICS
        const startDate = new Date(year, month - 1, dayNum, startH, startM)
        const endDate = new Date(year, month - 1, dayNum, endH, endM)
        
        const formatICSDate = (date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        }
        
        return `BEGIN:VEVENT
UID:${task.taskId}-${day.date}@atlas
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:[${task.operation}] ${task.task}
DESCRIPTION:Operation: ${task.operationName}\\nObjective: ${task.objective}\\nPriority: ${task.priority}\\nEstimated: ${task.estimatedMinutes} minutes
STATUS:NEEDS-ACTION
END:VEVENT`
      })
    ).join('\n')

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ATLAS Strategic Command//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:ATLAS Schedule
${events}
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atlas-schedule-${new Date().toISOString().split('T')[0]}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
      <div className="flex items-center gap-4">
        <Link to="/tasks" className="p-2 text-text-muted hover:text-text-primary hover:bg-tactical-hover rounded transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-cyber-cyan" />
            Smart Scheduler
          </h1>
          <p className="text-text-muted text-sm mt-1">Optimize your work schedule automatically</p>
        </div>
      </div>

      {/* Task Summary */}
      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-cyber-cyan" />
            <span className="font-medium">{tasks.length} tasks to schedule</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-cyber-red" />
              {tasks.filter(t => t.priority === 'high').length} high priority
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-cyber-amber" />
              {tasks.filter(t => t.due_date).length} with due dates
            </span>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyber-amber" />
          Your Work Preferences
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Working Hours */}
          <div>
            <label className="text-xs text-text-muted font-mono block mb-1">WORKING HOURS</label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={preferences.workStart}
                onChange={(e) => setPreferences({ ...preferences, workStart: e.target.value })}
                className="input py-1 text-sm flex-1"
              />
              <span className="text-text-muted">to</span>
              <input
                type="time"
                value={preferences.workEnd}
                onChange={(e) => setPreferences({ ...preferences, workEnd: e.target.value })}
                className="input py-1 text-sm flex-1"
              />
            </div>
          </div>

          {/* Focus Time */}
          <div>
            <label className="text-xs text-text-muted font-mono block mb-1">
              <Sun className="w-3 h-3 inline mr-1" />
              FOCUS TIME (HIGH PRIORITY)
            </label>
            <select
              value={preferences.focusTime}
              onChange={(e) => setPreferences({ ...preferences, focusTime: e.target.value })}
              className="input py-1 text-sm w-full"
            >
              <option value="morning">Morning (before lunch)</option>
              <option value="afternoon">Afternoon (after lunch)</option>
              <option value="mixed">Mixed throughout day</option>
            </select>
          </div>

          {/* Lunch */}
          <div>
            <label className="text-xs text-text-muted font-mono block mb-1">
              <Coffee className="w-3 h-3 inline mr-1" />
              LUNCH BREAK
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={preferences.lunchStart}
                onChange={(e) => setPreferences({ ...preferences, lunchStart: e.target.value })}
                className="input py-1 text-sm flex-1"
              />
              <select
                value={preferences.lunchDuration}
                onChange={(e) => setPreferences({ ...preferences, lunchDuration: parseInt(e.target.value) })}
                className="input py-1 text-sm"
              >
                <option value={30}>30m</option>
                <option value={45}>45m</option>
                <option value={60}>1h</option>
                <option value={90}>1.5h</option>
              </select>
            </div>
          </div>

          {/* Schedule Days */}
          <div>
            <label className="text-xs text-text-muted font-mono block mb-1">
              <Calendar className="w-3 h-3 inline mr-1" />
              DAYS TO SCHEDULE
            </label>
            <select
              value={preferences.scheduleDays}
              onChange={(e) => setPreferences({ ...preferences, scheduleDays: parseInt(e.target.value) })}
              className="input py-1 text-sm w-full"
            >
              <option value={1}>Today only</option>
              <option value={3}>Next 3 days</option>
              <option value={5}>Next 5 days (work week)</option>
              <option value={7}>Next 7 days</option>
              <option value={10}>Next 10 days</option>
            </select>
          </div>

          {/* Max Tasks */}
          <div>
            <label className="text-xs text-text-muted font-mono block mb-1">MAX TASKS PER DAY</label>
            <select
              value={preferences.maxTasksPerDay}
              onChange={(e) => setPreferences({ ...preferences, maxTasksPerDay: parseInt(e.target.value) })}
              className="input py-1 text-sm w-full"
            >
              <option value={4}>4 (light day)</option>
              <option value={6}>6 (moderate)</option>
              <option value={8}>8 (productive)</option>
              <option value={10}>10 (intensive)</option>
              <option value={12}>12 (maximum)</option>
            </select>
          </div>

          {/* Buffer */}
          <div>
            <label className="text-xs text-text-muted font-mono block mb-1">BUFFER BETWEEN TASKS</label>
            <select
              value={preferences.bufferBetweenTasks}
              onChange={(e) => setPreferences({ ...preferences, bufferBetweenTasks: parseInt(e.target.value) })}
              className="input py-1 text-sm w-full"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={generateSchedule}
            disabled={tasks.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Schedule</span>
          </button>
          
          {tasks.length === 0 && (
            <p className="text-sm text-text-muted">Add tasks to get started</p>
          )}
        </div>
      </div>

      {/* Generated Schedule */}
      {schedule && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-cyber-green" />
              Your Optimized Schedule
            </h2>
            <div className="flex gap-2">
              <button
                onClick={generateSchedule}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
              <button
                onClick={exportToOutlook}
                className="btn-primary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export to Outlook
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="card p-4 bg-cyber-cyan/10 border-cyber-cyan">
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-cyber-green" />
                <strong>{schedule.summary.scheduledTasks}</strong> tasks scheduled
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-cyber-cyan" />
                <strong>{schedule.summary.totalHours}</strong> hours of work
              </span>
              {schedule.summary.unscheduledTasks?.length > 0 && (
                <span className="flex items-center gap-1 text-cyber-amber">
                  <AlertTriangle className="w-4 h-4" />
                  <strong>{schedule.summary.unscheduledTasks.length}</strong> couldn't fit
                </span>
              )}
            </div>
            
            {schedule.summary.recommendations?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-cyber-cyan/30">
                <p className="text-xs font-mono text-text-muted mb-1">RECOMMENDATIONS</p>
                <ul className="text-sm text-text-secondary space-y-1">
                  {schedule.summary.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-cyber-cyan">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Daily Schedules */}
          {schedule.schedule?.map((day, dayIndex) => (
            <div key={dayIndex} className="card overflow-hidden">
              <div className="p-4 bg-tactical-panel border-b border-tactical-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{day.dayName}</h3>
                    <p className="text-xs text-text-muted font-mono">{day.date}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text-muted">
                    <span>{day.tasks?.length || 0} tasks</span>
                    <span>•</span>
                    <span>{Math.round((day.totalMinutes || 0) / 60 * 10) / 10}h work</span>
                    {day.focusBlocks > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-cyber-red">{day.focusBlocks} high priority</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-4 space-y-2">
                {day.tasks?.length === 0 ? (
                  <p className="text-text-muted text-sm py-4 text-center">No tasks scheduled — free day!</p>
                ) : (
                  day.tasks?.map((task, taskIndex) => (
                    <div 
                      key={taskIndex}
                      className={`flex items-center gap-3 p-3 rounded-lg bg-tactical-bg border-l-4 ${
                        task.priority === 'high' ? 'border-cyber-red' :
                        task.priority === 'medium' ? 'border-cyber-amber' :
                        'border-cyber-green'
                      }`}
                    >
                      <div className="text-center min-w-[70px]">
                        <p className="text-sm font-mono text-cyber-cyan">{task.time}</p>
                        <p className="text-xs text-text-muted font-mono">{task.endTime}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.task}</p>
                        <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                          <span className="text-cyber-cyan font-mono">{task.operation}</span>
                          {task.objective && (
                            <>
                              <span>→</span>
                              <span className="truncate">{task.objective}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded ${
                          task.priority === 'high' ? 'bg-cyber-red/20 text-cyber-red' :
                          task.priority === 'medium' ? 'bg-cyber-amber/20 text-cyber-amber' :
                          'bg-cyber-green/20 text-cyber-green'
                        }`}>
                          {task.priority}
                        </span>
                        <p className="text-xs text-text-muted mt-1">{task.estimatedMinutes}m</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          {/* Unscheduled Tasks */}
          {schedule.summary.unscheduledTasks?.length > 0 && (
            <div className="card p-4 border-cyber-amber bg-cyber-amber/5">
              <h3 className="font-medium flex items-center gap-2 text-cyber-amber mb-3">
                <AlertTriangle className="w-4 h-4" />
                Couldn't Fit ({schedule.summary.unscheduledTasks.length})
              </h3>
              <ul className="text-sm text-text-muted space-y-1">
                {schedule.summary.unscheduledTasks.map((task, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-cyber-amber">•</span>
                    {task}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-text-muted mt-3">
                Try increasing schedule days, max tasks per day, or reducing estimated task times.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {tasks.length === 0 && (
        <div className="card p-8 text-center">
          <Target className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">No tasks to schedule</h3>
          <p className="text-text-muted mb-4">Add tasks to your operations first, then come back to generate your schedule.</p>
          <Link to="/tasks" className="btn-primary">
            Go to Tasks
          </Link>
        </div>
      )}
    </div>
  )
}
