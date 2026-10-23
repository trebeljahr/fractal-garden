import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

const ZoomActivityContext = createContext({
  active: false,
  setActive: (_active: boolean) => {},
});

export function ZoomActivityProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const value = useMemo(() => ({ active, setActive }), [active]);
  return <ZoomActivityContext.Provider value={value}>{children}</ZoomActivityContext.Provider>;
}

export const useZoomActivity = () => useContext(ZoomActivityContext);
