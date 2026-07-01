import { lazy, Suspense } from 'react'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import logoSM from './assets/logo-sm.svg'

const Simulador = lazy(() => import('./pages/Simulador.tsx'))
const GanttMarketing = lazy(() => import('./pages/GanttMarketing.tsx'))
const Streamgraph = lazy(() => import('./pages/Streamgraph.tsx'))
const Documentos = lazy(() => import('./pages/Documentos.tsx'))

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
          </nav>
        </div>
      </header>
      <main className="page">
        <Suspense fallback={<div className="route-loading">Cargando…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/simulador" replace />} />
            <Route path="/simulador" element={<Simulador />} />
            <Route path="/gantt" element={<GanttMarketing />} />
            <Route path="/servicios" element={<Streamgraph />} />
            {/* Documentos queda accesible por URL (#/documentos) pero fuera del menú. */}
            <Route path="/documentos" element={<Documentos />} />
          </Routes>
        </Suspense>
      </main>
    </>
  )
}
