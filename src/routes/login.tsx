import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ArrowRight, ShieldCheck, BarChart3, Layers } from "lucide-react";
import { mockProfiles } from "@/mock/data";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      navigate({ to: "/dashboard" });
    } else {
      setError("Credenciais inválidas. Use um dos perfis de demonstração.");
    }
  };

  const features = [
    { icon: ShieldCheck, text: "Gestão completa de preventivas" },
    { icon: BarChart3, text: "Dashboard em tempo real" },
    { icon: Layers, text: "Relatórios e exportação" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo — hero visual */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, oklch(0.148 0.030 250) 0%, oklch(0.115 0.025 255) 60%, oklch(0.095 0.022 265) 100%)',
        }}
      >
        {/* Orbs decorativos de fundo */}
        <div
          className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, oklch(0.58 0.225 255), transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-60px] left-[-60px] w-[300px] h-[300px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, oklch(0.55 0.22 272), transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, oklch(0.70 0.15 255), transparent 70%)' }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, oklch(0.58 0.225 255), oklch(0.50 0.245 272))',
              boxShadow: '0 4px 16px oklch(0.58 0.225 255 / 0.5)',
            }}
          >
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg tracking-tight leading-none">GRUPO TTC</p>
            <p className="text-white/40 text-[10px] tracking-widest uppercase mt-0.5">Field Service</p>
          </div>
        </div>

        {/* Headline central */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-4">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: 'oklch(0.58 0.225 255 / 0.18)',
                border: '1px solid oklch(0.58 0.225 255 / 0.30)',
                color: 'oklch(0.80 0.15 255)',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              Sistema Ativo
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Gestão de<br />
              <span style={{
                background: 'linear-gradient(135deg, oklch(0.80 0.15 255), oklch(0.72 0.18 272))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Preventivas
              </span>
            </h1>
            <p className="text-white/50 text-base leading-relaxed max-w-sm">
              Controle total das ocorrências de manutenção de infraestrutura de telecomunicações.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: 'oklch(0.58 0.225 255 / 0.15)',
                    border: '1px solid oklch(0.58 0.225 255 / 0.25)',
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color: 'oklch(0.75 0.18 255)' }} />
                </div>
                <span className="text-sm text-white/65">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="relative z-10">
          <p className="text-white/25 text-xs">© 2025 Grupo TTC · Todos os direitos reservados</p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-[380px] space-y-8 animate-fade-in-up">

          {/* Header mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))',
                boxShadow: '0 4px 12px oklch(0.50 0.225 255 / 0.40)',
              }}
            >
              <Zap className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground tracking-tight leading-none">GRUPO TTC</p>
              <p className="text-muted-foreground text-[10px] tracking-widest uppercase mt-0.5">Field Service</p>
            </div>
          </div>

          {/* Título */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground text-sm mt-1">Acesse sua conta para continuar</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="h-11 bg-card border-border/80 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 bg-card border-border/80 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
                style={{
                  background: 'oklch(0.50 0.235 27 / 0.08)',
                  border: '1px solid oklch(0.50 0.235 27 / 0.25)',
                  color: 'oklch(0.50 0.235 27)',
                }}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-semibold gap-2 text-sm"
              disabled={loading}
              style={{
                background: loading ? undefined : 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))',
                boxShadow: loading ? undefined : '0 4px 14px oklch(0.50 0.225 255 / 0.40)',
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                <>Acessar Sistema <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          {/* Divisor */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">Acesso rápido</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Demo accounts */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">Selecione um perfil de demonstração:</p>
            {mockProfiles.map((p) => (
              <button
                key={p.id}
                onClick={() => { setEmail(p.email); setPassword("demo"); }}
                className="w-full flex items-center justify-between rounded-xl border border-border/70 px-4 py-3 text-sm hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))' }}
                  >
                    {p.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <span className="font-medium text-foreground">{p.nome}</span>
                </div>
                <span
                  className="text-[10px] font-semibold capitalize px-2.5 py-1 rounded-full"
                  style={p.role === 'admin' ? {
                    background: 'oklch(0.50 0.225 255 / 0.12)',
                    color: 'oklch(0.42 0.18 255)',
                    border: '1px solid oklch(0.50 0.225 255 / 0.25)',
                  } : {
                    background: 'oklch(0.56 0.185 150 / 0.12)',
                    color: 'oklch(0.36 0.14 150)',
                    border: '1px solid oklch(0.56 0.185 150 / 0.25)',
                  }}
                >
                  {p.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
