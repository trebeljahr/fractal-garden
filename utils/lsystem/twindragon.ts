import { turtleSpec } from "./pageZoom";
import type { LSystemSpec } from "./spec";

export const TWIN_PADDING = 0.08;
export const TILING_PADDING = 0.25;
export const MAX_TILE_RANGE = 8;

// The first dragon, then the second in brackets. A dragon of at least one
// round ends a quarter turn from where it started, so "+" makes the second
// head the opposite way from the first: the first turned 180°.
const TILE = "F+[F]";
// A copy sits two brackets deep (its row and its own), and the "tiles" color
// mode fades anything that deep.
const COPY = `[${TILE}]`;

// M and N rewrite like F and G but draw nothing, so M moves by the dragon's
// chord c at any round. Each of these keeps the heading.
const FORWARD = "M-"; // by c
const BACK = "++M---"; // by -c
const UP = "+M--"; // by i·c
const DOWN = "-M"; // by -i·c

// Every lattice point within the range. The middle tile comes last, on top.
function tilingAxiom() {
  let axiom = "";
  for (let b = -MAX_TILE_RANGE; b <= MAX_TILE_RANGE; b++) {
    axiom += `[${(b < 0 ? DOWN : UP).repeat(Math.abs(b))}${BACK.repeat(MAX_TILE_RANGE)}`;
    for (let a = -MAX_TILE_RANGE; a <= MAX_TILE_RANGE; a++) {
      axiom += `${a === 0 && b === 0 ? "" : COPY}${FORWARD}`;
    }
    axiom += "]";
  }
  return axiom + TILE;
}

type Settings = {
  iterations: number;
  showTiling: boolean;
  firstDragon: string;
  secondDragon: string;
  background: string;
  lineWidth: number;
};

// The picture drawTwindragon draws, as a spec for endless zoom.
export function twindragonSpec(p: Settings): LSystemSpec {
  return {
    ...turtleSpec({
      axiom: p.showTiling ? tilingAxiom() : TILE,
      rules: { F: "F+G", G: "F-G", M: "M+N", N: "M-N" },
      turn: 90,
      // Each round turns the chord by 45°, so counter-rotate to keep it level.
      start: -p.iterations * 45,
      draw: "FG",
      color: p.firstDragon,
      background: p.background,
      lineWidth: p.lineWidth,
    }),
    colorEnd: p.secondDragon,
    colorMode: "tiles",
    moveSymbols: "MN",
  };
}
