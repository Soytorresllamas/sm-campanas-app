import { Fragment, useEffect, useState } from 'react'
import { DEFAULTS, TIER_SEED } from '../data/model'
import type { TierKey, Campaign } from '../data/model'
import {
  defaultPlaneacion, setServicio, patchColegio, cargaAsesor, agregarAlerta,
  hoyISO, urgencia, agendaAsesor, serviciosDeAsesor, SATISFACCION, ESTATUS, PROBLEMAS,
} from '../data/planeacion'
import type { PlaneacionData, Estatus, Servicio, Urgencia, Colegio, ProblemaKey } from '../data/planeacion'
import { loadLocal, saveLocal, loadRemote, saveRemote } from '../lib/planeacionStore'
import logoSM from '../assets/logo-sm.svg'

// ─── Portal del asesor (MOCKUP, móvil-first) ──────────────────────────────────
// Simula el acceso individual: login propio + SOLO su hoja, sin el resto de la app.
// La autenticación es de utilería (cualquier contraseña entra); la real (Supabase
// Auth + RLS) sigue en el roadmap. Ver docs/05-planeacion-servicios.md.

const SMART = '#2563B0', CORE = '#2C8A7B', ROJO = '#D22730'
const EST_COLOR: Record<Estatus, string> = { pendiente: '#9AA1AC', agendado: '#B5841C', realizado: '#2C8A7B' }
const EST_LABEL: Record<Estatus, string> = { pendiente: 'Pendiente', agendado: 'Agendado', realizado: 'Realizado' }
const SERV_SHORT: Record<string, string> = { uso: 'Uso', prof: 'Prof.', didac: 'Didác.' }
const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtF = (iso: string) => `${parseInt(iso.slice(8, 10), 10)} ${MESES_C[parseInt(iso.slice(5, 7), 10) - 1]}`
const tierLabel = (k: TierKey) => TIER_SEED.find((t) => t.key === k)?.label ?? k
const SESION = 'sm-asesor-sesion-v1'

