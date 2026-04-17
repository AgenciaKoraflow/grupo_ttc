import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

// Versão mínima temporária para diagnosticar problema
function App() {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loggedIn, setLoggedIn] = React.useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) {
      setLoggedIn(true)
    }
  }

  if (loggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Dashboard</h1>
          <p className="text-muted-foreground mb-6">Bem-vindo, {email}</p>
          <button
            onClick={() => setLoggedIn(false)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-sm w-full mx-4 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg bg-card"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg bg-card"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
