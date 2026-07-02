# 01 · Modelo de cálculo y Simulador

**Archivos:** `src/data/model.ts` (toda la lógica, tipada y testeada) · `src/data/model.test.ts` (23 pruebas) · `src/pages/Simulador.tsx` (la UI que lo muestra).

El modelo es la **fuente única de verdad** del proyecto: el Simulador y la vista Servicios/streamgraph leen de aquí. Todo el cálculo vive en `compute(input)` y las semillas en `DEFAULTS`. **Si tocas una fórmula, corre `npm test`** — las pruebas fijan los invariantes.

---

## 1. Los tres tipos de servicio

El plan comercial se reduce a **tres tipos de servicio** (antes se llamaban "talleres"):

| Tipo | Campañas que lo generan | Volumen de colegios (default) | Servicios/colegio |
|---|---|---|---|
| **Uso** | SMART | `vUso` = 458 | `tUso` |
| **Profundización** | SMART | `vProf` = 321 | `tProf` |
| **Didácticas específicas** | SMART + CORE | `vAdicS` = 160 · `vAdicC` = 1745 | `tAdic` |

> ⚠️ CORE aporta **solo** didácticas al ciclo operativo. El uso/profundización de CORE (perfiles de 1047 y 733 del streamgraph) es "adopción aguas abajo del verano 2027", **fuera** del simulador → **no** entra a coberturas ni a costos.

Los volúmenes salen de `SERVICE_PROFILES` (no los dupliques). `DEFAULTS.vUso = volOf("Su")`, etc.

---

## 2. Curvas mensuales (`DEF_CURVES`, `genCurve`, `norm`)

Cada tipo tiene una **curva de 12 meses** (Oct→Sep) que reparte su volumen anual en el tiempo. Las curvas se **normalizan** (`norm`) para que sumen 1: así el total anual = volumen × servicios/colegio, sin importar la forma de la curva.

- `DEF_CURVES` = curvas base por defecto (`uso`, `prof`, `adicS`, `adicC`).
- El panel "Curvas de cierre" del simulador genera curvas gaussianas con `genCurve(focal, spread, win)` y las mete en el estado `curves`.
- **Invariante:** como `norm` normaliza, cambiar la forma de una curva **mueve** los servicios entre meses pero **no cambia** el total anual ni el costo total. Solo cambia los picos.

---

## 3. Cálculo mensual (`compute`, dentro del `for` de 12 meses)

Para cada mes `i`:

```
usoT   = vUso  × cu[i] × tUso           // servicios de Uso ese mes (SMART)
profT  = vProf × cp[i] × tProf          // Profundización (SMART)
adicST = vAdicS × cas[i] × tAdic        // Didácticas SMART
adicCT = vAdicC × cac[i] × tAdic        // Didácticas CORE

smart  = usoT + profT + adicST          // total SMART del mes
core   = adicCT                         // total CORE del mes
up     = usoT + profT                   // "uso+prof": lo que cubren los EMPLEADOS
```

### Capacidad y reparto empleados vs. externos
```
cap    = nAse × tDay × dWeek × wMonth    // capacidad de empleados (servicios/mes)
cov    = min(up, cap)                    // uso+prof cubierto por empleados
extUP  = max(0, up − cap)                // uso+prof que se va a externos por sobrecupo
adicExt = adicST + adicCT                // didácticas: SIEMPRE externas
totExt = extUP + adicExt                 // total externo del mes
util   = cov / cap                       // utilización de empleados
```
Regla de negocio: **los empleados solo cubren uso/profundización**; las didácticas siempre las hacen externos; y si uso/prof rebasa `cap`, el excedente también se va a externos.

### Retención vs. conquista (por campaña)
```
rS = retS/100 ; rC = retC/100
retSmart  = smart × rS ; conqSmart = smart × (1−rS)
retCore   = core  × rC ; conqCore  = core  × (1−rC)
```
La retención conserva la base actual; el resto es conquista (clientes nuevos). No afecta costos.

---

## 4. Módulo de costos ⭐ (lo más nuevo y delicado)

