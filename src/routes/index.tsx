import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, mostrar login
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ marginTop: 0, marginBottom: '24px' }}>GRUPO TTC - Login</h1>
          <p style={{ color: '#666' }}>Por favor, acesse a página de login</p>
        </div>
      </div>
    );
  }

  // Se está autenticado, mostrar dashboard
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ marginTop: 0 }}>Dashboard</h1>
        <p style={{ color: '#666' }}>Bem-vindo, <strong>{user?.nome}</strong>!</p>
        <p style={{ color: '#999', fontSize: '14px' }}>Role: {user?.role}</p>
      </div>
    </div>
  );
}
