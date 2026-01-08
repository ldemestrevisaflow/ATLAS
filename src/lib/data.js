import { supabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEYS = {
  operations: 'atlas_operations',
  phases: 'atlas_phases',
  objectives: 'atlas_objectives',
  tasks: 'atlas_tasks',
}

const getLocal = (key) => {
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : []
}

const setLocal = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data))
}

const generateId = () => crypto.randomUUID()

export const getOperations = async () => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('operations')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
  return getLocal(STORAGE_KEYS.operations)
}

export const getOperation = async (id) => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('operations')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }
  const ops = getLocal(STORAGE_KEYS.operations)
  return ops.find(o => o.id === id)
}

export const createOperation = async (operation) => {
  const newOp = {
    id: generateId(),
    ...operation,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('operations')
      .insert(newOp)
      .select()
      .single()
    if (error) throw error
    return data
  }
  
  const ops = getLocal(STORAGE_KEYS.operations)
  ops.unshift(newOp)
  setLocal(STORAGE_KEYS.operations, ops)
  return newOp
}

export const updateOperation = async (id, updates) => {
  const updated = { ...updates, updated_at: new Date().toISOString() }
  
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('operations')
      .update(updated)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  
  const ops = getLocal(STORAGE_KEYS.operations)
  const index = ops.findIndex(o => o.id === id)
  if (index !== -1) {
    ops[index] = { ...ops[index], ...updated }
    setLocal(STORAGE_KEYS.operations, ops)
    return ops[index]
  }
  throw new Error('Operation not found')
}

export const deleteOperation = async (id) => {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('operations').delete().eq('id', id)
    if (error) throw error
    return
  }
  
  setLocal(STORAGE_KEYS.operations, getLocal(STORAGE_KEYS.operations).filter(o => o.id !== id))
  setLocal(STORAGE_KEYS.phases, getLocal(STORAGE_KEYS.phases).filter(p => p.operation_id !== id))
  setLocal(STORAGE_KEYS.objectives, getLocal(STORAGE_KEYS.objectives).filter(o => o.operation_id !== id))
  setLocal(STORAGE_KEYS.tasks, getLocal(STORAGE_KEYS.tasks).filter(t => t.operation_id !== id))
}

export const getPhases = async (operationId) => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('phases')
      .select('*')
      .eq('operation_id', operationId)
      .order('order_index', { ascending: true })
    if (error) throw error
    return data
  }
  return getLocal(STORAGE_KEYS.phases)
    .filter(p => p.operation_id === operationId)
    .sort((a, b) => a.order_index - b.order_index)
}

export const createPhase = async (phase) => {
  const newPhase = {
    id: generateId(),
    ...phase,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('phases').insert(newPhase).select().single()
    if (error) throw error
    return data
  }
  
  const phases = getLocal(STORAGE_KEYS.phases)
  phases.push(newPhase)
  setLocal(STORAGE_KEYS.phases, phases)
  return newPhase
}

export const updatePhase = async (id, updates) => {
  const updated = { ...updates, updated_at: new Date().toISOString() }
  
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('phases')
      .update(updated)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  
  const phases = getLocal(STORAGE_KEYS.phases)
  const index = phases.findIndex(p => p.id === id)
  if (index !== -1) {
    phases[index] = { ...phases[index], ...updated }
    setLocal(STORAGE_KEYS.phases, phases)
    return phases[index]
  }
  throw new Error('Phase not found')
}

export const deletePhase = async (id) => {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('phases').delete().eq('id', id)
    if (error) throw error
    return
  }
  
  setLocal(STORAGE_KEYS.phases, getLocal(STORAGE_KEYS.phases).filter(p => p.id !== id))
  setLocal(STORAGE_KEYS.objectives, getLocal(STORAGE_KEYS.objectives).filter(o => o.phase_id !== id))
}

export const getObjectivesByOperation = async (operationId) => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .eq('operation_id', operationId)
      .order('order_index', { ascending: true })
    if (error) throw error
    return data
  }
  return getLocal(STORAGE_KEYS.objectives)
    .filter(o => o.operation_id === operationId)
    .sort((a, b) => a.order_index - b.order_index)
}

export const createObjective = async (objective) => {
  const newObj = {
    id: generateId(),
    ...objective,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('objectives').insert(newObj).select().single()
    if (error) throw error
    return data
  }
  
  const objectives = getLocal(STORAGE_KEYS.objectives)
  objectives.push(newObj)
  setLocal(STORAGE_KEYS.objectives, objectives)
  return newObj
}

export const updateObjective = async (id, updates) => {
  const updated = { ...updates, updated_at: new Date().toISOString() }
  
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('objectives').update(updated).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  
  const objectives = getLocal(STORAGE_KEYS.objectives)
  const index = objectives.findIndex(o => o.id === id)
  if (index !== -1) {
    objectives[index] = { ...objectives[index], ...updated }
    setLocal(STORAGE_KEYS.objectives, objectives)
    return objectives[index]
  }
  throw new Error('Objective not found')
}

export const deleteObjective = async (id) => {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('objectives').delete().eq('id', id)
    if (error) throw error
    return
  }
  
  setLocal(STORAGE_KEYS.objectives, getLocal(STORAGE_KEYS.objectives).filter(o => o.id !== id))
  setLocal(STORAGE_KEYS.tasks, getLocal(STORAGE_KEYS.tasks).filter(t => t.objective_id !== id))
}

export const getTasksByOperation = async (operationId) => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('operation_id', operationId)
      .order('order_index', { ascending: true })
    if (error) throw error
    return data
  }
  return getLocal(STORAGE_KEYS.tasks)
    .filter(t => t.operation_id === operationId)
    .sort((a, b) => a.order_index - b.order_index)
}

export const createTask = async (task) => {
  const newTask = {
    id: generateId(),
    ...task,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('tasks').insert(newTask).select().single()
    if (error) throw error
    return data
  }
  
  const tasks = getLocal(STORAGE_KEYS.tasks)
  tasks.push(newTask)
  setLocal(STORAGE_KEYS.tasks, tasks)
  return newTask
}

export const updateTask = async (id, updates) => {
  const updated = { ...updates, updated_at: new Date().toISOString() }
  
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('tasks').update(updated).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  
  const tasks = getLocal(STORAGE_KEYS.tasks)
  const index = tasks.findIndex(t => t.id === id)
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updated }
    setLocal(STORAGE_KEYS.tasks, tasks)
    return tasks[index]
  }
  throw new Error('Task not found')
}

export const deleteTask = async (id) => {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    return
  }
  
  setLocal(STORAGE_KEYS.tasks, getLocal(STORAGE_KEYS.tasks).filter(t => t.id !== id))
}

export const getOperationStats = async (operationId) => {
  const objectives = await getObjectivesByOperation(operationId)
  const tasks = await getTasksByOperation(operationId)
  
  const totalObjectives = objectives.length
  const completedObjectives = objectives.filter(o => o.status === 'complete').length
  const activeObjectives = objectives.filter(o => o.status === 'active').length
  const pendingObjectives = objectives.filter(o => o.status === 'pending').length
  const blockedObjectives = objectives.filter(o => o.status === 'blocked').length
  
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'complete').length
  
  const progress = totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0
  
  return {
    totalObjectives,
    completedObjectives,
    activeObjectives,
    pendingObjectives,
    blockedObjectives,
    totalTasks,
    completedTasks,
    progress,
  }
}
