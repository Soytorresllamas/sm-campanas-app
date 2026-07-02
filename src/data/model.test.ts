import { describe, expect, it } from 'vitest';
import {
  MONTHS, DEF_CURVES, DEFAULTS, SERVICE_PROFILES,
  genCurve, compute, R,
  type ComputeInput, type Curves,
} from './model';

const baseInput = (overrides: Partial<ComputeInput> = {}): ComputeInput => ({
  curves: DEF_CURVES,
  ...DEFAULTS,
  ...overrides,
});

describe('R', () => {
  it('redondea al entero más cercano', () => {
    expect(R(4.4)).toBe(4);
    expect(R(4.5)).toBe(5);
    expect(R(-1.5)).toBe(-1); // Math.round redondea hacia +Infinity en el punto medio
  });
});

describe('genCurve', () => {
  it('es cero fuera de la ventana [win0, win1]', () => {
    const c = genCurve(4, 1.4, [2, 6]);
    expect(c[0]).toBe(0); expect(c[1]).toBe(0);
    expect(c[7]).toBe(0); expect(c[11]).toBe(0);
  });

  it('alcanza su máximo (1) exactamente en el mes focal', () => {
    const c = genCurve(4, 1.4, [2, 6]);
    expect(c[4]).toBeCloseTo(1, 10);
    expect(c[3]).toBeLessThan(1);
    expect(c[5]).toBeLessThan(1);
  });

  it('devuelve un arreglo de 12 meses siempre', () => {
    expect(genCurve(0, 1, [0, 0])).toHaveLength(12);
  });
});

describe('compute — capacidad', () => {
  it('cap = nAse * tDay * dWeek * wMonth', () => {
    const { k } = compute(baseInput({ nAse: 10, tDay: 2, dWeek: 5, wMonth: 4 }));
    expect(k.cap).toBeCloseTo(10 * 2 * 5 * 4, 6);
  });

  it('con capacidad 0 (sin asesores), cov es 0 en todos los meses y no hay NaN', () => {
    const { rows, k } = compute(baseInput({ nAse: 0 }));
    expect(k.cap).toBe(0);
    rows.forEach((r) => { expect(r.cov).toBe(0); expect(r.util).toBe(0); });
    expect(k.utilA).toBe(0);
    expect(Number.isNaN(k.utilA)).toBe(false);
  });

  it('sin capacidad, todo lo de uso+profundización se vuelve cobertura externa (extUP = up)', () => {
    const { rows } = compute(baseInput({ nAse: 0 }));
    rows.forEach((r) => { expect(r.extUP).toBeCloseTo(r.up, 6); });
  });
});

describe('compute — volúmenes en cero', () => {
  it('con todos los volúmenes en 0, los totales son 0 y pctConq es 0 (no NaN)', () => {
    const { rows, k } = compute(baseInput({ vSmart: 0, vCore: 0 }));
    expect(k.totalT).toBe(0);
    expect(k.totSmart).toBe(0);
    expect(k.totCore).toBe(0);
    expect(k.pctConq).toBe(0);
    expect(k.pctConqSmart).toBe(0);
    expect(k.pctConqCore).toBe(0);
    rows.forEach((r) => { expect(r.smart).toBe(0); expect(r.core).toBe(0); });
  });
});

describe('compute — retención vs conquista por campaña', () => {
  it('con retención 100%, toda la campaña SMART es retención y 0% conquista', () => {
    const { k } = compute(baseInput({ retS: 100 }));
    expect(k.totConqSmart).toBeCloseTo(0, 6);
    expect(k.totRetSmart).toBeCloseTo(k.totSmart, 6);
    expect(k.pctConqSmart).toBeCloseTo(0, 6);
  });

  it('con retención 0%, toda la campaña CORE es conquista y 0% retención', () => {
    const { k } = compute(baseInput({ retC: 0 }));
    expect(k.totRetCore).toBeCloseTo(0, 6);
    expect(k.totConqCore).toBeCloseTo(k.totCore, 6);
    expect(k.pctConqCore).toBeCloseTo(1, 6);
  });

  it('retención y conquista de cada campaña suman el total de esa campaña', () => {
    const { k } = compute(baseInput());
    expect(k.totRetSmart + k.totConqSmart).toBeCloseTo(k.totSmart, 6);
    expect(k.totRetCore + k.totConqCore).toBeCloseTo(k.totCore, 6);
    // y el agregado (ret/conq global) es la suma de ambas campañas
    expect(k.totRet).toBeCloseTo(k.totRetSmart + k.totRetCore, 6);
    expect(k.totConq).toBeCloseTo(k.totConqSmart + k.totConqCore, 6);
  });
});

