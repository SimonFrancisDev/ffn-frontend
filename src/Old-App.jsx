import AppShell from './components/Layout/AppShell/AppShell'
import TopNoticeBar from './components/Layout/TopNoticeBar/TopNoticeBar'

const notices = [
  {
    id: 'network-warning',
    type: 'warning',
    label: 'Network Notice',
    message: 'You are connected to a test environment. Please verify before proceeding.',
    dismissible: true,
  },
]

function App() {
  return (
    <AppShell topbar={<TopNoticeBar notices={notices} />}>
      <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
        <h1>Shell Test</h1>
        <p className="soft-text" style={{ marginTop: '8px' }}>
          Top notice bar is working.
        </p>
      </div>
    </AppShell>
  )
}

export default App



// import React from 'react'
// import { Routes, Route } from 'react-router-dom'
// import { Container } from 'react-bootstrap'
// import { Navigation } from './components/Layout/Navbar'
// import { Dashboard } from './Pages/Dashboard.jsx'
// import { Registration } from './Pages/Registration'
// import { Orbits } from './Pages/Orbits'
// import { FounderPanel } from './Pages/FounderPanel'
// import { AdminPanel } from './Pages/AdminPanel'
// import { MyTokens } from './Pages/MyTokens'
// import './App.css'

// function App() {
//   return (
//     <>
//       <Navigation />
//       <Container fluid className="mt-4">
//         <Routes>
//           <Route path="/" element={<Dashboard />} />
//           <Route path="/register" element={<Registration />} />
//           <Route path="/orbits" element={<Orbits />} />
//           <Route path="/my-tokens" element={<MyTokens />} />
//           <Route path="/founder" element={<FounderPanel />} />
//           <Route path="/admin" element={<AdminPanel />} />
//         </Routes>
//       </Container>
//     </>
//   )
// }

// export default App


