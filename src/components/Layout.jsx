import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Target, BarChart3 } from 'lucide-react'

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-tactical-bg flex flex-col">
      <header className="bg-tactical-panel border-b border-tactical-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyber-cyan to-cyber-green rounded-lg flex items-center justify-center">
                <span className="text-tactical-bg font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-wide">ATLAS</h1>
                <p className="text-[10px] text-text-muted font-mono tracking-widest">STRATEGIC COMMAND</p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <Link 
                to="/" 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isActive('/') ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'text-text-muted hover:text-text-primary hover:bg-tactical-hover'}`}
              >
                <Target className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link 
                to="/metrics" 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isActive('/metrics') ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'text-text-muted hover:text-text-primary hover:bg-tactical-hover'}`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Metrics</span>
              </Link>
              <Link to="/operation/new" className="btn-primary ml-2">
                + New Operation
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="md:hidden p-2 text-text-muted hover:text-text-primary"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-4 border-t border-tactical-border space-y-2">
              <Link 
                to="/" 
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isActive('/') ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'text-text-muted hover:text-text-primary hover:bg-tactical-hover'}`}
              >
                <Target className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link 
                to="/metrics" 
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isActive('/metrics') ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'text-text-muted hover:text-text-primary hover:bg-tactical-hover'}`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Metrics</span>
              </Link>
              <Link 
                to="/operation/new" 
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary w-full text-center"
              >
                + New Operation
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      <footer className="bg-tactical-panel border-t border-tactical-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-text-muted font-mono">ATLAS v1.0.0 // STRATEGIC COMMAND</p>
        </div>
      </footer>
    </div>
  )
}