describe('compute — selección de mes pico', () => {
  it('identifica el mes con mayor smart+core como "peak"', () => {
    // curva SMART 100% concentrada en un solo mes (índice 3 => "Ene"), sin CORE
    const curves: Curves = { ...DEF_CURVES, smart: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], core: [0,0,0,0,0,0,0,0,0,0,0,0] };
    const { k } = compute(baseInput({ curves, vCore: 0 }));
    expect(k.peak.m).toBe(MONTHS[3]);
  });
});

describe('compute — con los DEFAULTS reales del proyecto', () => {
  it('produce 12 filas, una por mes, sin NaN en ninguna métrica clave', () => {
    const { rows } = compute(baseInput());
    expect(rows).toHaveLength(12);
    rows.forEach((r) => {
      expect(Number.isNaN(r.smart)).toBe(false);
      expect(Number.isNaN(r.core)).toBe(false);
      expect(Number.isNaN(r.util)).toBe(false);
    });
  });

  it('el % de conquista global queda entre 0 y 1', () => {
    const { k } = compute(baseInput());
    expect(k.pctConq).toBeGreaterThanOrEqual(0);
    expect(k.pctConq).toBeLessThanOrEqual(1);
  });
});

describe('regresión: SERVICE_PROFILES alimenta el streamgraph', () => {
  // Bug real ya corregido una vez: CORE·didácticas aparecía como 1500 en el streamgraph
  // y 1745 en el simulador porque los volúmenes estaban duplicados a mano.
  it('el volumen de CORE · didácticas específicas es 1745 (no 1500)', () => {
    const cd = SERVICE_PROFILES.find((p) => p.k === 'Cd');
    expect(cd?.vol).toBe(1745);
  });
});

describe('compute — costos', () => {
  it('semillas por defecto: didácticas $3,750, uso/prof $0, traslado $1,500, didác 40%', () => {
    expect(DEFAULTS.costoDidac).toBe(3750);
    expect(DEFAULTS.costoUso).toBe(0);
    expect(DEFAULTS.costoProf).toBe(0);
    expect(DEFAULTS.costoTraslado).toBe(1500);
    expect(DEFAULTS.propTrasUso).toBe(0);
    expect(DEFAULTS.propTrasProf).toBe(0);
    expect(DEFAULTS.propTrasDidac).toBe(40);
  });

  it('el # de servicios por tipo = volumen × servicios/colegio (las curvas normalizan a 1)', () => {
    const { k } = compute(baseInput());
    const byKey = Object.fromEntries(k.costs.byType.map((r) => [r.key, r]));
    // cubetas por tipo: SMART (vSmart×serv) + CORE (vCore×serv)
    expect(byKey.uso.n).toBeCloseTo(DEFAULTS.vSmart * DEFAULTS.tUsoS + DEFAULTS.vCore * DEFAULTS.tUsoC, 6);    // 321×3 + 1047×3
    expect(byKey.prof.n).toBeCloseTo(DEFAULTS.vSmart * DEFAULTS.tProfS + DEFAULTS.vCore * DEFAULTS.tProfC, 6); // 321×3 + 1047×3
    expect(byKey.didac.n).toBeCloseTo(DEFAULTS.vSmart * DEFAULTS.tAdicS + DEFAULTS.vCore * DEFAULTS.tAdicC, 6); // 321×1 + 1047×1
  });

  it('costo de servicios = Σ (Nₛ × costo unitario); con las semillas solo didácticas cuestan', () => {
    const { k } = compute(baseInput());
    const nDidac = DEFAULTS.vSmart * DEFAULTS.tAdicS + DEFAULTS.vCore * DEFAULTS.tAdicC; // 321 + 1047 = 1368
    expect(k.costs.servicios).toBeCloseTo(nDidac * 3750, 4); // 1368 × 3750 = 5,130,000
    expect(k.costs.servicios).toBeCloseTo(5130000, 4);
  });

  it('costo de traslados = Σ (Nₛ × proporción) × costo por traslado; solo didácticas al 40%', () => {
    const { k } = compute(baseInput());
    const nDidac = DEFAULTS.vSmart * DEFAULTS.tAdicS + DEFAULTS.vCore * DEFAULTS.tAdicC; // 1368
    expect(k.costs.trasladosN).toBeCloseTo(nDidac * 0.4, 6);          // 547.2 traslados
    expect(k.costs.traslados).toBeCloseTo(nDidac * 0.4 * 1500, 4);    // 547.2 × 1500 = 820,800
  });

  it('costo total = servicios + traslados, y coincide con la suma mensual', () => {
    const { rows, k } = compute(baseInput());
    expect(k.costs.total).toBeCloseTo(k.costs.servicios + k.costs.traslados, 4);
    const monthlyServ = rows.reduce((s, r) => s + r.costServ, 0);
    const monthlyTras = rows.reduce((s, r) => s + r.costTras, 0);
    const monthlyTot = rows.reduce((s, r) => s + r.costTot, 0);
    expect(monthlyServ).toBeCloseTo(k.costs.servicios, 4);
    expect(monthlyTras).toBeCloseTo(k.costs.traslados, 4);
    expect(monthlyTot).toBeCloseTo(k.costs.total, 4);
  });

  it('con todos los costos y proporciones en 0, el costo total es 0', () => {
    const { k } = compute(baseInput({
      costoUso: 0, costoProf: 0, costoDidac: 0, costoTraslado: 0,
      propTrasUso: 0, propTrasProf: 0, propTrasDidac: 0,
    }));
    expect(k.costs.total).toBe(0);
    expect(k.costs.trasladosN).toBe(0);
  });

  it('las proporciones de traslado no alteran el costo de servicios', () => {
    const a = compute(baseInput({ propTrasUso: 0, propTrasProf: 0, propTrasDidac: 0 }));
    const b = compute(baseInput({ propTrasUso: 100, propTrasProf: 100, propTrasDidac: 100 }));
    expect(a.k.costs.servicios).toBeCloseTo(b.k.costs.servicios, 4);
    expect(b.k.costs.traslados).toBeGreaterThan(a.k.costs.traslados);
  });
});

