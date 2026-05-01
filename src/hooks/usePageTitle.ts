import { useEffect } from "react";

const APP_NAME = "Grupo TTC";

export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} | ${APP_NAME}`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
