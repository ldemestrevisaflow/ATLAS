import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Target, CheckCircle2, Clock, AlertTriangle, XCircle, ChevronDown, ChevronRight, Trash2, Save, X, Pencil, Upload, Download, FileText, File, Image, Paperclip } from 'lucide-react'
import { getOperation, updateOperation, getPhases, createPhase, updatePhase, deletePhase, getObjectivesByOperation, createObjective, updateObjective, deleteObjective, getTasksByOperation, createTask, updateTask, deleteTask, getOperationStats, getAttachmentsByOperation, uploadAttachment, downloadAttachment, deleteAttachment } from '../lib/data'

const STATUS_CONFIG = {
  complete: { icon: CheckCircle2, color: 'cyber-green', label: 'COMPLETE' },
  active: { icon: Clock, color: 'cyber-cyan', label: 'ACTIVE' },
  pending: { icon: AlertTriangle, color: 'cyber-amber', label: 'PENDING' },
  blocked: { icon: XCircle, color: 'cyber-red', label: 'BLOCKED' },
}

const getFileIcon = (fileType) => {
  if (fileType?.startsWith('image/')) return Image
  if (fileType?.includes('pdf') || fileType?.includes('document') || fileType?.includes('word')) return FileText
  return File
}

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function OperationView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [operation, setOperation] = useState(null)
  const [phases, setPhases] = useState([])
  const [objectives, setObjectives] = useState([])
  const [tasks, setTasks] = useState([])
  const [attachments, setAttachments] = useState([])
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
  const [editingOperation, setEditingOperation] = useState(false)
  const [editOpForm, setEditOpForm] = useState({})
  const [editingPhase, setEditingPhase] = useState(null)
  const [editPhaseForm, setEditPhaseForm] = useState({})
  const [editingObjective, setEditingObjective] = useState(null)
  const [editObjForm, setEditObjForm] = useState({})
  const [uploadingFor, setUploadingFor] = useState(null)
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      const [op, phs, objs, tsks, sts, atts] = await Promise.all([
        getOperation(id), 
        getPhases(id), 
        getObjectivesByOperation(id), 
        getTasksByOperation(id), 
        getOperationStats(id),
        getAttachmentsByOperation(id)
      ])
      setOperation(op)
      setPhases(phs)
      setObjectives(objs)
      setTasks(tsks)
      setStats(sts)
      setAttachments(atts || [])
      if (phs.length > 0) setExpandedPhases(new Set([phs[0].id]))
    } catch (error) { console.error('Failed to load:', error) } finally { setLoading(false) }
  }

  const refreshStats = async () => { const sts = await getOperationStats(id); setStats(sts) }

  const handleUpdateOperation = async () => {
    const updated = await updateOperation(id, editOpForm)
    setOperation(updated)
    setEditingOperation(false)
  }

  const handleCreatePhase = async () => {
    if (!newPhase.name.trim()) return
    const phase = await createPhase({ operation_id: id, name: newPhase.name, code: newPhase.code || `PHASE-${phases.length + 1}`, order_index: phases.length })
    setPhases([...phases, phase])
    setNewPhase({ name: '', code: '' })
    setShowNewPhase(false)
    setExpandedPhases(new Set([...expandedPhases, phase.id]))
  }

  const handleUpdatePhase = async (phaseId) => {
    const updated = await updatePhase(phaseId, editPhaseForm)
    setPhases(phases.map(p => p.id === phaseId ? updated : p))
    setEditingPhase(null)
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

  const handleUpdateObjective = async (objId) => {
    const updated = await updateObjective(objId, editObjForm)
    setObjectives(objectives.map(o => o.id === objId ? updated : o))
    setEditingObjective(null)
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
    setAttachments(attachments.filter(a => a.objective_id !== objectiveId))
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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uploadingFor) return
    
    try {
      setUploading(true)
      const attachment = await uploadAttachment(file, id, uploadingFor, uploadNotes)
      setAttachments([attachment, ...attachments])
      setUploadingFor(null)
      setUploadNotes('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (attachment) => {
    try {
      await downloadAttachment(attachment)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Download failed: ' + error.message)
    }
  }

  const handleDeleteAttachment = async (attachment) => {
    if (!confirm('Delete this file?')) return
    try {
      await deleteAttachment(attachment)
      setAttachments(attachments.filter(a => a.id !== attachment.id))
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Delete failed: ' + error.message)
    }
  }

  const togglePhase = (phaseId) => { const n = new Set(expandedPhases); n.has(phaseId) ? n.delete(phaseId) : n.add(phaseId); setExpandedPhases(n) }
  const toggleObjective = (objId) => { const n = new Set(expandedObjectives); n.has(objId) ? n.delete(objId) : n.add(objId); setExpandedObjectives(n) }

  const getObjectiveAttachments = (objId) => attachments.filter(a => a.objective_id === objId)

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><div className="w-12 h-12 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-text-muted font-mono text-sm">LOADING...</p></div></div>
  if (!operation) return <div className="text-center py-12"><p className="text-text-muted">Operation not found</p><Link to="/" className="btn-primary mt-4 inline-block">Back to Dashboard</Link></div>

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/')} className="p-2 text-text-muted hover:text-text-primary hover:bg-tactical-hover rounded transition-all mt-1"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          {editingOperation ? (
            <div className="space-y-3 card p-4">
              <input type="text" className="input text-xl font-bold" value={editOpForm.name || ''} onChange={(e) => setEditOpForm({ ...editOpForm, name: e.target.value })} placeholder="Operation name" />
              <input type="text" className="input font-mono" value={editOpForm.code || ''} onChange={(e) => setEditOpForm({ ...editOpForm, code: e.target.value.toUpperCase() })} placeholder="Code" />
              <textarea className="input" value={editOpForm.description || ''} onChange={(e) => setEditOpForm({ ...editOpForm, description: e.target.value })} placeholder="Description" />
              <select className="input" value={editOpForm.status || 'active'} onChange={(e) => setEditOpForm({ ...editOpForm, status: e.target.value })}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="complete">Complete</option>
              </select>
              <div className="flex gap-2">
                <button onClick={handleUpdateOperation} className="btn-success flex items-center gap-1"><Save className="w-4 h-4" /> Save</button>
                <button onClick={() => setEditingOperation(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs font-mono font-medium status-${operation.status}`}>{operation.status?.toUpperCase()}</span>
                <span className="text-xs text-text-muted font-mono">{operation.code}</span>
                <button onClick={() => { setEditOpForm(operation); setEditingOperation(true) }} className="p-1 text-text-muted hover:text-cyber-cyan"><Pencil className="w-4 h-4" /></button>
              </div>
              <h1 className="text-2xl font-bold mt-2">{operation.name}</h1>
              {operation.description && <p className="text-text-secondary mt-1">{operation.description}</p>}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card p-4 text-center"><p className="text-2xl font-bold">{stats.totalObjectives}</p><p className="text-[10px] text-text-muted font-mono">OBJECTIVES</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-cyber-green">{stats.completedObjectives}</p><p className="text-[10px] text-text-muted font-mono">COMPLETE</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-cyber-cyan">{stats.activeObjectives}</p><p className="text-[10px] text-text-muted font-mono">ACTIVE</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-cyber-amber">{stats.pendingObjectives}</p><p className="text-[10px] text-text-muted font-mono">PENDING</p></div>
        <div className="card p-4 text-center col-span-2 md:col-span-1"><p className="text-2xl font-bold text-gradient">{stats.progress}%</p><p className="text-[10px] text-text-muted font-mono">PROGRESS</p></div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between text-sm mb-2"><span className="text-text-muted font-mono">OPERATION PROGRESS</span><span className="text-cyber-cyan font-mono font-bold">{stats.progress}%</span></div>
        <div className="h-3 bg-tactical-bg rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-green transition-all duration-500" style={{ width: `${stats.progress}%` }} /></div>
        <div className="flex items-center justify-between text-xs text-text-muted mt-2 font-mono"><span>{stats.completedObjectives} / {stats.totalObjectives} objectives</span><span>{stats.completedTasks} / {stats.totalTasks} tasks</span></div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Phases & Objectives</h2><button onClick={() => setShowNewPhase(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Phase</span></button></div>

        {showNewPhase && (
          <div className="card p-4 border-cyber-cyan"><h3 className="font-medium mb-3">New Phase</h3><div className="space-y-3"><input type="text" className="input" placeholder="Phase name..." value={newPhase.name} onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })} autoFocus /><input type="text" className="input font-mono" placeholder="Code (e.g., ALPHA)" value={newPhase.code} onChange={(e) => setNewPhase({ ...newPhase, code: e.target.value.toUpperCase() })} /><div className="flex gap-2"><button onClick={handleCreatePhase} className="btn-success">Create</button><button onClick={() => setShowNewPhase(false)} className="btn-secondary">Cancel</button></div></div></div>
        )}

        {phases.length === 0 && !showNewPhase ? (
          <div className="card p-8 text-center"><Target className="w-12 h-12 text-text-muted mx-auto mb-3" /><p className="text-text-muted">No phases yet. Add a phase to get started.</p></div>
        ) : phases.map((phase) => {
          const phaseObjectives = objectives.filter(o => o.phase_id === phase.id)
          const isExpanded = expandedPhases.has(phase.id)
          const completedCount = phaseObjectives.filter(o => o.status === 'complete').length
          const phaseProgress = phaseObjectives.length > 0 ? Math.round((completedCount / phaseObjectives.length) * 100) : 0

          return (
            <div key={phase.id} className="card overflow-hidden">
              <div className="p-4 bg-tactical-panel border-b border-tactical-border">
                {editingPhase === phase.id ? (
                  <div className="space-y-3">
                    <input type="text" className="input" value={editPhaseForm.name || ''} onChange={(e) => setEditPhaseForm({ ...editPhaseForm, name: e.target.value })} placeholder="Phase name" autoFocus />
                    <input type="text" className="input font-mono" value={editPhaseForm.code || ''} onChange={(e) => setEditPhaseForm({ ...editPhaseForm, code: e.target.value.toUpperCase() })} placeholder="Code" />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdatePhase(phase.id)} className="btn-success flex items-center gap-1"><Save className="w-4 h-4" /> Save</button>
                      <button onClick={() => setEditingPhase(null)} className="btn-secondary">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between cursor-pointer hover:bg-tactical-hover transition-colors -m-4 p-4" onClick={() => togglePhase(phase.id)}>
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-cyber-cyan" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-cyber-cyan font-mono">{phase.code}</span>
                          <h3 className="font-semibold">{phase.name}</h3>
                          <button onClick={(e) => { e.stopPropagation(); setEditPhaseForm(phase); setEditingPhase(phase.id) }} className="p-1 text-text-muted hover:text-cyber-cyan"><Pencil className="w-3 h-3" /></button>
                        </div>
                        <p className="text-xs text-text-muted mt-1">{phaseObjectives.length} objectives • {completedCount} complete • {phaseProgress}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-tactical-bg rounded-full overflow-hidden"><div className="h-full bg-cyber-cyan" style={{ width: `${phaseProgress}%` }} /></div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeletePhase(phase.id) }} className="p-1 text-text-muted hover:text-cyber-red"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>

              {isExpanded && !editingPhase && (
                <div className="p-4 space-y-3">
                  {phaseObjectives.map((obj) => {
                    const objTasks = tasks.filter(t => t.objective_id === obj.id)
                    const objAttachments = getObjectiveAttachments(obj.id)
                    const isObjExpanded = expandedObjectives.has(obj.id)
                    const StatusIcon = STATUS_CONFIG[obj.status]?.icon || AlertTriangle
                    const statusColor = STATUS_CONFIG[obj.status]?.color || 'cyber-amber'

                    return (
                      <div key={obj.id} className="bg-tactical-bg rounded-lg overflow-hidden">
                        {editingObjective === obj.id ? (
                          <div className="p-3 space-y-2">
                            <input type="text" className="input" value={editObjForm.name || ''} onChange={(e) => setEditObjForm({ ...editObjForm, name: e.target.value })} placeholder="Objective name" autoFocus />
                            <input type="text" className="input" value={editObjForm.description || ''} onChange={(e) => setEditObjForm({ ...editObjForm, description: e.target.value })} placeholder="Description" />
                            <select className="input" value={editObjForm.status || 'pending'} onChange={(e) => setEditObjForm({ ...editObjForm, status: e.target.value })}>
                              <option value="pending">Pending</option>
                              <option value="active">Active</option>
                              <option value="complete">Complete</option>
                              <option value="blocked">Blocked</option>
                            </select>
                            <div className="flex gap-2">
                              <button onClick={() => handleUpdateObjective(obj.id)} className="btn-success flex items-center gap-1"><Save className="w-4 h-4" /> Save</button>
                              <button onClick={() => setEditingObjective(null)} className="btn-secondary">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className={`p-3 border-l-4 border-${statusColor} cursor-pointer hover:bg-tactical-hover transition-colors`} onClick={() => toggleObjective(obj.id)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isObjExpanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                                <StatusIcon className={`w-5 h-5 text-${statusColor}`} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{obj.name}</h4>
                                    <button onClick={(e) => { e.stopPropagation(); setEditObjForm(obj); setEditingObjective(obj.id) }} className="p-1 text-text-muted hover:text-cyber-cyan"><Pencil className="w-3 h-3" /></button>
                                    {objAttachments.length > 0 && (
                                      <span className="flex items-center gap-1 text-xs text-text-muted"><Paperclip className="w-3 h-3" />{objAttachments.length}</span>
                                    )}
                                  </div>
                                  {obj.description && <p className="text-xs text-text-muted mt-0.5">{obj.description}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <select value={obj.status} onChange={(e) => { e.stopPropagation(); handleUpdateObjectiveStatus(obj.id, e.target.value) }} onClick={(e) => e.stopPropagation()} className="text-xs bg-tactical-panel border border-tactical-border rounded px-2 py-1">
                                  <option value="pending">Pending</option>
                                  <option value="active">Active</option>
                                  <option value="complete">Complete</option>
                                  <option value="blocked">Blocked</option>
                                </select>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteObjective(obj.id) }} className="p-1 text-text-muted hover:text-cyber-red"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        )}

                        {isObjExpanded && editingObjective !== obj.id && (
                          <div className="px-3 pb-3 pt-1 ml-6 border-l border-tactical-border space-y-3">
                            {/* Tasks */}
                            <div>
                              {objTasks.length === 0 ? <p className="text-xs text-text-muted py-2">No tasks yet</p> : (
                                <div className="space-y-1">{objTasks.map((task) => (
                                  <div key={task.id} className="flex items-center gap-2 py-1 group">
                                    <input type="checkbox" checked={task.status === 'complete'} onChange={() => handleUpdateTaskStatus(task.id, task.status === 'complete' ? 'pending' : 'complete')} className="w-4 h-4 rounded border-tactical-border bg-tactical-panel text-cyber-cyan" />
                                    <span className={`flex-1 text-sm ${task.status === 'complete' ? 'line-through text-text-muted' : 'text-text-secondary'}`}>{task.name}</span>
                                    {task.week && <span className="text-xs text-cyber-cyan font-mono">[{task.week}]</span>}
                                    <button onClick={() => handleDeleteTask(task.id)} className="p-1 text-text-muted hover:text-cyber-red opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                                  </div>
                                ))}</div>
                              )}
                              {showNewTask === obj.id ? (
                                <div className="flex items-center gap-2 mt-2">
                                  <input type="text" className="input flex-1 text-sm py-1" placeholder="Task name..." value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} autoFocus />
                                  <input type="text" className="input w-20 text-sm py-1 font-mono" placeholder="Week" value={newTask.week} onChange={(e) => setNewTask({ ...newTask, week: e.target.value })} />
                                  <button onClick={() => handleCreateTask(obj.id)} className="p-1 text-cyber-green"><Save className="w-4 h-4" /></button>
                                  <button onClick={() => { setShowNewTask(null); setNewTask({ name: '', week: '' }) }} className="p-1 text-text-muted"><X className="w-4 h-4" /></button>
                                </div>
                              ) : <button onClick={() => setShowNewTask(obj.id)} className="flex items-center gap-1 text-xs text-text-muted hover:text-cyber-cyan mt-2"><Plus className="w-3 h-3" /> Add task</button>}
                            </div>

                            {/* Attachments */}
                            <div className="border-t border-tactical-border pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-mono text-text-muted">ATTACHMENTS</span>
                                <button 
                                  onClick={() => { setUploadingFor(obj.id); fileInputRef.current?.click() }} 
                                  className="flex items-center gap-1 text-xs text-cyber-cyan hover:text-cyber-green"
                                  disabled={uploading}
                                >
                                  <Upload className="w-3 h-3" /> Upload
                                </button>
                              </div>
                              
                              {uploadingFor === obj.id && uploading && (
                                <div className="text-xs text-cyber-cyan py-2">Uploading...</div>
                              )}
                              
                              {objAttachments.length === 0 ? (
                                <p className="text-xs text-text-muted">No files attached</p>
                              ) : (
                                <div className="space-y-2">
                                  {objAttachments.map((att) => {
                                    const FileIcon = getFileIcon(att.file_type)
                                    return (
                                      <div key={att.id} className="flex items-center gap-2 p-2 bg-tactical-panel rounded group">
                                        <FileIcon className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm truncate">{att.file_name}</p>
                                          <p className="text-[10px] text-text-muted">
                                            v{att.version} • {formatFileSize(att.file_size)}
                                            {att.notes && ` • ${att.notes}`}
                                          </p>
                                        </div>
                                        <button onClick={() => handleDownload(att)} className="p-1 text-text-muted hover:text-cyber-cyan"><Download className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteAttachment(att)} className="p-1 text-text-muted hover:text-cyber-red opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {showNewObjective === phase.id ? (
                    <div className="bg-tactical-bg rounded-lg p-3 border border-cyber-cyan">
                      <div className="space-y-2">
                        <input type="text" className="input" placeholder="Objective name..." value={newObjective.name} onChange={(e) => setNewObjective({ ...newObjective, name: e.target.value })} autoFocus />
                        <input type="text" className="input" placeholder="Description (optional)" value={newObjective.description} onChange={(e) => setNewObjective({ ...newObjective, description: e.target.value })} />
                        <select className="input" value={newObjective.status} onChange={(e) => setNewObjective({ ...newObjective, status: e.target.value })}>
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="complete">Complete</option>
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => handleCreateObjective(phase.id)} className="btn-success">Create</button>
                          <button onClick={() => { setShowNewObjective(null); setNewObjective({ name: '', description: '', status: 'pending' }) }} className="btn-secondary">Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : <button onClick={() => setShowNewObjective(phase.id)} className="flex items-center gap-2 text-sm text-text-muted hover:text-cyber-cyan py-2"><Plus className="w-4 h-4" /> Add objective</button>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
