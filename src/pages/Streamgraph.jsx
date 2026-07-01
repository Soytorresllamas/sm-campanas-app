import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts'

const MONTHS = ["Sep'26","Oct'26","Nov","Dic","Ene'27","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep'27","Oct'27"]
const SERIES = [
  { k: 'Su', name: 'SMART · uso',            cen: 2,   sig: 1.5, pk: 458,  fill: '#E40521' },
  { k: 'Sp', name: 'SMART · profundización', cen: 5,   sig: 1.5, pk: 321,  fill: '#2C8A7B' },
  { k: 'Sd', name: 'SMART · didácticas esp.',cen: 7,   sig: 1.3, pk: 160,  fill: '#B5841C' },
  { k: 'Cd', name: 'CORE · didácticas esp.', cen: 7,   sig: 1.4, pk: 1500, fill: '#DEC899' },
  { k: 'Cu', name: 'CORE · uso',             cen: 9.5, sig: 1.3, pk: 1047, fill: '#F38F9B' },
  { k: 'Cp', name: 'CORE · profundización',  cen: 11,  sig: 1.3, pk: 733,  fill: '#A0CAC4' },
]
const g = (i, c, s, p) => p * Math.exp(-0.5 * ((i - c) / s) ** 2)

export default function Streamgraph() {
  const data = useMemo(() => MONTHS.map((m, i) => {
    const o = { m }
    SERIES.forEach((s) => { o[s.k] = Math.round(g(i, s.cen, s.sig, s.pk)) })
    return o
  }), [])

  return (
    <div>
      <h1>Servicios académicos · streamgraph de perfiles</h1>
      <div className="sub">SMART fluye uso → profundización → didácticas específicas. CORE entra por didácticas específicas
        (primavera 2027) y pasa a uso y profundización en jun-jul-ago 2027. Tono oscuro = SMART, claro = CORE.</div>

      <div className="chartbox">
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={data} stackOffset="silhouette" margin={{ top: 20, right: 16, left: 8, bottom: 6 }}>
            <XAxis dataKey="m" fontSize={10.5} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v, n) => [v, SERIES.find((s) => s.name === n)?.name || n]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {SERIES.map((s) => (
              <Area key={s.k} type="monotone" dataKey={s.k} name={s.name} stackId="1"
                stroke="#fff" strokeWidth={0.6} fill={s.fill} fillOpacity={1} />
            ))}
            <ReferenceLine x="Sep'26" stroke="#7A4A86" strokeDasharray="2 3" strokeWidth={1.5}
              label={{ value: 'Convención General SM · 7-9 sep', position: 'top', fontSize: 10.5, fill: '#7A4A86' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="hint">Volúmenes reales (SMART 458/321/160; CORE 1,745/1,047/733); las curvas mensuales son ilustrativas y ajustables.</div>
    </div>
  )
}
