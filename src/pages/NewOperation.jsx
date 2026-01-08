import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { createOperation } from '../lib/data'

export default function NewOperation() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'planning',
    start_date: '',
    end_date: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      setLoading(true)
      const operation = await createOperation({
        ...formData,
        code: formData.code || `OP-${Date.now().toString().slice(-4)}`,
      })
      navigate(`/operation/${operation.id}`)
    } catch (error) {
      console.error('Failed to create operation:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 text-text-muted hover:text-text-primary hover:bg-tactical-hover rounded transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">New Operation</h1>
          <p className="text-text-muted text-sm">Create a new tactical operation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <label className="label">Operation Name *</label>
          <input type="text" className="input" placeholder="e.g., PwC Legal AI 2026" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>

        <div>
          <label className="label">Operation Code</label>
          <input type="text" className="input font-mono" placeholder="e.g., LEGAL-AI-2026" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} />
          <p className="text-xs text-text-muted mt-1">Leave blank to auto-generate</p>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[100px]" placeholder="Brief description of the operation objectives..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
        </div>

        <div>
          <label className="label">Initial Status</label>
          <select className="input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-tactical-border">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading || !formData.name.trim()} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? <><div className="w-4 h-4 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" /><span>Creating...</span></> : <><Save className="w-4 h-4" /><span>Create Operation</span></>}
          </button>
        </div>
      </form>
    </div>
  )
}
