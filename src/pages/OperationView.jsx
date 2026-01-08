import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Settings, Target, CheckCircle2, Clock, AlertTriangle, XCircle, ChevronDown, ChevronRight, Trash2, Save, X } from 'lucide-react'
import { getOperation, updateOperation, getPhases, createPhase, deletePhase, getObjectivesByOperation, createObjective, updateObjective, deleteObjective, getTasksByOperation, createTask, updateTask, deleteTask, getOperationStats } from '../lib/data'

const STATUS_CONFIG = {
  complete: { icon: CheckCircle2, color: 'cyber-green', label: 'COMPLETE' },
  active: { icon: Clock, color: 'cyber-cyan', label: 'ACTIVE' },
  pending: { icon: AlertTriangle, color: 'cyber-amber', label: 'PENDING' },
  blocked: { icon: XCircle, color: 'cyber-red', label: 'BLOCKED' },
}

export default function OperationView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [operation, setOperation] = useState(null)
  const [phases, setPhases] = useState([])
  const [objectives, setObjectives] = useState([])
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedPhases, setExpandedPhases] = useState(new Set())
  const [expandedObjectives, setExpandedObjectives] = useState(new Set())
  const [showNewPhase, setShowNewPhase] = useState(false)
  const [newPhase, setNewPhase] = useState({ name: '', code: '' })
  const [showNewObjective, setShowNewObjective] = useState(null)
  const [newObjective, setNewObjective] = useState({ name: '', description: '', status: 'pending' })
  const [showNewTask, setShowNewTask] = useState(null)
  const [newTask, setNewTask] = useState({ name: '', week: '' })

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      const [op, phs, objs, tsks, sts] = await Promise.all([getOperation(id), getPhases(id), getObjectivesByOperation(id), getTasksByOperation(id), getOperationStats(id)])
      setOperation(op)
      setPhases(phs)
      setObjectives(objs)
      setTasks(tsks)
      setStats(sts)
      if (phs.length > 0) setExpandedPhases(new Set([phs[0].id]))
    } catch (error) { console.error('Failed to load:', error) } finally { setLoading(false) }
  }

  const refreshStats = async () => { const sts = await getOperationStats(id); setStats(sts) }

  const handleCreatePhase = async () => {
    if (!newPhase.name.trim()) return
    const phase = await createPhase({ operation_id: id, name: newPhase.name, code: newPhase.code || `PHASE-${phases.length + 1}`, order_index: phases.length })
    setPhases([...phases, phase])
    setNewPhase({ name: '', code: '' })
    setShowNewPhase(false)
    setExpandedPhases(new Set([...expandedPhases, phase.id]))
  }

  const handleDeletePhase = async (phaseId) => {
    await deletePhase(phaseId)
    setPhases(phases.filter(p => p.id !== phaseId))
    setObjectives(objectives.filter(o => o.phase_id !== phaseId))
    refreshStats()
  }

  const handleCreateObjective = async (phaseId) => {
    if (!newObjective.name.trim()) return
    const obj = await createObjective({ operation_id: id, phase_id: phaseId, name: newObjective.name, description: newObjective.description, status: newObjective.status, order_index: objectives.filter(o => o.phase_id === phaseId).length })
    setObjectives([...objectives, obj])
    setNewObjective({ name: '', description: '', status: 'pending' })
    setShowNewObjective(null)
    refreshStats()
  }

  const handleUpdateObjectiveStatus = async (objectiveId, status) => {
    const updated = await updateObjective(objectiveId, { status })
    setObjectives(objectives.map(o => o.id === objectiveId ? updated : o))
    refreshStats()
  }

  const handleDeleteObjective = async (objectiveId) => {
    await deleteObjective(objectiveId)
    setObjectives(objectives.filter(o => o.id !== objectiveId))
    setTasks(tasks.filter(t => t.objective_id !== objectiveId))
    refreshStats()
  }

  const handleCreateTask = async (objectiveId) => {
    if (!newTask.name.trim()) return
    const task = await createTask({ operation_id: id, objective_id: objectiveId, name: newTask.name, week: newTask.week, status: 'pending', order_index: tasks.filter(t => t.objective_id === objectiveId).length })
    setTasks([...tasks, task])
    setNewTask({ name: '', week: '' })
    setShowNewTask(null)
    refreshStats()
  }

  const handleUpdateTaskStatus = async (taskId, status) => {
    const updated = await updateTask(taskId, { status })
    setTasks(tasks.map(t => t.id === taskId ? updated : t))
    refreshStats()
  }

  const handleDeleteTask = async (taskId) => {
    await deleteTask(taskId)
    setTasks(tasks.filter(t => t.id !== taskId))
    refreshStats()
  }

  const togglePhase = (phaseId) => { const n = new Set(expandedPhases); n.has(phaseId) ? n.delete(phaseId) : n.add(phaseId); setExpandedPhases(n) }
  const toggleObjective = (objId) => { const n = new Set(expandedObjectives); n.has(objId) ? n.delete(objId) : n.add(objId); setExpandedObjectives(n) }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><div className="w-12 h-12 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-text-muted font-mono text-sm">LOADING...</p></div></div>
  if (!operation) return <div className="text-center py-12"><p className="text-text-muted">Operation not found</p><Link to="/" className="btn-primary mt-4 inline-block">Back to Dashboard</Link></div>

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <button onClick={() => navi
