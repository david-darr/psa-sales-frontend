import './App.css'
import { AuthProvider } from './AuthContext'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './Home'
import SchoolsList from './SchoolsList'
import SchoolFinder from './SchoolFinder'
import Emails from './Emails'
import Team from './Team'
import Account from './Account'
import ProtectedRoute from './ProtectedRoute'
import PSAMap from './Map'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><PSAMap /></ProtectedRoute>} />
          <Route path="/account" element={<Account />} />
          <Route path="/finder" element={<ProtectedRoute><SchoolFinder /></ProtectedRoute>} />
          <Route
            path="/schools"
            element={
              <ProtectedRoute>
                <SchoolsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/emails"
            element={
              <ProtectedRoute>
                <Emails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute>
                <Team />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
