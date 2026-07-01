# SM · Planeación 2 Campañas

App de apoyo al Comité de Negocios para el nuevo modelo de campaña SM 2026-2027 (campañas SMART y CORE). Incluye:

- **Simulador** de coberturas y asesores (talleres por mes, empleados vs externos, retención vs conquista).
- **Gantt** interactivo de acciones de marketing (filtros, densidad, acordeón, adelanto de semanas, hitos).
- **Streamgraph** de perfiles de servicio (uso, profundización, didácticas específicas) para SMART y CORE.
- **Documentos** del modelo y del plan.

## Stack

Vite + React (JavaScript) · Recharts · react-router-dom · react-markdown.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm run build    # build de producción en dist/
npm run preview  # previsualizar el build
```

## Publicar en un nuevo repositorio de GitHub

Con GitHub CLI (`gh`) autenticado en tu Mac:

```bash
cd "ruta/a/sm-campanas-app"
gh repo create sm-campanas-app --private --source=. --remote=origin --push
```

O manualmente (crea primero el repo vacío en github.com):

```bash
git remote add origin git@github.com:USUARIO/sm-campanas-app.git
git branch -M main
git push -u origin main
```

El repo ya viene con git inicializado y el commit inicial.
