import React from 'react'
import ReactDOM from 'react-dom/client'

// App MÍNIMO - sem CSS, sem dependências externas
function App() {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loggedIn, setLoggedIn] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Preencha email e senha')
      return
    }

    // Simular login
    setLoggedIn(true)
  }

  const handleLogout = () => {
    setLoggedIn(false)
    setEmail('')
    setPassword('')
    setError('')
  }

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, sans-serif',
    } as React.CSSProperties,
    card: {
      backgroundColor: 'white',
      padding: '32px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      maxWidth: '400px',
      width: '100%',
    } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '10px',
      marginBottom: '12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box',
      fontSize: '14px',
    } as React.CSSProperties,
    button: {
      width: '100%',
      padding: '10px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      marginTop: '12px',
    } as React.CSSProperties,
    error: {
      color: '#dc3545',
      marginBottom: '12px',
      fontSize: '14px',
    } as React.CSSProperties,
  }

  if (loggedIn) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={{ marginTop: 0 }}>Dashboard</h1>
          <p>Bem-vindo, <strong>{email}</strong></p>
          <p style={{ color: '#666', fontSize: '14px' }}>App funcionando corretamente! ✓</p>
          <button style={styles.button} onClick={handleLogout}>
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={{ marginTop: 0, marginBottom: '24px' }}>GRUPO TTC - Login</h1>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <button type="submit" style={styles.button}>
            Entrar
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
          Use qualquer email e senha para testar
        </p>
      </div>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
