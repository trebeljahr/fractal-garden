export type LSystemPreset = "koch" | "dragon" | "hilbert";
export type TurtlePoint = { x: number; y: number };
export type TurtleSegment = { from: TurtlePoint; to: TurtlePoint };
export type TurtleInstruction = {
  symbol: string | null;
  point: TurtlePoint;
  heading: number;
  action: "start" | "draw" | "clockwise" | "counterclockwise" | "rewrite";
  segment: TurtleSegment | null;
  drawn: number;
};

export const LESSON_SYSTEMS = {
  koch: {
    name: "Koch edge",
    axiom: "F",
    rules: { F: "F-F++F-F" },
    draw: "F",
    angle: 60,
    plus: -1,
    heading: 90,
    maxRewrites: 2,
  },
  dragon: {
    name: "Dragon curve",
    axiom: "F",
    rules: { F: "F+G", G: "F-G" },
    draw: "FG",
    angle: 90,
    plus: 1,
    heading: 45,
    maxRewrites: 4,
  },
  hilbert: {
    name: "Hilbert curve",
    axiom: "W",
    rules: { V: "-WF+VFV+FW-", W: "+VF-WFW-FV+" },
    draw: "F",
    angle: 90,
    plus: -1,
    heading: 90,
    maxRewrites: 2,
  },
} as const;

export function lessonWord(preset: LSystemPreset, rewrites: number) {
  const system = LESSON_SYSTEMS[preset];
  const rules: Readonly<Record<string, string>> = system.rules;
  let word: string = system.axiom;
  for (let level = 0; level < rewrites; level++)
    word = Array.from(word)
      .map((symbol) => rules[symbol] ?? symbol)
      .join("");
  return word;
}

export function walkLessonWord(preset: LSystemPreset, word: string): TurtleInstruction[] {
  const system = LESSON_SYSTEMS[preset];
  let point: TurtlePoint = { x: 0, y: 0 };
  let heading: number = system.heading;
  let drawn = 0;
  const states: TurtleInstruction[] = [
    { symbol: null, point, heading, action: "start", segment: null, drawn },
  ];
  for (const symbol of word) {
    let segment: TurtleSegment | null = null;
    let action: TurtleInstruction["action"] = "rewrite";
    if (system.draw.includes(symbol)) {
      const angle = (heading * Math.PI) / 180;
      const next = { x: point.x + Math.cos(angle), y: point.y + Math.sin(angle) };
      segment = { from: point, to: next };
      point = next;
      drawn++;
      action = "draw";
    } else if (symbol === "+" || symbol === "-") {
      const turn = system.plus * (symbol === "+" ? 1 : -1) * system.angle;
      heading += turn;
      action = turn < 0 ? "clockwise" : "counterclockwise";
    }
    states.push({ symbol, point, heading, action, segment, drawn });
  }
  return states;
}

export function instructionDescription(preset: LSystemPreset, instruction: TurtleInstruction) {
  if (instruction.action === "start") return "Start at the outlined dot, facing along the arrow.";
  if (instruction.action === "draw")
    return `${instruction.symbol}: draw one segment and move forward.`;
  if (instruction.action === "rewrite")
    return `${instruction.symbol}: keep this rewrite symbol. It does not draw or turn the turtle.`;
  return `${instruction.symbol}: turn ${instruction.action} by ${LESSON_SYSTEMS[preset].angle}°. Stay at the same point.`;
}
