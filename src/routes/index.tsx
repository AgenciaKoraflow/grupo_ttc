import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-6">
        <div className="flex justify-center mb-6">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))',
              boxShadow: '0 4px 16px oklch(0.50 0.225 255 / 0.5)',
            }}
          >
            <Zap className="h-6 w-6 text-white" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-foreground">GRUPO TTC</h1>
        <p className="text-muted-foreground text-base">Sistema de Gestão de Preventivas</p>

        <div className="pt-6">
          <Link
            to={isAuthenticated ? "/dashboard" : "/login"}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))',
              boxShadow: '0 4px 14px oklch(0.50 0.225 255 / 0.40)',
            }}
          >
            {isAuthenticated ? 'Acessar Dashboard' : 'Fazer Login'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
