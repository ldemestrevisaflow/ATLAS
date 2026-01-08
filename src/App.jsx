import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import OperationView from './pages/OperationView'
import NewOperation from './pages/NewOperation'
import Metrics from './pages/Metrics'
import BattleMapPage from './pages/BattleMapPage'
import Tasks from './pages/Tasks'
import AIScheduler from './pages/AIScheduler'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/operation/new" element={<NewOperation />} />
        <Route path="/operation/:id" element={<OperationView />} />
        <Route path="/metrics" element={<Metrics />} />
        <Route path="/battlemap" element={<BattleMapPage />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/ai-scheduler" element={<AIScheduler />} />
      </Routes>
    </Layout>
  )
}
