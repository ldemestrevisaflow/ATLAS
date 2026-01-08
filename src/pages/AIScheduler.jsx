import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Calendar, Clock, Download, ArrowLeft, Brain, Zap, Coffee, Sun, Moon, RefreshCw, CalendarDays, CheckCircle2, AlertTriangle } from 'lucide-react'
import { getOperations, getObjectivesByOperation, getTasksByOperation } from '../lib/data'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export default function AIScheduler() {
  const [tasks, setTasks] = useState([])
  const [objectives, setObjectives] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [schedule, setSchedule] = useState(null)
  const [error, setError] = useState(null)
  
  // User preferences
  const [preferences, setPreferences] = useState({
    workStart: '09:00',
    workEnd: '17:00',
    focusTime: 'morning', // morning, afternoon, mixed
    meetingDays: ['tuesday', 'thursday'],
    breakDuration: 15,
    lunchStart: '12:00',
    lunchDuration: 60,
    maxTasksPerDay: 8,
    bufferBetweenTasks: 10,
    scheduleDays: 5, // how many days to schedule
  })

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const ops = await getOperations()
      
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

      // Filter to incomplete tasks only
      const incompleteTasks = allTasks.filter(t => t.status !== 'complete')
      setTasks(incompleteTasks)
      setObjectives(allObjectives)
    } catch (err) {
      console.error('Failed to load tasks:', err)
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const getObjectiveName = (objId) => objectives.find(o => o.id === objId)?.name || ''

  const generateSchedule = async () => {
    if (tasks.length === 0) {
      setError('No tasks to schedule. Add some tasks first!')
      return
    }

    setGenerating(true)
    setError(null)
    setSchedule(null)

    try {
      // Prepare task data for Claude
      const taskList = tasks.map(t => ({
        name: t.name,
        operation: t.operationCode,
        objective: getObjectiveName(t.objective_id),
        priority: t.priority || 'medium',
        dueDate: t.due_date || null,
        estimatedMinutes: t.estimated_minutes || 30,
      }))

      // Get date range
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + preferences.scheduleDays)

      const prompt = `You are an AI scheduling assistant. Create an optimized work schedule for the following tasks.

USER PREFERENCES:
- Working hours: ${preferences.workStart} to ${preferences.workEnd}
- Focus/deep work time preference: ${preferences.focusTime} (schedule complex/high-priority tasks during this time)
- Meeting-heavy days: ${preferences.meetingDays.join(', ')} (schedule fewer deep work tasks on these days)
- Break duration: ${preferences.breakDuration} minutes between tasks
- Lunch: ${preferences.lunchStart} for ${preferences.lunchDuration} minutes
- Maximum tasks per day: ${preferences.maxTasksPerDay}
- Buffer between tasks: ${preferences.bufferBetweenTasks} minutes

TASKS TO SCHEDULE:
${JSON.stringify(taskList, null, 2)}

SCHEDULING PERIOD:
From: ${startDate.toISOString().split('T')[0]}
To: ${endDate.toISOString().split('T')[0]}

INSTRUCTIONS:
1. Prioritize tasks with due dates - schedule them before their due date
2. Schedule high-priority tasks during focus time (${preferences.focusTime})
3. Group related tasks (same operation) together when possible
4. Don't overload any single day
5. Leave buffer time between tasks
6. Respect lunch breaks
7. On meeting-heavy days (${preferences.meetingDays.join(', ')}), schedule shorter/easier tasks

Return a JSON object with this exact structure:
{
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "Monday",
      "tasks": [
        {
          "time": "09:00",
          "endTime": "10:00",
          "task": "Task name",
          "operation": "OP-CODE",
          "priority": "high|medium|low",
          "notes": "Why scheduled here"
        }
      ],
      "totalMinutes": 240,
      "focusBlocks": 2
    }
  ],
  "summary": {
    "totalTasks": 10,
    "scheduledTasks": 8,
    "unscheduledTasks": ["task names that couldn't fit"],
    "recommendations": ["Any suggestions for the user"]
  }
}

Return ONLY the JSON object, no other text.`

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.content[0].text

      // Parse the JSON response
      const scheduleData = JSON.parse(content)
      setSchedule(scheduleData)

    } catch (err) {
      console.error('Failed to generate schedule:', err)
      setError(`Failed to generate schedule: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const exportToOutlook = () => {
    if (!schedule) return

    const events = schedule.schedule.flatMap(day => 
      day.tasks.map(task => {
        const startDateTime = new Date(`${day.date}T${task.time}:00`)
        const endDateTime = new Date(`${day.date}T${task.endTime}:00`)
        
        const formatICSDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        
        return `BEGIN:VEVENT
UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}@atlas
DTSTART:${formatICSDate(startDateTime)}
DTEND:${formatICSDate(endDateTime)}
SUMMARY:[${task.operation}] ${task.task}
DESCRIPTION:Priority: ${task.priority}\\n${task.notes || ''}
STATUS:NEEDS-ACTION
END:VEVENT`
      })
    ).join('\n')

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ATLAS AI Scheduler//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
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
            AI Scheduler
          </h1>
          <p className="text-text-muted text-sm mt-1">Let AI optimize your work schedule</p>
        </div>
      </div>

      {/* Task Summary */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
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
                className="input py-1 text-sm"
              />
              <span className="text-text-muted">to</span>
              <input
                type="time"
                value={preferences.workEnd}
                onChange={(e) => setPreferences({ ...preferences, workEnd: e.target.value })}
                className="input py-1 text-sm"
              />
            </div>
          </div>

          {/* Focus Time */}
          <div>
            <label className="text-xs text-text-muted font-mono block mb-1">
              <Sun className="w-3 h-3 inline mr-1" />
              FOCUS TIME PREFERENCE
            </label>
            <select
              value={preferences.focusTime}
              onChange={(e) => setPreferences({ ...preferences, focusTime: e.target.value })}
              className="input py-1 text-sm w-full"
            >
              <option value="morning">Morning (best for deep work)</option>
              <option value="afternoon">Afternoon</option>
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
                className="input py-1 text-sm"
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
            disabled={generating || tasks.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate AI Schedule</span>
              </>
            )}
          </button>
          
          {tasks.length === 0 && (
            <p className="text-sm text-text-muted">Add tasks with due dates for best results</p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-cyber-red bg-cyber-red/10">
          <p className="text-cyber-red">{error}</p>
        </div>
      )}

      {/* Generated Schedule */}
      {schedule && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-cyber-green" />
              Your Optimized Schedule
            </h2>
            <button
              onClick={exportToOutlook}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Outlook
            </button>
          </div>

          {/* Summary */}
          {schedule.summary && (
            <div className="card p-4 bg-cyber-cyan/10 border-cyber-cyan">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-cyber-green" />
                  {schedule.summary.scheduledTasks} tasks scheduled
                </span>
                {schedule.summary.unscheduledTasks?.length > 0 && (
                  <span className="flex items-center gap-1 text-cyber-amber">
                    <AlertTriangle className="w-4 h-4" />
                    {schedule.summary.unscheduledTasks.length} couldn't fit
                  </span>
                )}
              </div>
              {schedule.summary.recommendations?.length > 0 && (
                <div className="mt-2 text-sm text-text-muted">
                  <strong>AI Recommendations:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {schedule.summary.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Daily Schedules */}
          {schedule.schedule?.map((day, dayIndex) => (
            <div key={dayIndex} className="card overflow-hidden">
              <div className="p-4 bg-tactical-panel border-b border-tactical-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{day.dayName}</h3>
                    <p className="text-xs text-text-muted font-mono">{day.date}</p>
                  </div>
                  <div className="text-sm text-text-muted">
                    {day.tasks?.length || 0} tasks • {day.totalMinutes || 0} mins
                  </div>
                </div>
              </div>
              
              <div className="p-4 space-y-2">
                {day.tasks?.length === 0 ? (
                  <p className="text-text-muted text-sm">No tasks scheduled</p>
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
                      <div className="text-center min-w-[80px]">
                        <p className="text-sm font-mono text-cyber-cyan">{task.time}</p>
                        <p className="text-xs text-text-muted">{task.endTime}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{task.task}</p>
                        <p className="text-xs text-text-muted">
                          {task.operation} • {task.priority} priority
                        </p>
                        {task.notes && (
                          <p className="text-xs text-cyber-cyan mt-1">{task.notes}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
