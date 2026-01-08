import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import OperationView from './pages/OperationView'
import NewOperation from './pages/NewOperation'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/operation/new" element={<NewOperation />} />
        <Route path="/operation/:id" element={<OperationView />} />
      </Routes>
    </Layout>
  )
}

export default App
