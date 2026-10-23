import { createContext, useContext } from "react";

export type FractalPalette = { color: string; background: string };

export const FractalPaletteContext = createContext<FractalPalette>({
  color: "#fc366b",
  background: "#252424",
});

export const useFractalPalette = () => useContext(FractalPaletteContext);
