# SM · Planeación 2 Campañas

App de apoyo al Comité de Negocios para el nuevo modelo de campaña SM 2026-2027 (campañas SMART y CORE). Incluye:

- **Simulador** de coberturas y asesores: servicios por mes, empleados vs externos, retención vs conquista y **módulo de costos** (servicios + traslados).
- **Gantt** de gestión de acciones de marketing: barras arrastrables, dependencias, filtros, zoom, edición, módulos/responsables editables, y sincronización compartida vía Supabase.
- **Servicios (streamgraph)** de perfiles de servicio (uso, profundización, didácticas específicas) para SMART y CORE.
- **Documentos** del modelo y del plan.

## Ver en línea (GitHub Pages)

- [App completa](https://soytorresllamas.github.io/sm-campanas-app/)
- [Simulador](https://soytorresllamas.github.io/sm-campanas-app/#/simulador) · [Gantt](https://soytorresllamas.github.io/sm-campanas-app/#/gantt) · [Servicios](https://soytorresllamas.github.io/sm-campanas-app/#/servicios)

Acceso protegido con contraseña (gate ligero del lado del cliente).

## Documentación

- [`PRESENTACION.md`](PRESENTACION.md) — **cómo funciona la plataforma completa** (divulgativo, base para presentaciones).
- [`PROJECT_NOTES.md`](PROJECT_NOTES.md) — panorama general, decisiones y roadmap.
- [`docs/`](docs/README.md) — **documentación técnica por módulo**: la lógica/fórmulas de cada uno y qué se puede cambiar sin romper nada.

## Stack

Vite + React + **TypeScript** · Recharts · react-router-dom (`HashRouter`) · react-markdown · Supabase.

## Desarrollo

```bash
npm install
npm run dev        # servidor local
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # vitest
npm run build      # build de producción en dist/
npm run preview    # previsualizar el build
```

Antes de subir: `npm run typecheck && npm run lint && npm test && npm run build` — todo verde es lo que exige el CI.

## Despliegue

GitHub Actions (`.github/workflows/deploy.yml`) corre el gate (lint + typecheck + test), construye y publica a GitHub Pages en cada push a `main`. Detalles y trampas conocidas en [`docs/04-infraestructura.md`](docs/04-infraestructura.md).
