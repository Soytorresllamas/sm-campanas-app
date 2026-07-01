import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

const AX = ["Sep'26","Oct'26","Nov","Dic","Ene'27","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep'27","Oct'27"]

// Volúmenes reales de colegios por perfil (ciclo 26-27). El total de cada banda
// = su volumen real; la distribución mensual es una curva ilustrativa y ajustable.
const PROFILES = [
  { k: 'Su', name: 'Uso',                 camp: 'SMART', vol: 458,  cen: 2,    sig: 1.6, fill: '#E40521' },
  { k: 'Sp', name: 'Profundización',      camp: 'SMART', vol: 321,  cen: 4,    sig: 1.6, fill: '#2C8A7B' },
  { k: 'Sd', name: 'Didácticas específ.', camp: 'SMART', vol: 160,  cen: 6,    sig: 1.4, fill: '#B5841C' },
  { k: 'Cd', name: 'Didácticas específ.', camp: 'CORE',  vol: 1745, cen: 7.5,  sig: 1.7, fill: '#DEC899' },
  { k: 'Cu', name: 'Uso',                 camp: 'CORE',  vol: 1047, cen: 10,   sig: 1.5, fill: '#F38F9B' },
  { k: 'Cp', name: 'Profundización',      camp: 'CORE',  vol: 733,  cen: 11.5, sig: 1.5, fill: '#A0CAC4' },
]
const gauss = (i, c, s) => Math.exp(-0.5 * ((i - c) / s) ** 2)
const fmt = (n) => n.toLocaleString('es-MX')

// Marcador de convención posicionado a la derecha de la línea para que no se corte.
function MarkerLabel({ viewBox, text, color, line = 0 }) {
  const { x, y } = viewBox
  return (
    <text x={x + 6} y={y + 14 + line * 15} fill={color} fontSize={10} fontWeight={600} textAnchor="start">
      {text}
    </text>
  )
}

export default function Streamgraph() {
  const { series, data, totSmart, totCore } = useMemo(() => {
    const series = PROFILES.map((p) => {
      const raw = AX.map((_, i) => gauss(i, p.cen, p.sig))
      const s = raw.reduce((a, b) => a + b, 0)
      return { ...p, monthly: raw.map((w) => Math.round((p.vol * w) / s)) }
    })
    const data = AX.map((m, i) => {
      const o = { m }
      series.forEach((p) => { o[p.k] = p.monthly[i] })
      return o
    })
    const totSmart = PROFILES.filter((p) => p.camp === 'SMART').reduce((a, b) => a + b.vol, 0)
    const totCore = PROFILES.filter((p) => p.camp === 'CORE').reduce((a, b) => a + b.vol, 0)
    return { series, data, totSmart, totCore }
  }, [])

  const maxVol = Math.max(...PROFILES.map((p) => p.vol))
  const grand = totSmart + totCore
  const byName = Object.fromEntries(series.map((p) => [p.k, p.name]))

  const Ledger = ({ camp, subtotal }) => (
    <div className="ledger">
      <div className="ledger-head">
        <span className={`camp-dot ${camp === 'SMART' ? 'sm' : 'co'}`} />
        Campaña {camp}
        <span className="ledger-sub">{fmt(subtotal)} colegios · {Math.round(subtotal / grand * 100)}%</span>
      </div>
      {series.filter((p) => p.camp === camp).map((p) => (
        <div key={p.k} className="ledger-row">
          <span className="sw" style={{ background: p.fill }} />
          <span className="ledger-name">{p.name}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${p.vol / maxVol * 100}%`, background: p.fill }} /></span>
          <span className="ledger-val">{fmt(p.vol)}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <h1>Perfiles de servicio académico · 26-27</h1>
      <div className="sub">SMART fluye <b>uso → profundización → didácticas específicas</b> (oct-feb). CORE entra por
        <b> didácticas específicas</b> en primavera 2027 y pasa a uso y profundización en el verano. El total de cada
        banda es el volumen real de colegios; tono intenso = SMART, tono claro = CORE.</div>

      <div className="ledger-wrap">
        <Ledger camp="SMART" subtotal={totSmart} />
        <Ledger camp="CORE" subtotal={totCore} />
      </div>

      <h2>Flujo de talleres por mes</h2>
      <div className="chartbox">
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={data} margin={{ top: 24, right: 18, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EFF1F4" vertical={false} />
            <XAxis dataKey="m" fontSize={10.5} tickLine={false} axisLine={{ stroke: '#D2D7DE' }} />
            <YAxis fontSize={10.5} tickLine={false} axisLine={false} width={46}
              label={{ value: 'talleres / mes', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#646A75', dy: 40 }} />
            <Tooltip
              formatter={(v, k) => [`${fmt(v)} talleres`, byName[k]]}
              labelFormatter={(l) => `Mes: ${l}`}
              contentStyle={{ borderRadius: 10, border: '1px solid #E3E6EB', fontSize: 12 }} />
            {series.map((p) => (
              <Area key={p.k} type="monotone" dataKey={p.k} name={p.name} stackId="1"
                stroke="#fff" strokeWidth={0.8} fill={p.fill} fillOpacity={1} isAnimationActive={false} />
            ))}
            <ReferenceLine x="Sep'26" stroke="#7A4A86" strokeDasharray="3 3" strokeWidth={1.4}
              label={<MarkerLabel text="Convención General SM · 7-9 sep" color="#7A4A86" />} />
            <ReferenceLine x="Feb" stroke="#B5841C" strokeDasharray="3 3" strokeWidth={1.4}
              label={<MarkerLabel text="Tope SMART · feb" color="#B5841C" line={1} />} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="hint">Volúmenes reales · SMART {fmt(458)}/{fmt(321)}/{fmt(160)} · CORE {fmt(1745)}/{fmt(1047)}/{fmt(733)}.
        La forma mensual de cada curva es ilustrativa; los totales anuales son los planeados.</div>
    </div>
  )
}
