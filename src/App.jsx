import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import Simulador from './pages/Simulador.jsx'
import GanttMarketing from './pages/GanttMarketing.jsx'
import Streamgraph from './pages/Streamgraph.jsx'
import Documentos from './pages/Documentos.jsx'
import logoSM from './assets/logo-sm.svg'

export default function App() {
  return (
    <>
      <header className="app-header">
        <div className="inner">
          <div className="brand">
            <img src={logoSM} alt="SM México" className="brand-logo" />
            <span className="brand-txt">Planeación 2 Campañas<small>Nuevo modelo 2026-2027 · Comité de Negocios</small></span>
          </div>
          <nav className="nav">
            <NavLink to="/simulador">Simulador</NavLink>
            <NavLink to="/gantt">Gantt marketing</NavLink>
            <NavLink to="/servicios">Servicios (streamgraph)</NavLink>
            <NavLink to="/documentos">Documentos</NavLink>
          </nav>
        </div>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Navigate to="/simulador" replace />} />
          <Route path="/simulador" element={<Simulador />} />
          <Route path="/gantt" element={<GanttMarketing />} />
          <Route path="/servicios" element={<Streamgraph />} />
          <Route path="/documentos" element={<Documentos />} />
        </Routes>
      </main>
    </>
  )
}
