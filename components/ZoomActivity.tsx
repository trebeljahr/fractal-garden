import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

const ZoomActivityContext = createContext({
  active: false,
  setActive: (_active: boolean) => {},
});

export function ZoomActivityProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const value = useMemo(() => ({ active, setActive }), [active]);
  useEffect(() => {
    document.body.toggleAttribute("data-fractal-zoom", active);
    return () => document.body.removeAttribute("data-fractal-zoom");
  }, [active]);
  return <ZoomActivityContext.Provider value={value}>{children}</ZoomActivityContext.Provider>;
}

export const useZoomActivity = () => useContext(ZoomActivityContext);
