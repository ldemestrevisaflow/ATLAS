import { Link, useLocation } from 'react-router-dom'
import { Target, Plus, Home, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Layout({ children }) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-tactical-bg">
      <header className="sticky top-0 z-50 border-b border-tactical-border bg-tactical-panel/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyber-cyan to-cyber-green flex items-center justify-center">
                <Target className="w-6 h-6 text-tactical-bg" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-display text-2xl tracking-wider text-gradient">ATLAS</h1>
                <p className="text-[10px] font-mono text-text-muted tracking-widest -mt-1">STRATEGIC COMMAND</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-4">
              <Link 
                to="/" 
                className={`flex items-center gap-2 px-3 py-2 rounded transition-all ${
                  location.pathname === '/' 
                    ? 'bg-cyber-cyan/20 text-cyber-cyan' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-tactical-hover'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="text-sm font-medium">Dashboard</span>
              </Link>
              <Link to="/operation/new" className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>New Operation</span>
              </Link>
            </nav>

            <button 
              className="md:hidden p-2 text-text-secondary hover:text-text-primary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-tactical-border bg-tactical-panel">
            <nav className="px-4 py-3 space-y-2">
              <Link 
                to="/" 
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded ${
                  location.pathname === '/' ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'text-text-secondary'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link 
                to="/operation/new" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded bg-cyber-cyan/20 text-cyber-cyan"
              >
                <Plus className="w-4 h-4" />
                <span>New Operation</span>
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      <footer className="border-t border-tactical-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-center text-xs font-mono text-text-muted">
            ATLAS v1.0.0 // STRATEGIC COMMAND
          </p>
        </div>
      </footer>
    </div>
  )
}