**Insumos** (interfaz `CostInputs`, editables en el panel "Costos"):

| Insumo | Semilla | Qué es |
|---|---|---|
| `costoUso` | $0 | Costo por servicio de Uso |
| `costoProf` | $0 | Costo por servicio de Profundización |
| `costoDidac` | $3,750 | Costo por servicio de Didáctica específica |
| `costoTraslado` | $1,500 | Costo por **traslado** (evento fijo) |
| `propTrasUso` | 0% | % de servicios de Uso que requieren traslado |
| `propTrasProf` | 0% | % de Profundización que requieren traslado |
| `propTrasDidac` | 40% | % de Didácticas que requieren traslado |

**Fórmula** (por tipo de servicio *s* ∈ {uso, prof, didác}):
```
Nₛ              = cantidad anual de servicios de ese tipo
Costo_servicio_s = Nₛ × costoUnitario_s
Traslados_s      = Nₛ × (propTraslado_s / 100)
Costo_traslado_s = Traslados_s × costoTraslado

COSTO DE SERVICIOS = Σ Costo_servicio_s
COSTO DE TRASLADOS = Σ Costo_traslado_s
COSTO TOTAL        = servicios + traslados
```
Donde `N_uso = ΣusoT`, `N_prof = ΣprofT`, `N_didac = Σ(adicST+adicCT)`.

**Dónde vive el resultado:**
- Por mes: `MonthRow.costServ`, `.costTras`, `.costTot` (para la gráfica mensual).
- Anual: `k.costs = { byType[], servicios, traslados, trasladosN, total }` (para KPIs y la tabla de desglose).

**Ejemplo con las semillas** (escenario Techo): didácticas = 1905 servicios → servicios $7,143,750 + traslados (1905 × 40% × $1,500 = $1,143,000) = **$8,286,750**.

**Notas de comportamiento:**
- Un **traslado** es un evento de costo fijo; su cantidad sale de la proporción, **no** se redondea internamente (se muestra redondeado). Si algún día se quieren viajes enteros, redondear con `Math.ceil`.
- Como uso/prof cuestan $0 por defecto, la **intensidad** (que solo mueve `tUso`/`tProf`) no cambia el costo total hasta que les pongas costo. Las didácticas (`tAdic` fijo) mandan el costo.
- Las **proporciones no alteran** el costo de servicios, solo el de traslados (hay una prueba que lo fija).

---

## 5. Cómo cambiar cosas SIN romper

| Quiero… | Toca… | Cuidado con… |
|---|---|---|
| Cambiar un volumen de colegios | `SERVICE_PROFILES` en `model.ts` | `DEFAULTS.vUso/…` derivan de ahí; no lo dupliques en la vista. |
| Cambiar una semilla de costo | `DEFAULTS` (bloque de costos) en `model.ts` | Hay una prueba que fija las semillas — actualízala. |
| Agregar un tipo de costo nuevo | `CostInputs` + `compute` (loop y `byType`) + `Defaults`/`DEFAULTS` + UI en `Simulador.tsx` | Agrega también su prueba en `model.test.ts`. |
| Cambiar la regla de capacidad | `cap = …` y `cov/extUP` en `compute` | Las pruebas de capacidad (cap=0, sobrecupo) deben seguir pasando. |
| Ajustar la intensidad | `applyIntensity` en `Simulador.tsx` | Solo mueve `tUso/tProf/tAdic`; no toca volúmenes ni costos. |
| Agregar una columna al CSV | `exportCSV` en `Simulador.tsx` | Manténlo alineado con el `head`. |

## 6. Invariantes (NO romper)
- `compute` devuelve **12 filas** (una por mes) y **sin NaN** aunque `cap=0` o volúmenes en 0 (hay pruebas).
- `k.costs.total === Σ costTot mensual === servicios + traslados` (probado).
- `DEFAULTS.vAdicC === 1745` (prueba de regresión del bug 1500/1745).
- El estado del simulador (`n`, `curves`) **no** se persiste (solo escenarios A/B en `localStorage`); recargar restablece los defaults.
