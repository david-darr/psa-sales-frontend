import { useState, useEffect } from 'react'
import './App.css'
import { AuthProvider } from "./AuthContext"
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import Home from './Home'
import SchoolsList from './SchoolsList'
import SchoolFinder from './SchoolFinder'
import Emails from './Emails'
import Team from './Team'
import Account from './Account'
import ProtectedRoute from "./ProtectedRoute"
import PSAMap from './Map'


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/map" element={<PSAMap />} />
          <Route path="/account" element={<Account />} />
          <Route path="/schools" element={<ProtectedRoute><SchoolsList /></ProtectedRoute>} />
          <Route path="/finder" element={<SchoolFinder />} />
          <Route path="/emails" element={<ProtectedRoute><Emails /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
