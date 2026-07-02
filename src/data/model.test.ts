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
    const { rows, k } = compute(baseInput({ vUso: 0, vProf: 0, vAdicS: 0, vAdicC: 0 }));
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
    // curva de uso 100% concentrada en un solo mes (índice 3 => "Ene")
    const curves: Curves = { ...DEF_CURVES, uso: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], prof: [0,0,0,0,0,0,0,0,0,0,0,0], adicS: [0,0,0,0,0,0,0,0,0,0,0,0], adicC: [0,0,0,0,0,0,0,0,0,0,0,0] };
    const { k } = compute(baseInput({ curves, vProf: 0, vAdicS: 0, vAdicC: 0 }));
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

describe('regresión: SERVICE_PROFILES es la única fuente de los volúmenes', () => {
  // Bug real ya corregido una vez: CORE·didácticas aparecía como 1500 en el streamgraph
  // y 1745 en el simulador porque los volúmenes estaban duplicados a mano.
  it('DEFAULTS deriva sus volúmenes de SERVICE_PROFILES, no de números sueltos', () => {
    const byKey = Object.fromEntries(SERVICE_PROFILES.map((p) => [p.k, p.vol]));
    expect(DEFAULTS.vUso).toBe(byKey.Su);
    expect(DEFAULTS.vProf).toBe(byKey.Sp);
    expect(DEFAULTS.vAdicS).toBe(byKey.Sd);
    expect(DEFAULTS.vAdicC).toBe(byKey.Cd);
  });

  it('el volumen de CORE · didácticas específicas es 1745 (no 1500)', () => {
    expect(DEFAULTS.vAdicC).toBe(1745);
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
    expect(byKey.uso.n).toBeCloseTo(DEFAULTS.vUso * DEFAULTS.tUso, 6);       // 458×3
    expect(byKey.prof.n).toBeCloseTo(DEFAULTS.vProf * DEFAULTS.tProf, 6);    // 321×3
    expect(byKey.didac.n).toBeCloseTo((DEFAULTS.vAdicS + DEFAULTS.vAdicC) * DEFAULTS.tAdic, 6); // 1905×1
  });

  it('costo de servicios = Σ (Nₛ × costo unitario); con las semillas solo didácticas cuestan', () => {
    const { k } = compute(baseInput());
    const nDidac = (DEFAULTS.vAdicS + DEFAULTS.vAdicC) * DEFAULTS.tAdic;
    expect(k.costs.servicios).toBeCloseTo(nDidac * 3750, 4); // 1905 × 3750 = 7,143,750
    expect(k.costs.servicios).toBeCloseTo(7143750, 4);
  });

  it('costo de traslados = Σ (Nₛ × proporción) × costo por traslado; solo didácticas al 40%', () => {
    const { k } = compute(baseInput());
    const nDidac = (DEFAULTS.vAdicS + DEFAULTS.vAdicC) * DEFAULTS.tAdic;
    expect(k.costs.trasladosN).toBeCloseTo(nDidac * 0.4, 6);          // 762 traslados
    expect(k.costs.traslados).toBeCloseTo(nDidac * 0.4 * 1500, 4);    // 762 × 1500 = 1,143,000
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
