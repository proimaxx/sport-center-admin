import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles/global.css'
import Sidebar from './components/Sidebar'
import Campi from './pages/Campi'
import Piscina from './pages/Piscina'
import Prenotazioni from './pages/Prenotazioni'
import Calendario from './pages/Calendario'
import Impostazioni from './pages/Impostazioni'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Campi />} />
            <Route path="/piscina" element={<Piscina />} />
            <Route path="/prenotazioni" element={<Prenotazioni />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/impostazioni" element={<Impostazioni />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
