"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const UIContext = createContext(null);

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}

export function UIProvider({ children, initialView = "overview" }) {
  const [view, setView] = useState(initialView);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const value = useMemo(
    () => ({
      view,
      setView
    }),
    [view]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