describe('compute — modelo por campaña (SMART/CORE)', () => {
  it('semillas: volúmenes 321/1047 y 3/3/1 servicios/colegio en ambas campañas', () => {
    expect(DEFAULTS.vSmart).toBe(321);
    expect(DEFAULTS.vCore).toBe(1047);
    expect(DEFAULTS.tUsoS).toBe(3); expect(DEFAULTS.tProfS).toBe(3); expect(DEFAULTS.tAdicS).toBe(1);
    expect(DEFAULTS.tUsoC).toBe(3); expect(DEFAULTS.tProfC).toBe(3); expect(DEFAULTS.tAdicC).toBe(1);
  });

  it('cada campaña = volumen × (uso+prof+didác); total 9576', () => {
    const { k } = compute(baseInput());
    const smart = DEFAULTS.vSmart * (DEFAULTS.tUsoS + DEFAULTS.tProfS + DEFAULTS.tAdicS); // 321×7 = 2247
    const core = DEFAULTS.vCore * (DEFAULTS.tUsoC + DEFAULTS.tProfC + DEFAULTS.tAdicC);   // 1047×7 = 7329
    expect(k.totSmart).toBeCloseTo(smart, 4);
    expect(k.totCore).toBeCloseTo(core, 4);
    expect(k.totalT).toBeCloseTo(9576, 4);
  });

  it('con vCore=0 no hay CORE y SMART queda intacto', () => {
    const base = compute(baseInput());
    const soloSmart = compute(baseInput({ vCore: 0 }));
    expect(soloSmart.k.totCore).toBe(0);
    expect(base.k.totSmart).toBeCloseTo(soloSmart.k.totSmart, 6);
  });

  it('uso/prof (SMART+CORE) van a empleados primero; el sobrecupo entra a externos', () => {
    const { rows } = compute(baseInput());
    rows.forEach((r) => {
      // toda la demanda de empleados es uso+prof de ambas campañas
      expect(r.up).toBeCloseTo(r.usoT + r.profT + r.usoCT + r.profCT, 6);
      // cada servicio de uso/prof está cubierto por empleados o es externo
      expect(r.cov + r.extUP).toBeCloseTo(r.up, 6);
      // empleados nunca exceden la capacidad
      expect(r.cov).toBeLessThanOrEqual(r.cap + 1e-6);
    });
  });

  it('con capacidad amplia, uso/prof es 100% interno (extUP = 0) y cov = uso+prof', () => {
    const { rows } = compute(baseInput({ nAse: 10000 }));
    rows.forEach((r) => {
      expect(r.extUP).toBeCloseTo(0, 6);
      // cov es solo uso/prof (las didácticas NUNCA entran a empleados)
      expect(r.cov).toBeCloseTo(r.usoT + r.profT + r.usoCT + r.profCT, 6);
    });
  });

  it('las didácticas específicas siempre son externas (adicExt = adicST + adicCT)', () => {
    const { rows } = compute(baseInput({ nAse: 10000 })); // aun con muchísima capacidad
    rows.forEach((r) => expect(r.adicExt).toBeCloseTo(r.adicST + r.adicCT, 6));
  });

  it('totExt = extUP + adicExt en cada mes', () => {
    const { rows } = compute(baseInput());
    rows.forEach((r) => expect(r.totExt).toBeCloseTo(r.extUP + r.adicExt, 6));
  });
});
