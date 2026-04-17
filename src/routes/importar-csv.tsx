import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/importar-csv")({
  beforeLoad: () => { throw redirect({ to: "/ocorrencias" }); },
  component: () => null,
});
