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
