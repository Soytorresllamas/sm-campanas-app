import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import Gate from './Gate.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('No se encontró el elemento #root')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Gate>
        <HashRouter>
          <App />
        </HashRouter>
      </Gate>
    </ErrorBoundary>
  </React.StrictMode>,
)
