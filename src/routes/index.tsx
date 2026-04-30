import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      navigate({ to: isAuthenticated ? "/dashboard" : "/login", replace: true });
    }
  }, [isLoading, isAuthenticated]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
