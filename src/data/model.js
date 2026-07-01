export const MONTHS = ["Oct","Nov","Dic","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep"];

// Etiquetas visibles: "Adicionales" se renombró a "Didácticas específicas".
export const STREAMS = [
  { k: "uso",   lbl: "SMART · uso",             win: [0,4], focal: 1, spread: 1.2 },
  { k: "prof",  lbl: "SMART · profundización",  win: [2,6], focal: 4, spread: 1.4 },
  { k: "adicS", lbl: "SMART · didácticas esp.", win: [5,8], focal: 6, spread: 1.2 },
  { k: "adicC", lbl: "CORE · didácticas esp.",  win: [3,9], focal: 5, spread: 1.8 },
];

export const DEF_CURVES = {
  uso:  [.30,.35,.07,.08,.20,0,0,0,0,0,0,0],
  prof: [0,0,.10,.20,.25,.25,.20,0,0,0,0,0],
  adicS:[0,0,0,0,0,.25,.30,.25,.20,0,0,0],
  adicC:[0,0,0,.05,.10,.28,.27,.15,.10,.05,0,0],
};

// Perfiles de servicio canónicos — ÚNICA fuente de los volúmenes reales de colegios.
// Los 4 primeros (`src`) comparten curva mensual con el Simulador (DEF_CURVES) para que
// el streamgraph y el simulador no puedan divergir. Los 2 de CORE (uso/prof) son
// aguas abajo (adopción en verano 2027), fuera del alcance operativo del simulador.
// SMART = familia azul (variantes por tipo de servicio) · CORE = familia teal (variantes).
export const SERVICE_PROFILES = [
  { k: "Su", camp: "SMART", name: "Uso",                 vol: 458,  fill: "#1F5AA6", src: "uso" },
  { k: "Sp", camp: "SMART", name: "Profundización",      vol: 321,  fill: "#4A82C4", src: "prof" },
  { k: "Sd", camp: "SMART", name: "Didácticas específ.", vol: 160,  fill: "#9BBFE8", src: "adicS" },
  { k: "Cd", camp: "CORE",  name: "Didácticas específ.", vol: 1745, fill: "#2C8A7B", src: "adicC" },
  { k: "Cu", camp: "CORE",  name: "Uso",                 vol: 1047, fill: "#63AE9D", curve: [0,0,0,0,0,0,0,.02,.06,.14,.24,.26,.18,.10] },
  { k: "Cp", camp: "CORE",  name: "Profundización",      vol: 733,  fill: "#AAD0C8", curve: [0,0,0,0,0,0,0,0,.02,.06,.12,.22,.30,.28] },
];
const volOf = (k) => SERVICE_PROFILES.find((p) => p.k === k).vol;

export const DEFAULTS = {
  nAse:10, tDay:2, dWeek:5, wMonth:4.33, prodExt:30,
  tUso:3, tProf:3, tAdic:1,
  vUso:volOf("Su"), vProf:volOf("Sp"), vAdicS:volOf("Sd"), vAdicC:volOf("Cd"),
  retS:94, retC:89,
};

export const genCurve = (focal, spread, win) => {
  const a = Array(12).fill(0);
  for (let i = win[0]; i <= win[1]; i++) a[i] = Math.exp(-0.5 * ((i - focal) / spread) ** 2);
  return a;
};
const norm = (a) => { const s = a.reduce((x, y) => x + y, 0) || 1; return a.map((v) => v / s); };
export const R = (x) => Math.round(x);

export function compute(st) {
  const cap = st.nAse * st.tDay * st.dWeek * st.wMonth;
  const cu = norm(st.curves.uso), cp = norm(st.curves.prof), cas = norm(st.curves.adicS), cac = norm(st.curves.adicC);
  const rS = (st.retS || 0) / 100, rC = (st.retC || 0) / 100;
  const rows = [];
  for (let i = 0; i < 12; i++) {
    const usoT = st.vUso * cu[i] * st.tUso, profT = st.vProf * cp[i] * st.tProf;
    const adicST = st.vAdicS * cas[i] * st.tAdic, adicCT = st.vAdicC * cac[i] * st.tAdic;
    const smart = usoT + profT + adicST, core = adicCT, up = usoT + profT;
    const cov = Math.min(up, cap), extUP = Math.max(0, up - cap), adicExt = adicST + adicCT;
    const retSmart = smart * rS, conqSmart = smart * (1 - rS);
    const retCore = core * rC, conqCore = core * (1 - rC);
    const ret = retSmart + retCore, conq = conqSmart + conqCore;
    rows.push({ m: MONTHS[i], usoT, profT, adicST, adicCT, smart, core, up, cap, cov, extUP, adicExt,
      totExt: extUP + adicExt, util: cap ? cov / cap : 0,
      ret, conq, retSmart, conqSmart, retCore, conqCore });
  }
  const sum = (f) => rows.reduce((s, x) => s + f(x), 0);
  const totalT = sum((x) => x.smart + x.core);
  const peak = rows.reduce((a, b) => (b.smart + b.core) > (a.smart + a.core) ? b : a);
  const extPeak = rows.reduce((a, b) => b.totExt > a.totExt ? b : a);
  const meses = rows.filter((x) => x.extUP > 0.5).length;
  const totRet = sum((x) => x.ret), totConq = sum((x) => x.conq);
  const totSmart = sum((x) => x.smart), totCore = sum((x) => x.core);
  const totRetSmart = sum((x) => x.retSmart), totConqSmart = sum((x) => x.conqSmart);
  const totRetCore = sum((x) => x.retCore), totConqCore = sum((x) => x.conqCore);
  const conqPeak = rows.reduce((a, b) => b.conq > a.conq ? b : a);
  const k = {
    cap, totalT, peak, extPeak, meses,
    utilA: cap ? sum((x) => x.cov) / (cap * 12) : 0,
    utilP: Math.max(...rows.map((x) => x.util)),
    cabExtPico: Math.ceil(extPeak.totExt / (st.prodExt || 1)),
    totExt: sum((x) => x.totExt), totRet, totConq,
    pctConq: (totRet + totConq) ? totConq / (totRet + totConq) : 0, conqPeak,
    totSmart, totCore, totRetSmart, totConqSmart, totRetCore, totConqCore,
    pctConqSmart: totSmart ? totConqSmart / totSmart : 0,
    pctConqCore: totCore ? totConqCore / totCore : 0,
  };
  return { rows, k };
}
