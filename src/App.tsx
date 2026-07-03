import { lazy, Suspense } from 'react'
import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import logoSM from './assets/logo-sm.svg'

const Simulador = lazy(() => import('./pages/Simulador.tsx'))
const Planeacion = lazy(() => import('./pages/Planeacion.tsx'))
const Rentabilidad = lazy(() => import('./pages/Rentabilidad.tsx'))
const GanttMarketing = lazy(() => import('./pages/GanttMarketing.tsx'))
const Streamgraph = lazy(() => import('./pages/Streamgraph.tsx'))
const Documentos = lazy(() => import('./pages/Documentos.tsx'))
const HojaAsesor = lazy(() => import('./pages/HojaAsesor.tsx'))

export default function App() {
  // El portal del asesor (#/mi-hoja) es un mundo aparte: sin el header/nav del comité.
  const esPortal = useLocation().pathname === '/mi-hoja'
  return (
    <>
      {!esPortal && (
      <header className="app-header">
        <div className="inner">
          <div className="brand">
            <img src={logoSM} alt="SM México" className="brand-logo" />
            <span className="brand-txt">Planeación 2 Campañas<small>Nuevo modelo 2026-2027 · Comité de Negocios</small></span>
          </div>
          <nav className="nav">
            <NavLink to="/simulador">Simulador</NavLink>
            <NavLink to="/planeacion">Planeación</NavLink>
            <NavLink to="/rentabilidad">Rentabilidad</NavLink>
            <NavLink to="/gantt">Gantt marketing</NavLink>
          </nav>
        </div>
      </header>
      )}
      <main className={esPortal ? undefined : 'page'}>
        <Suspense fallback={<div className="route-loading">Cargando…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/simulador" replace />} />
            <Route path="/simulador" element={<Simulador />} />
            <Route path="/planeacion" element={<Planeacion />} />
            <Route path="/rentabilidad" element={<Rentabilidad />} />
            <Route path="/gantt" element={<GanttMarketing />} />
            {/* Streamgraph y Documentos quedan accesibles por URL (#/servicios, #/documentos) pero fuera del menú. */}
            <Route path="/servicios" element={<Streamgraph />} />
            <Route path="/documentos" element={<Documentos />} />
            {/* Portal del asesor (mockup): login simulado + hoja individual. Fuera del menú del comité. */}
            <Route path="/mi-hoja" element={<HojaAsesor />} />
          </Routes>
        </Suspense>
      </main>
    </>
  )
}
