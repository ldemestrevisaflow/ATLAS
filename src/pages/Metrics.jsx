import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, TrendingUp, Target, CheckCircle2, Clock, AlertTriangle, Download, FileText, ArrowRight } from 'lucide-react'
import { getOperations, getObjectivesByOperation, getTasksByOperation, getFeedbackByOperation } from '../lib/data'

export default function Metrics() {
  const [operations, setOperations] = useState([])
  const [metrics, setMetrics] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMetrics() }, [])

  const loadMetrics = async () => {
    try {
      setLoading(true)
      const ops = await getOperations()
      setOperations(ops)

      const metricsData = {
        totalOperations: ops.length,
        activeOperations: ops.filter(o => o.status === 'active').length,
        completedOperations: ops.filter(o => o.status === 'complete').length,
        planningOperations: ops.filter(o => o.status === 'planning').length,
        totalObjectives: 0,
        completedObjectives: 0,
        activeObjectives: 0,
        pendingObjectives: 0,
        blockedObjectives: 0,
        totalTasks: 0,
        completedTasks: 0,
        totalFeedback: 0,
        operationDetails: []
      }

      for (const op of ops) {
        const [objectives, tasks, feedback] = await Promise.all([
          getObjectivesByOperation(op.id),
          getTasksByOperation(op.id),
          getFeedbackByOperation(op.id)
        ])

        const completedObjs = objectives.filter(o => o.status === 'complete').length
        const completedTsks = tasks.filter(t => t.status === 'complete').length
        const progress = objectives.length > 0 ? Math.round((completedObjs / objectives.length) * 100) : 0

        metricsData.totalObjectives += objectives.length
        metricsData.completedObjectives += completedObjs
        metricsData.activeObjectives += objectives.filter(o => o.status === 'active').length
        metricsData.pendingObjectives += objectives.filter(o => o.status === 'pending').length
        metricsData.blockedObjectives += objectives.filter(o => o.status === 'blocked').length
        metricsData.totalTasks += tasks.length
        metricsData.completedTasks += completedTsks
        metricsData.totalFeedback += feedback.length

        metricsData.operationDetails.push({
          id: op.id,
          name: op.name,
          code: op.code,
          status: op.status,
          objectives: objectives.length,
          completedObjectives: completedObjs,
          tasks: tasks.length,
          completedTasks: completedTsks,
          feedback: feedback.length,
          progress
        })
      }

      metricsData.overallProgress = metricsData.totalObjectives > 0 
        ? Math.round((metricsData.completedObjectives / metricsData.totalObjectives) * 100) 
        : 0

      setMetrics(metricsData)
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    const headers = ['Operation', 'Code', 'Status', 'Objectives', 'Completed Objectives', 'Tasks', 'Completed Tasks', 'Feedback Sessions', 'Progress %']
    const rows = metrics.operationDetails?.map(op => [
      op.name,
      op.code,
      op.status,
      op.objectives,
      op.completedObjectives,
      op.tasks,
      op.completedTasks,
      op.feedback,
      op.progress
    ]) || []

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atlas-metrics-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportReport = () => {
    const report = `
ATLAS OPERATIONS REPORT
Generated: ${new Date().toLocaleString('en-AU')}
=====================================

SUMMARY
-------
Total Operations: ${metrics.totalOperations}
  - Active: ${metrics.activeOperations}
  - Complete: ${metrics.completedOperations}
  - Planning: ${metrics.planningOperations}

Total Objectives: ${metrics.totalObjectives}
  - Complete: ${metrics.completedObjectives}
  - Active: ${metrics.activeObjectives}
  - Pending: ${metrics.pendingObjectives}
  - Blocked: ${metrics.blockedObjectives}

Total Tasks: ${metrics.totalTasks}
  - Complete: ${metrics.completedTasks}

Overall Progress: ${metrics.overallProgress}%

OPERATIONS BREAKDOWN
--------------------
${metrics.operationDetails?.map(op => `
${op.name} [${op.code}]
  Status: ${op.status?.toUpperCase()}
  Progress: ${op.progress}%
  Objectives: ${op.completedObjectives}/${op.objectives} complete
  Tasks: ${op.completedTasks}/${op.tasks} complete
  Feedback Sessions: ${op.feedback}
`).join('\n') || 'No operations'}
=====================================
    `.trim()

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atlas-report-${new Date().toISOString().split('T')[0]}.txt`
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
          <p className="text-text-muted font-mono text-sm">CALCULATING METRICS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Metrics Dashboard</h1>
          <p className="text-text-muted text-sm mt-1">Performance overview across all operations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button onClick={exportReport} className="btn-primary flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-cyber-cyan/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-cyber-cyan" />
            </div>
            <div>
              <p className="text-sm text-text-muted font-mono">OVERALL PROGRESS</p>
              <p className="text-3xl font-bold text-gradient">{metrics.overallProgress}%</p>
            </div>
          </div>
        </div>
        <div className="h-4 bg-tactical-bg rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-green transition-all duration-500" 
            style={{ width: `${metrics.overallProgress}%` }} 
          />
        </div>
        <p className="text-xs text-text-muted mt-2 font-mono">
          {metrics.completedObjectives} of {metrics.totalObjectives} objectives complete
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyber-cyan/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-cyber-cyan" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.totalOperations}</p>
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
              <p className="text-2xl font-bold text-cyber-green">{metrics.completedObjectives}</p>
              <p className="text-xs text-text-muted font-mono">OBJECTIVES DONE</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyber-cyan/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-cyber-cyan" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.completedTasks}/{metrics.totalTasks}</p>
              <p className="text-xs text-text-muted font-mono">TASKS</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyber-amber/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-cyber-amber" />
            </div>
            <div>
              <p className="text-2xl font-bold text-cyber-amber">{metrics.blockedObjectives}</p>
              <p className="text-xs text-text-muted font-mono">BLOCKED</p>
            </div>
          </div>
        </div>
      </div>

      {/* Objectives Breakdown */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyber-cyan" />
          Objectives Breakdown
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-tactical-bg rounded-lg">
            <p className="text-3xl font-bold text-cyber-green">{metrics.completedObjectives}</p>
            <p className="text-xs text-text-muted font-mono mt-1">COMPLETE</p>
            <div className="h-2 bg-tactical-panel rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-cyber-green" style={{ width: metrics.totalObjectives ? `${(metrics.completedObjectives / metrics.totalObjectives) * 100}%` : '0%' }} />
            </div>
          </div>
          <div className="text-center p-4 bg-tactical-bg rounded-lg">
            <p className="text-3xl font-bold text-cyber-cyan">{metrics.activeObjectives}</p>
            <p className="text-xs text-text-muted font-mono mt-1">ACTIVE</p>
            <div className="h-2 bg-tactical-panel rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-cyber-cyan" style={{ width: metrics.totalObjectives ? `${(metrics.activeObjectives / metrics.totalObjectives) * 100}%` : '0%' }} />
            </div>
          </div>
          <div className="text-center p-4 bg-tactical-bg rounded-lg">
            <p className="text-3xl font-bold text-cyber-amber">{metrics.pendingObjectives}</p>
            <p className="text-xs text-text-muted font-mono mt-1">PENDING</p>
            <div className="h-2 bg-tactical-panel rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-cyber-amber" style={{ width: metrics.totalObjectives ? `${(metrics.pendingObjectives / metrics.totalObjectives) * 100}%` : '0%' }} />
            </div>
          </div>
          <div className="text-center p-4 bg-tactical-bg rounded-lg">
            <p className="text-3xl font-bold text-cyber-red">{metrics.blockedObjectives}</p>
            <p className="text-xs text-text-muted font-mono mt-1">BLOCKED</p>
            <div className="h-2 bg-tactical-panel rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-cyber-red" style={{ width: metrics.totalObjectives ? `${(metrics.blockedObjectives / metrics.totalObjectives) * 100}%` : '0%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Operations Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-tactical-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-cyber-cyan" />
            Operations Performance
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-tactical-bg text-xs font-mono text-text-muted">
                <th className="text-left p-3">OPERATION</th>
                <th className="text-center p-3">STATUS</th>
                <th className="text-center p-3">OBJECTIVES</th>
                <th className="text-center p-3">TASKS</th>
                <th className="text-center p-3">FEEDBACK</th>
                <th className="text-center p-3">PROGRESS</th>
                <th className="text-center p-3"></th>
              </tr>
            </thead>
            <tbody>
              {metrics.operationDetails?.map((op) => (
                <tr key={op.id} className="border-t border-tactical-border hover:bg-tactical-hover transition-colors">
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{op.name}</p>
                      <p className="text-xs text-text-muted font-mono">{op.code}</p>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-mono font-medium status-${op.status}`}>
                      {op.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-cyber-green">{op.completedObjectives}</span>
                    <span className="text-text-muted">/{op.objectives}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-cyber-green">{op.completedTasks}</span>
                    <span className="text-text-muted">/{op.tasks}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-text-secondary">{op.feedback}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-tactical-bg rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-green" style={{ width: `${op.progress}%` }} />
                      </div>
                      <span className="text-xs font-mono text-cyber-cyan w-10 text-right">{op.progress}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Link to={`/operation/${op.id}`} className="text-cyber-cyan hover:text-cyber-green">
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {(!metrics.operationDetails || metrics.operationDetails.length === 0) && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-muted">
                    No operations yet. Create your first operation to see metrics.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
