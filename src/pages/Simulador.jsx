import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { MONTHS, STREAMS, DEF_CURVES, DEFAULTS, genCurve, compute, R } from '../data/model.js'

const NAVY = '#185FA5', GREEN = '#1D9E75', NAVYL = '#85B7EB', AMBER = '#D85A30'

function Num({ label, unit, value, onChange, step = 1, min = 0, max }) {
  return (
    <div className="fld">
      <label>{label} {unit && <span className="u">{unit}</span>}</label>
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
    </div>
  )
}

export default function Simulador() {
  const [n, setN] = useState({ ...DEFAULTS })
  const [curves, setCurves] = useState(() => JSON.parse(JSON.stringify(DEF_CURVES)))
  const [shapes, setShapes] = useState(() => STREAMS.map((s) => ({ focal: s.focal, spread: s.spread })))
  const [intens, setIntens] = useState(1)
  const [linked, setLinked] = useState(true)
  const [scen, setScen] = useState({ A: null, B: null })

  const set = (key, v) => setN((p) => ({ ...p, [key]: v }))
  const { rows, k } = useMemo(() => compute({ ...n, curves }), [n, curves])

  const applyIntensity = (f) => {
    setIntens(f); setLinked(true)
    setN((p) => ({ ...p, tUso: Math.round(1 + 2 * f), tProf: Math.round(2 + 1 * f), tAdic: 1 }))
  }
  const setShape = (i, field, v) => {
    const ns = shapes.map((s, j) => j === i ? { ...s, [field]: v } : s)
    setShapes(ns)
    const st = STREAMS[i]
    setCurves((p) => ({ ...p, [st.k]: genCurve(ns[i].focal, ns[i].spread, st.win) }))
  }
  const reset = () => {
    setN({ ...DEFAULTS }); setCurves(JSON.parse(JSON.stringify(DEF_CURVES)))
    setShapes(STREAMS.map((s) => ({ focal: s.focal, spread: s.spread }))); setIntens(1); setLinked(true)
  }
  const saveScen = (slot) => setScen((p) => ({ ...p, [slot]: { ...k } }))
  const exportCSV = () => {
    let csv = 'Mes,SMART,CORE,Total,Uso+Prof,Cubierto empl,Ext uso-prof,Didacticas ext,Total ext,Retencion,Conquista\n'
    rows.forEach((x) => { csv += [x.m, R(x.smart), R(x.core), R(x.smart + x.core), R(x.up), R(x.cov), R(x.extUP), R(x.adicExt), R(x.totExt), R(x.ret), R(x.conq)].join(',') + '\n' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'coberturas_asesores.csv'; a.click()
  }

  const kpis = [
    ['Talleres totales', R(k.totalT), ''],
    ['Mes pico (total)', `${k.peak.m} · ${R(k.peak.smart + k.peak.core)}`, ''],
    ['Externos · mes pico', `${k.extPeak.m} · ${R(k.extPeak.totExt)}`, 'warn'],
    ['Cabezas externas (pico)', k.cabExtPico, 'warn'],
    ['Meses con sobrecupo', k.meses, k.meses > 0 ? 'warn' : ''],
    ['Util. empleados (anual)', `${R(k.utilA * 100)}%`, ''],
    ['Conquista total', R(k.totConq), 'good'],
    ['% conquista', `${R(k.pctConq * 100)}%`, 'good'],
    ['Conquista · mes pico', `${k.conqPeak.m} · ${R(k.conqPeak.conq)}`, 'good'],
  ]
  const cmpRows = [
    ['Talleres totales', (x) => R(x.totalT)],
    ['Externos · pico', (x) => `${R(x.extPeak.totExt)} (${x.extPeak.m})`],
    ['Cabezas externas pico', (x) => x.cabExtPico],
    ['Util. empleados anual', (x) => `${R(x.utilA * 100)}%`],
    ['Conquista total', (x) => R(x.totConq)],
    ['% conquista', (x) => `${R(x.pctConq * 100)}%`],
  ]

  return (
    <div>
      <h1>Simulador de coberturas y asesores · 26-27</h1>
      <div className="sub">Empleados cubren uso/profundización; externos cubren el resto y todas las didácticas específicas.
        <b style={{ color: 'var(--pur)' }}> ◆ Convención Comercial (Kick-off) 8-10 sep 2026.</b></div>

      <div className="cols">
        <div>
          <div className="panel">
            <h3>Escenario</h3>
            <div className="seg">
              {[['Conservador', 0], ['Base', 0.5], ['Techo', 1]].map(([lbl, f]) => (
                <button key={lbl} className={Math.abs(intens - f) < 0.001 && linked ? 'on' : ''} onClick={() => applyIntensity(f)}>{lbl}</button>
              ))}
            </div>
            <div className="fld">
              <label>Intensidad de talleres <span className="u">(conservador → techo)</span></label>
              <input type="range" min="0" max="1" step="0.05" value={intens} onChange={(e) => applyIntensity(parseFloat(e.target.value))} />
            </div>
            <div className="row-btn">
              <button className="sec" onClick={() => saveScen('A')}>Guardar A</button>
              <button className="sec" onClick={() => saveScen('B')}>Guardar B</button>
              <button className="sec" onClick={reset}>Restablecer</button>
              <button className="sec" onClick={exportCSV}>CSV</button>
            </div>
          </div>

          <div className="panel">
            <h3>Capacidad empleados</h3>
            <Num label="Asesores empleados SM" value={n.nAse} onChange={(v) => set('nAse', v)} />
            <div className="three">
              <Num label="Talleres/día" step={0.5} value={n.tDay} onChange={(v) => set('tDay', v)} />
              <Num label="Días/sem" value={n.dWeek} onChange={(v) => set('dWeek', v)} />
              <Num label="Sem/mes" step={0.01} value={n.wMonth} onChange={(v) => set('wMonth', v)} />
            </div>
            <Num label="Talleres/mes por externo" value={n.prodExt} min={1} onChange={(v) => set('prodExt', v)} />
            <div className="capnote">Capacidad ≈ {R(k.cap)} talleres/mes ({n.nAse} asesores)</div>
          </div>

          <div className="panel">
            <h3>Talleres por colegio</h3>
            <div className="three">
              <Num label="Uso" value={n.tUso} onChange={(v) => { setLinked(false); set('tUso', v) }} />
              <Num label="Profund." value={n.tProf} onChange={(v) => { setLinked(false); set('tProf', v) }} />
              <Num label="Didác." value={n.tAdic} onChange={(v) => { setLinked(false); set('tAdic', v) }} />
            </div>
            <div className="hint">La intensidad ajusta uso y profundización; editar a mano la desvincula.</div>
          </div>

          <div className="panel">
            <h3>Volúmenes (colegios)</h3>
            <div className="two">
              <Num label="SMART uso" value={n.vUso} onChange={(v) => set('vUso', v)} />
              <Num label="SMART profund." value={n.vProf} onChange={(v) => set('vProf', v)} />
              <Num label="SMART didác." value={n.vAdicS} onChange={(v) => set('vAdicS', v)} />
              <Num label="CORE didác." value={n.vAdicC} onChange={(v) => set('vAdicC', v)} />
            </div>
          </div>

          <div className="panel">
            <h3>Retención vs conquista</h3>
            <div className="two">
              <Num label="Retención SMART" unit="%" max={100} value={n.retS} onChange={(v) => set('retS', v)} />
              <Num label="Retención CORE" unit="%" max={100} value={n.retC} onChange={(v) => set('retC', v)} />
            </div>
            <div className="hint">El resto es conquista (clientes nuevos), aplicado a los talleres de cada campaña, mes a mes.</div>
          </div>

          <div className="panel">
            <h3>Curvas de cierre</h3>
            {STREAMS.map((s, i) => (
              <div key={s.k} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 62px', gap: 6, alignItems: 'center', marginBottom: 6, fontSize: 11 }}>
                <span>{s.lbl}</span>
                <input type="range" min="0.5" max="3" step="0.1" value={shapes[i].spread} onChange={(e) => setShape(i, 'spread', parseFloat(e.target.value))} />
                <select value={shapes[i].focal} onChange={(e) => setShape(i, 'focal', parseInt(e.target.value))}>
                  {Array.from({ length: s.win[1] - s.win[0] + 1 }, (_, j) => s.win[0] + j).map((mi) => (
                    <option key={mi} value={mi}>{MONTHS[mi]}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="kpis">
            {kpis.map(([l, v, c]) => (
              <div key={l} className={`kpi ${c}`}><div className="v">{v}</div><div className="l">{l}</div></div>
            ))}
          </div>

          <h2>1 · Coberturas de talleres por mes (SMART vs CORE)</h2>
          <div className="chartbox">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={rows} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v) => R(v)} /><Legend />
                <Bar dataKey="smart" name="SMART" stackId="a" fill={NAVY} />
                <Bar dataKey="core" name="CORE" stackId="a" fill={GREEN} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h2>2 · Reparto empleados vs externos</h2>
          <div className="chartbox">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={rows} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v) => R(v)} /><Legend />
                <Bar dataKey="cov" name="Empleados (uso/prof)" stackId="b" fill={NAVY} />
                <Bar dataKey="extUP" name="Externos uso/prof" stackId="b" fill="rgba(24,95,165,.45)" />
                <Bar dataKey="adicExt" name="Externos didácticas" stackId="b" fill={GREEN} />
                <ReferenceLine y={R(k.cap)} stroke={AMBER} strokeDasharray="5 4" label={{ value: 'capacidad', fontSize: 10, fill: AMBER, position: 'right' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h2>3 · Retención vs conquista por mes</h2>
          <div className="chartbox">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={rows} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v) => R(v)} /><Legend />
                <Bar dataKey="ret" name="Retención" stackId="c" fill={NAVYL} />
                <Bar dataKey="conq" name="Conquista" stackId="c" fill={GREEN} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {(scen.A || scen.B) && (
            <>
              <h2>Comparar escenarios</h2>
              <table>
                <thead><tr><th>Métrica</th><th>Actual</th><th>A</th><th>B</th></tr></thead>
                <tbody>
                  {cmpRows.map(([l, fn]) => (
                    <tr key={l}><td>{l}</td><td>{fn(k)}</td><td>{scen.A ? fn(scen.A) : '—'}</td><td>{scen.B ? fn(scen.B) : '—'}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="hint">Guarda A y B para fijar referencias.</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
