import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router'
import './styles.css'

try {
  const router = getRouter()

  const root = ReactDOM.createRoot(document.getElementById('root')!)
  root.render(
    <RouterProvider router={router} />
  )
} catch (error) {
  console.error('Erro ao iniciar app:', error)

  // Fallback simples se houver erro
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  root.render(
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>Erro ao carregar aplicação</h1>
      <p>Recarregue a página (F5)</p>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
        {String(error)}
      </pre>
    </div>
  )
}
