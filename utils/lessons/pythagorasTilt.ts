import { type ConstructionLead, formatShare } from "../constructionLead";

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** The left and right squares' areas, as shares of their parent's. */
export const leftShare = (angle: number) => Math.cos(radians(angle)) ** 2;
export const rightShare = (angle: number) => Math.sin(radians(angle)) ** 2;

/** The shares of the first square's area held by the squares of one level. */
export function levelSquares(angle: number, level: number) {
  const bigger = Math.max(leftShare(angle), rightShare(angle));
  const smaller = Math.min(leftShare(angle), rightShare(angle));
  let total = 0;
  let ways = 1;
  for (let left = 0; left <= level; left++) {
    total += ways * leftShare(angle) ** left * rightShare(angle) ** (level - left);
    ways = (ways * (level - left)) / (left + 1);
  }
  return { count: 2 ** level, biggest: bigger ** level, smallest: smaller ** level, total };
}

export const PYTHAGORAS_LEAD: ConstructionLead = {
  control: {
    kind: "range",
    path: "angle",
    label: "Tilt",
    min: 30,
    max: 60,
    step: 1,
    format: (value) => `${value}°`,
  },
  readout: (view, level) => {
    const angle = view.angle as number;
    const squares = levelSquares(angle, level);
    return [
      { label: "Left square", value: formatShare(leftShare(angle)) },
      { label: "Right square", value: formatShare(rightShare(angle)) },
      { label: `Biggest at level ${level}`, value: formatShare(squares.biggest) },
      { label: `Smallest at level ${level}`, value: formatShare(squares.smallest) },
      {
        label: level ? `All ${squares.count.toLocaleString("en-US")} squares` : "The first square",
        value: formatShare(squares.total),
      },
    ];
  },
};