export default function HojaAsesor() {
  const [data, setData] = useState<PlaneacionData>(() => loadLocal() ?? defaultPlaneacion())
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('Cargando…')
  const [asesorId, setAsesorId] = useState<string | null>(() => sessionStorage.getItem(SESION))
  const [loginSel, setLoginSel] = useState('')
  const [loginPw, setLoginPw] = useState('')
  // null = colapso por defecto (solo la primera tarjeta abierta); al tocar se materializa el set
  const [expandidos, setExpandidos] = useState<Set<string> | null>(null)
  const [notaAbierta, setNotaAbierta] = useState<string | null>(null)
  // filtros de la cartera
  const [busca, setBusca] = useState('')
  const [fCamp, setFCamp] = useState<'todos' | Campaign>('todos')
  const [fTier, setFTier] = useState<'todos' | TierKey>('todos')
  const [fEstado, setFEstado] = useState<'todos' | 'vencidos' | 'pendientes' | 'completos'>('todos')
  // alerta de caso crítico (FAB)
  const [alertaOpen, setAlertaOpen] = useState(false)
  const [alCol, setAlCol] = useState('')
  const [alTipo, setAlTipo] = useState<ProblemaKey>('materiales')
  const [alDesc, setAlDesc] = useState('')
  const [alSent, setAlSent] = useState(false)

  useEffect(() => {
    let alive = true
    loadRemote().then((res) => {
      if (!alive) return
      if (res.source === 'remote') setData(res.data)
      setStatus(res.source === 'remote' ? 'Sincronizado' : 'Sin conexión · local')
      setReady(true)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!ready) return
    saveLocal(data)
    const t = window.setTimeout(() => {
      setStatus('Guardando…')
      saveRemote(data).then((r) => setStatus(r.ok ? 'Sincronizado' : 'Sin conexión · local'))
    }, 700)
    return () => clearTimeout(t)
  }, [data, ready])

  const hoy = hoyISO()
  const asesor = data.asesores.find((a) => a.id === asesorId) ?? null

  const entrar = (e: React.FormEvent) => {
    e.preventDefault()
    const id = loginSel || data.asesores[0]?.id
    if (!id || !loginPw) return
    sessionStorage.setItem(SESION, id)
    setAsesorId(id)
    setExpandidos(null)
  }
  const salir = () => { sessionStorage.removeItem(SESION); setAsesorId(null); setLoginPw('') }

  // ── Login simulado ───────────────────────────────────────────────────────────
  if (!asesor) {
    return (
      <div className="gate">
        <form className="gate-card" onSubmit={entrar}>
          <img src={logoSM} alt="SM México" className="gate-logo" />
          <h1 className="gate-title">Portal del asesor</h1>
          <p className="gate-sub">Servicios académicos 2026-2027. Entra para ver tu hoja de colegios.</p>
          <select value={loginSel || data.asesores[0]?.id || ''} onChange={(e) => setLoginSel(e.target.value)}
            className="gate-input" style={{ marginBottom: 8 }} aria-label="Asesor">
            {data.asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <input type="password" value={loginPw} placeholder="Contraseña" className="gate-input"
            onChange={(e) => setLoginPw(e.target.value)} />
          <button className="gate-btn" type="submit" disabled={!loginPw}>Entrar</button>
          <p className="gate-sub" style={{ marginTop: 10, fontSize: 11, opacity: 0.75 }}>
            Mockup de demostración: cualquier contraseña funciona. El acceso real llegará con la autenticación por asesor.</p>
        </form>
      </div>
    )
  }

  // ── Datos del asesor ─────────────────────────────────────────────────────────
  const misColegios = data.colegios.filter((c) => c.asesorId === asesor.id)
  const carga = cargaAsesor(data.colegios, asesor.id)
  const pct = carga.servicios ? Math.round((carga.realizados / carga.servicios) * 100) : 0
  const ag = agendaAsesor(data.colegios, asesor.id, hoy)
  const refs = serviciosDeAsesor(data.colegios, asesor.id)
  const perAseCap = Math.round(DEFAULTS.tDay * DEFAULTS.dWeek * DEFAULTS.wMonth * 12)
  const pctCap = Math.min(100, Math.round((carga.usoProf / perAseCap) * 100))

  const proximos = refs
    .filter((r) => r.servicio.estatus !== 'realizado' && r.servicio.fechaPlan)
    .sort((a, b) => a.servicio.fechaPlan!.localeCompare(b.servicio.fechaPlan!))
    .slice(0, 6)

  const atencion = misColegios.map((c) => {
    const venc = c.servicios.filter((s) => urgencia(s, hoy) === 'vencido').length
    const sinFecha = c.servicios.filter((s) => s.estatus === 'pendiente' && !s.fechaPlan).length
    const satBaja = (c.satisfaccion ?? 0) > 0 && (c.satisfaccion ?? 0) <= 2
    return { c, venc, sinFecha, satBaja, score: venc * 100 + (satBaja ? 50 : 0) + sinFecha }
  }).filter((x) => x.venc > 0 || x.satBaja || x.sinFecha > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  const satDist = SATISFACCION.map((s) => ({ ...s, n: misColegios.filter((c) => c.satisfaccion === s.v).length }))
  const sinCalif = misColegios.filter((c) => !c.satisfaccion).length
  const nSmart = misColegios.filter((c) => c.campaign === 'SMART').length
  const nCore = misColegios.length - nSmart

  // cartera filtrada (búsqueda + filtros)
  const visibles = misColegios.filter((c) => {
    if (busca && !c.nombre.toLowerCase().includes(busca.toLowerCase())) return false
    if (fCamp !== 'todos' && c.campaign !== fCamp) return false
    if (fTier !== 'todos' && c.tier !== fTier) return false
    if (fEstado === 'vencidos' && !c.servicios.some((s) => urgencia(s, hoy) === 'vencido')) return false
    if (fEstado === 'pendientes' && !c.servicios.some((s) => s.estatus !== 'realizado')) return false
    if (fEstado === 'completos' && c.servicios.some((s) => s.estatus !== 'realizado')) return false
    return true
  })
  const filtrosActivos = busca !== '' || fCamp !== 'todos' || fTier !== 'todos' || fEstado !== 'todos'
  const limpiar = () => { setBusca(''); setFCamp('todos'); setFTier('todos'); setFEstado('todos') }

  // colapso: por defecto solo la primera visible abierta (o la única, si el filtro deja una)
  const abiertoCard = (id: string, idx: number) =>
    expandidos ? expandidos.has(id) : (idx === 0 || visibles.length === 1)
  const toggleCard = (id: string) => setExpandidos((p) => {
    const base = p ?? new Set(visibles.length ? [visibles[0].id] : [])
    const n = new Set(base)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const setServ = (colegioId: string, idx: number, patch: Partial<Servicio>) =>
    setData((d) => ({ ...d, colegios: setServicio(d.colegios, colegioId, idx, patch) }))
  const patchCol = (id: string, patch: Partial<Colegio>) =>
    setData((d) => ({ ...d, colegios: patchColegio(d.colegios, id, patch) }))

  const abrirAlerta = (colegioId?: string) => {
    setAlCol(colegioId ?? misColegios[0]?.id ?? ''); setAlTipo('materiales'); setAlDesc(''); setAlSent(false); setAlertaOpen(true)
  }
  const enviarAlerta = () => {
    if (!alCol || !alDesc.trim()) return
    setData((d) => agregarAlerta(d, { fecha: new Date().toISOString(), asesorId: asesor.id, colegioId: alCol, tipo: alTipo, descripcion: alDesc.trim() }))
    setAlSent(true)
  }

  const URG_BG: Record<Urgencia, string | undefined> = { vencido: '#FBF3E6', proximo: undefined, realizado: undefined, agendado: undefined, sinfecha: undefined }

  const servLabel = (s: Servicio, u: Urgencia) => (<>
    {SERV_SHORT[s.tipo]}
    {s.tipo === 'didac' && <span title="La ejecutan externos; tú la coordinas"
      style={{ fontSize: 8.5, fontWeight: 700, color: '#8A6D1C', background: '#F6EBCB', borderRadius: 4, padding: '1px 4px', marginLeft: 4, verticalAlign: 'middle' }}>EXT</span>}
    {u === 'vencido' && <span style={{ color: '#B5841C', fontSize: 9, marginLeft: 3 }}>· Vencido</span>}
    {u === 'proximo' && <span style={{ color: SMART, fontSize: 9, marginLeft: 3 }}>· Próximo</span>}
  </>)
  const tipoChips = (servicios: Servicio[]) => (['uso', 'prof', 'didac'] as const).map((t) => {
    const tot = servicios.filter((s) => s.tipo === t).length
    if (!tot) return null
    const done = servicios.filter((s) => s.tipo === t && s.estatus === 'realizado').length
    const full = done === tot
    return <span key={t} style={{ fontSize: 9.5, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
      background: full ? '#E3F1EC' : '#EEF1F4', color: full ? '#1F6B5C' : '#646A75' }}>{SERV_SHORT[t]} {done}/{tot}</span>
  })
  // nota (móvil): línea propia debajo del servicio
  const notaLinea = (colId: string, idx: number, s: Servicio) => {
    const key = colId + ':' + idx
    if (notaAbierta === key) return (
      <input value={s.nota ?? ''} autoFocus placeholder="Nota…"
        onChange={(e) => setServ(colId, idx, { nota: e.target.value || undefined })}
        onBlur={() => setNotaAbierta(null)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setNotaAbierta(null) }}
        style={{ width: '100%', fontSize: 12, padding: '5px 6px', marginTop: 4, boxSizing: 'border-box' }} />
    )
    if (s.nota) return (
      <div onClick={() => setNotaAbierta(key)} title="Toca para editar"
        style={{ fontSize: 11, color: '#8A8F99', fontStyle: 'italic', cursor: 'pointer', marginTop: 3, paddingLeft: 28 }}>“{s.nota}”</div>
    )
    return null
  }

  // ── Dashboard del asesor ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F5' }}>
      <header className="app-header">
        <div className="inner" style={{ maxWidth: 820, flexWrap: 'wrap', rowGap: 6 }}>
          <div className="brand">
            <img src={logoSM} alt="SM México" className="brand-logo" />
            <span className="brand-txt">Portal del asesor<small>Servicios académicos 2026-2027</small></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#646A75' }}>
            <span>{status}</span>
            <button className="sec" onClick={salir}>Salir</button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '16px 14px 110px' }}>
        <h1 style={{ marginBottom: 2 }}>Hola, {asesor.nombre}</h1>
        <div className="sub">Tu hoja de servicios académicos · {misColegios.length} colegios asignados.</div>

        {misColegios.length === 0 ? (
          <div className="panel"><div className="hint">Aún no tienes colegios asignados. Tu coordinador te los asignará pronto.</div></div>
        ) : (<>
          {/* KPIs */}
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(118px,1fr))' }}>
            <div className={`kpi ${ag.vencidos > 0 ? 'warn' : ''}`}><div className="v">{ag.vencidos}</div><div className="l">Vencidos</div></div>
            <div className="kpi"><div className="v">{ag.estaSemana}</div><div className="l">Próx. 7 días</div></div>
            <div className="kpi"><div className="v">{ag.porHacer}</div><div className="l">Por hacer</div></div>
            <div className="kpi good"><div className="v">{pct}%</div><div className="l">Avance ({carga.realizados}/{carga.servicios})</div></div>
          </div>
          <div style={{ height: 8, borderRadius: 8, background: '#E4E7EC', overflow: 'hidden', margin: '2px 0 14px' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: EST_COLOR.realizado }} />
          </div>

          {/* Agenda próxima */}
          <div className="panel">
            <h3>📅 Tu agenda próxima</h3>
            {proximos.length === 0
              ? <div className="hint" style={{ margin: 0 }}>No tienes servicios agendados con fecha. Ponles fecha planeada a tus pendientes para organizarte.</div>
              : proximos.map((r) => {
                const u = urgencia(r.servicio, hoy)
                return (
                  <div key={r.colegioId + ':' + r.idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', borderBottom: '1px solid #F0F2F5', background: URG_BG[u], borderRadius: 6 }}>
                    <div style={{ width: 46, flex: '0 0 auto', fontWeight: 700, fontSize: 12, color: u === 'vencido' ? '#B5841C' : '#2C2F36' }}>{fmtF(r.servicio.fechaPlan!)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.colegioNombre}</div>
                      <div style={{ fontSize: 11, color: '#646A75' }}>{servLabel(r.servicio, u)}</div>
                    </div>
                    <button className="sec" style={{ flex: '0 0 auto', minHeight: 34 }} title="Marcar realizado hoy"
                      onClick={() => setServ(r.colegioId, r.idx, { estatus: 'realizado', fechaReal: hoy })}>✓ Hecho</button>
                  </div>
                )
              })}
          </div>

          {/* Requieren atención */}
          {atencion.length > 0 && (
            <div className="panel">
              <h3>⚠️ Requieren tu atención</h3>
              {atencion.map(({ c, venc, sinFecha, satBaja }) => (
                <div key={c.id} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '5px 0', borderBottom: '1px solid #F0F2F5', fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 8, background: c.campaign === 'SMART' ? SMART : CORE, flex: '0 0 auto' }} />
                  <b style={{ marginRight: 2 }}>{c.nombre}</b>
                  {venc > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#8A6D1C', background: '#F6EBCB', borderRadius: 8, padding: '1px 7px' }}>{venc} vencido{venc > 1 ? 's' : ''}</span>}
                  {sinFecha > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: '#4A4F58', background: '#E9ECF0', borderRadius: 8, padding: '1px 7px' }}>{sinFecha} sin agendar</span>}
                  {satBaja && <span style={{ fontSize: 10, fontWeight: 600, color: '#8A6D1C', background: '#F6EBCB', borderRadius: 8, padding: '1px 7px' }}>satisfacción baja {SATISFACCION.find((s) => s.v === c.satisfaccion)?.emoji}</span>}
                </div>
              ))}
              <div className="hint" style={{ marginTop: 6 }}>Prioriza estos colegios: agenda sus servicios, atiende los vencidos y da seguimiento a la satisfacción.</div>
            </div>
          )}

          {/* Mi cartera */}
          <div className="panel">
            <h3>📊 Tu cartera</h3>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start', fontSize: 12 }}>
              <div>
                <div style={{ color: '#646A75', fontSize: 11, marginBottom: 4 }}>Colegios</div>
                <span style={{ color: SMART, fontWeight: 700 }}>{nSmart} SMART</span> · <span style={{ color: CORE, fontWeight: 700 }}>{nCore} CORE</span>
              </div>
              <div style={{ minWidth: 200, flex: 1 }}>
                <div style={{ color: '#646A75', fontSize: 11, marginBottom: 4 }}>Tu carga uso/prof vs tu capacidad anual (~{perAseCap})</div>
                <div style={{ height: 8, borderRadius: 8, background: '#EEF1F4', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pctCap}%`, background: carga.usoProf > perAseCap ? '#B5841C' : SMART }} />
                </div>
                <div style={{ fontSize: 10, color: carga.usoProf > perAseCap ? '#B5841C' : '#646A75', marginTop: 3 }}>
                  {carga.usoProf} de {perAseCap} ({pctCap}%){carga.usoProf > perAseCap ? ' · sobrecarga: habla con tu coordinador' : ''}</div>
              </div>
              <div>
                <div style={{ color: '#646A75', fontSize: 11, marginBottom: 4 }}>Satisfacción de tu cartera</div>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                  {satDist.map((s) => (
                    <span key={s.v} title={s.label} style={{ fontSize: 13, opacity: s.n ? 1 : 0.35 }}>{s.emoji}<b style={{ fontSize: 11, marginLeft: 2 }}>{s.n}</b></span>
                  ))}
                  <span style={{ fontSize: 10, color: '#8A8F99' }}>· {sinCalif} sin calificar</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mis colegios: búsqueda + filtros */}
          <h2 style={{ marginTop: 18 }}>Mis colegios</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '6px 0 10px' }}>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔍 Buscar colegio…"
              aria-label="Buscar colegio" style={{ flex: '1 1 150px', minWidth: 140, fontSize: 14, padding: '7px 10px' }} />
            <select value={fEstado} onChange={(e) => setFEstado(e.target.value as typeof fEstado)} style={{ width: 'auto', fontSize: 12, padding: '7px 6px' }}>
              <option value="todos">Todos</option>
              <option value="vencidos">Con vencidos</option>
              <option value="pendientes">Con pendientes</option>
              <option value="completos">Completados</option>
            </select>
            <select value={fCamp} onChange={(e) => setFCamp(e.target.value as typeof fCamp)} style={{ width: 'auto', fontSize: 12, padding: '7px 6px' }}>
              <option value="todos">Ambas</option>
              <option value="SMART">SMART</option>
              <option value="CORE">CORE</option>
            </select>
            <select value={fTier} onChange={(e) => setFTier(e.target.value as typeof fTier)} style={{ width: 'auto', fontSize: 12, padding: '7px 6px' }}>
              <option value="todos">Todo tipo</option>
              {TIER_SEED.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            {filtrosActivos && <button className="sec" onClick={limpiar}>× Limpiar</button>}
          </div>
          {filtrosActivos && <div className="hint" style={{ margin: '0 0 8px' }}>Mostrando {visibles.length} de {misColegios.length} colegios.</div>}

          {visibles.length === 0 ? (
            <div className="hint">Ningún colegio coincide. <button className="sec" onClick={limpiar}>Limpiar filtros</button></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
              {visibles.map((c, idxV) => {
                const done = c.servicios.filter((s) => s.estatus === 'realizado').length
                const total = c.servicios.length
                const abierto = abiertoCard(c.id, idxV)
                return (
                  <div key={c.id} className="panel" style={{ margin: 0 }}>
                    <div onClick={() => toggleCard(c.id)} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, color: '#646A75', width: 12 }}>{abierto ? '▾' : '▸'}</span>
                      <span style={{ width: 9, height: 9, borderRadius: 9, flex: '0 0 auto', background: c.campaign === 'SMART' ? SMART : CORE }} />
                      <b style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</b>
                      {c.satisfaccion ? <span title={SATISFACCION.find((s) => s.v === c.satisfaccion)?.label} style={{ fontSize: 15 }}>{SATISFACCION.find((s) => s.v === c.satisfaccion)?.emoji}</span> : null}
                      <span style={{ fontSize: 11, color: '#646A75', flex: '0 0 auto' }}>{c.campaign} · {tierLabel(c.tier)}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 5, background: '#EEF1F4', overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: total ? `${(done / total) * 100}%` : '0%', background: EST_COLOR.realizado }} />
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      {tipoChips(c.servicios)}
                      <span style={{ fontSize: 10, color: '#646A75' }}>· {done}/{total} realizados</span>
                      {(c.serie || c.ingles) && <span style={{ fontSize: 10, color: '#8A8F99' }}>· {[c.serie, c.ingles].filter(Boolean).join(' · ')}</span>}
                    </div>
                    {abierto && (<>
                      {c.servicios.map((s, i) => {
                        const u = urgencia(s, hoy)
                        const key = c.id + ':' + i
                        return (
                          <Fragment key={i}>
                            <div style={{ background: URG_BG[u], borderBottom: '1px solid #F0F2F5', padding: '7px 4px', borderRadius: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" checked={s.estatus === 'realizado'} aria-label="Marcar realizado"
                                  style={{ transform: 'scale(1.2)', flex: '0 0 auto' }}
                                  onChange={(e) => e.target.checked
                                    ? setServ(c.id, i, { estatus: 'realizado', fechaReal: s.fechaReal ?? hoy })
                                    : setServ(c.id, i, { estatus: s.fechaPlan ? 'agendado' : 'pendiente', fechaReal: undefined })} />
                                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600 }}>{servLabel(s, u)}</span>
                                <select value={s.estatus} aria-label="Estatus del servicio"
                                  onChange={(e) => { const est = e.target.value as Estatus; setServ(c.id, i, est === 'realizado' && !s.fechaReal ? { estatus: est, fechaReal: hoy } : { estatus: est }) }}
                                  style={{ borderLeft: `3px solid ${EST_COLOR[s.estatus]}`, fontSize: 12, padding: '5px 4px', width: 'auto', minWidth: 104, flex: '0 0 auto' }}>
                                  {ESTATUS.map((e) => <option key={e} value={e}>{EST_LABEL[e]}</option>)}
                                </select>
                                <button title={s.nota ? 'Editar nota' : 'Agregar nota'} onClick={() => setNotaAbierta((k) => k === key ? null : key)}
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, opacity: s.nota ? 1 : 0.4, flex: '0 0 auto', padding: '2px 4px' }}>✎</button>
                              </div>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 5, paddingLeft: 28, fontSize: 11, color: '#646A75', flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Plan.
                                  <input type="date" aria-label="Fecha planeada" value={s.fechaPlan ?? ''}
                                    onChange={(e) => setServ(c.id, i, { fechaPlan: e.target.value || undefined })}
                                    style={{ fontSize: 12, padding: '4px 3px', width: 122 }} /></label>
                                {s.estatus === 'realizado'
                                  ? <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Real
                                      <input type="date" aria-label="Fecha real" value={s.fechaReal ?? ''}
                                        onChange={(e) => setServ(c.id, i, { fechaReal: e.target.value || undefined })}
                                        style={{ fontSize: 12, padding: '4px 3px', width: 122 }} /></label>
                                  : <span>Real —</span>}
                              </div>
                              {notaLinea(c.id, i, s)}
                            </div>
                          </Fragment>
                        )
                      })}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, fontSize: 11, color: '#646A75', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 1 }}>Satisfacción:
                          {SATISFACCION.map((s) => (
                            <button key={s.v} title={s.label} onClick={() => patchCol(c.id, { satisfaccion: c.satisfaccion === s.v ? undefined : s.v })}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 19, lineHeight: 1, padding: '0 2px', opacity: c.satisfaccion === s.v ? 1 : 0.3, filter: c.satisfaccion === s.v ? 'none' : 'grayscale(1)' }}>{s.emoji}</button>
                          ))}
                        </span>
                        <button className="sec" style={{ marginLeft: 'auto' }} onClick={() => abrirAlerta(c.id)}>🚨 Reportar caso</button>
                      </div>
                      <textarea value={c.notasGenerales ?? ''} placeholder="Notas generales del colegio…"
                        onChange={(e) => patchCol(c.id, { notasGenerales: e.target.value || undefined })}
                        style={{ width: '100%', fontSize: 13, padding: '6px 8px', marginTop: 6, boxSizing: 'border-box', minHeight: 44, resize: 'vertical' }} />
                    </>)}
                  </div>
                )
              })}
            </div>
          )}
        </>)}
      </div>

      {/* FAB: caso crítico */}
      {misColegios.length > 0 && (
        <button onClick={() => abrirAlerta()} aria-label="Reportar caso crítico"
          style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 60, background: ROJO, color: '#fff', border: 'none',
            borderRadius: 999, padding: '13px 18px', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(0,0,0,.28)', cursor: 'pointer' }}>🚨 Caso crítico</button>
      )}

      {/* Modal de alerta (bottom sheet) */}
      {alertaOpen && (
        <div onClick={() => setAlertaOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(20,22,26,.45)', zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: '16px 16px 24px', width: '100%', maxWidth: 560, boxSizing: 'border-box', boxShadow: '0 -6px 24px rgba(0,0,0,.18)' }}>
            {alSent ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 34 }}>✅</div>
                <h3 style={{ margin: '6px 0 4px' }}>Alerta enviada</h3>
                <p style={{ fontSize: 13, color: '#646A75', margin: '0 0 14px' }}>Tu coordinador la verá en su tablero de planeación y te contactará.</p>
                <button className="gate-btn" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => setAlertaOpen(false)}>Cerrar</button>
              </div>
            ) : (<>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>🚨 Reportar caso crítico</h3>
                <button onClick={() => setAlertaOpen(false)} aria-label="Cerrar"
                  style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#646A75', padding: 4 }}>×</button>
              </div>
              <label style={{ display: 'block', fontSize: 12, color: '#646A75', marginBottom: 8 }}>Colegio
                <select value={alCol} onChange={(e) => setAlCol(e.target.value)} style={{ marginTop: 3, fontSize: 15, padding: '8px 8px' }}>
                  {misColegios.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <label style={{ display: 'block', fontSize: 12, color: '#646A75', marginBottom: 8 }}>Tipo de problema
                <select value={alTipo} onChange={(e) => setAlTipo(e.target.value as ProblemaKey)} style={{ marginTop: 3, fontSize: 15, padding: '8px 8px' }}>
                  {PROBLEMAS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </label>
              <label style={{ display: 'block', fontSize: 12, color: '#646A75', marginBottom: 12 }}>Describe el caso
                <textarea value={alDesc} autoFocus onChange={(e) => setAlDesc(e.target.value)} placeholder="¿Qué está pasando y qué necesitas?"
                  style={{ width: '100%', marginTop: 3, fontSize: 15, padding: '8px 10px', minHeight: 84, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="sec" style={{ flex: 1, minHeight: 42 }} onClick={() => setAlertaOpen(false)}>Cancelar</button>
                <button disabled={!alCol || !alDesc.trim()} onClick={enviarAlerta}
                  style={{ flex: 2, minHeight: 42, background: ROJO, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', opacity: (!alCol || !alDesc.trim()) ? 0.5 : 1 }}>
                  Enviar alerta</button>
              </div>
            </>)}
          </div>
        </div>
      )}
    </div>
  )
}
