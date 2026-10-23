export const PATH_LESSONS = {
  board: {
    title: "Walk around a little square",
    max: 3,
    idea: "Replace one line with seven drawing steps. Every turn is a right angle.",
    detail:
      "The little square returns to a point you already visited. Part of the way out follows a line twice.",
    takeaway:
      "Seven steps finish three step lengths ahead. Shorter steps keep the old ends in place.",
  },
  crystal: {
    title: "Out along a line, then back",
    max: 3,
    idea: "Go forward twice, step sideways, walk back, then go forward once more.",
    detail: "Five drawing steps make four different edges because one edge is drawn twice.",
    takeaway: "The pen travels farther than the length of the separate lines you see.",
  },
  "fern-1": {
    title: "Remember the fork",
    max: 4,
    idea: "An opening bracket saves your place and direction. A closing bracket returns there without drawing.",
    detail:
      "X marks a tip that grows next time. Each F draws a step and becomes two steps in the next round.",
    takeaway:
      "Branches can start from the same fork. Repeat inside each branch to make smaller leaflets.",
  },
  "fern-2": {
    title: "Two letters grow different branches",
    max: 4,
    idea: "Y makes the main forks. X adds pairs of short side branches.",
    detail:
      "Old F steps stay the same length in the string. X and Y add all the new drawing steps.",
    takeaway:
      "Follow a Y fork, then an X branch. The two rules give different parts of the plant their shapes.",
  },
  "fern-3": {
    title: "Long branches, then short ones",
    max: 3,
    idea: "One line becomes a stem with four side branches. Nine drawing steps replace one.",
    detail: "The lower branches each get two steps. The upper branches each get one.",
    takeaway: "Every new line grows this same little plant on the next round.",
  },
  "fern-4": {
    title: "Watch the continuing tip bend",
    max: 4,
    idea: "Two side branches leave the stem. Then the continuing tip turns.",
    detail:
      "Brackets bring the side branches back to the fork. The last turn sits outside them, so it stays.",
    takeaway: "Move that last turn inside the brackets and the continuing tip loses its bend.",
  },
  "gosper-curve": {
    title: "Seven smaller routes join up",
    max: 3,
    idea: "The path uses 60-degree turns. Two letter rules choose how the smaller routes face.",
    detail: "Each round has seven times as many lines. Follow how their ends stay joined.",
    takeaway: "Each new line is about 38% as long to keep the old ends in place.",
  },
  "levy-curve": {
    title: "Bend one line into two",
    max: 7,
    idea: "Replace a straight line with two equal lines meeting at a right angle.",
    detail:
      "Each new line is about 71% as long. Together, they make a longer route between the same ends.",
    takeaway: "The line count doubles each round. The infinite path fills a region with area.",
  },
  "quadratic-snowflake": {
    title: "Put a square bump in a line",
    max: 3,
    idea: "Five steps replace one line. The middle three go around three sides of a square.",
    detail:
      "The route finishes three little step lengths ahead. Make the steps one third as long to keep the ends fixed.",
    takeaway: "Five one-third-size lines make the route longer each round.",
  },
  "sierpinski-arrowhead": {
    title: "Follow the triangular gaps",
    max: 5,
    idea: "A and B both draw forward. Their rules bend three smaller parts in opposite directions.",
    detail:
      "Each round triples the line count. The path stays joined while triangular gaps appear between its parts.",
    takeaway: "Keep repeating and the path approaches the Sierpinski triangle.",
  },
  "sierpinski-curve": {
    title: "Add detours around smaller squares",
    max: 3,
    idea: "X adds detours. Old F steps stay in the string and connect the new parts.",
    detail: "The first drawing has four steps. The next rounds have 20, 84 and 340.",
    takeaway: "Each X adds eight F steps and four new X symbols for the next round.",
  },
  "koch-anti-snowflake": {
    title: "Cut the bumps inward",
    max: 3,
    idea: "Each old line becomes four shorter lines. The starting triangle sends the bumps inward.",
    detail: "Each cut removes area while making the outline longer.",
    takeaway: "Compare the ordinary Koch snowflake: the bumps point outward there.",
  },
  "quadratic-koch-island": {
    title: "Eighteen steps between the same ends",
    max: 2,
    idea: "A winding path of eighteen steps replaces one straight line.",
    detail:
      "Those steps finish six little step lengths ahead. Make each step one sixth as long to keep the ends fixed.",
    takeaway: "Eighteen one-sixth-size lines make the total route three times as long.",
  },
  "minkowski-sausage": {
    title: "One bump on each side",
    max: 3,
    idea: "Eight steps replace a straight line. They finish four little step lengths ahead.",
    detail: "One bump adds area outside the island. The other cuts the same amount inside it.",
    takeaway: "The route doubles in length each round while those area changes balance.",
  },
  "cesaro-fractal": {
    title: "Sharpen the notch",
    max: 3,
    idea: "Four equal lines replace one. Change the bend and watch the notch sharpen.",
    detail: "The old ends stay in place. Sharper notches need longer lines between those ends.",
    takeaway: "As the lines get longer, neighboring spikes crowd together.",
  },
  "fibonacci-word-fractal": {
    title: "Count the digits as you walk",
    max: 10,
    idea: "Replace 0 with 01 and 1 with 0. Every digit draws one step.",
    detail:
      "After a zero, turn right at odd positions and left at even positions. After a one, keep going straight.",
    takeaway: "A zero can turn either way. Its place in the string decides which.",
  },
  terdragon: {
    title: "Turn three lines into a winding path",
    max: 5,
    idea: "Replace each line with three. Turn 120 degrees one way, then 120 degrees back.",
    detail: "The three steps finish about 1.732 step lengths from the start.",
    takeaway:
      "Make each new line about 58% as long to keep the distance between the old ends fixed.",
  },
  twindragon: {
    title: "Join two dragons",
    max: 7,
    idea: "Turn a second dragon halfway around the midpoint between the first dragon’s ends.",
    detail: "One path goes out. The other joins its end and returns to the start.",
    takeaway:
      "In the infinite limit, the paths fill a tile. Copies of that tile fit together across the plane.",
  },
  "hilbert-curve-3d": {
    title: "Visit every little cube",
    max: 3,
    idea: "Split a cube into eight. Turn the smaller paths so their ends join up.",
    detail: "The grids have 8, then 64, then 512 stops. Each stop connects to a neighbor.",
    takeaway: "Rotate the view. Lines that seem to cross can sit at different depths.",
  },
  "l-system-explorer": {
    title: "Return to the fork",
    max: 4,
    idea: "Change the angle to spread or narrow the plant. The string of instructions stays the same.",
    detail: "Brackets remember a position and direction, then return there without drawing.",
    takeaway:
      "Move a bracket to change where a branch begins. Change the angle to change where it points.",
  },
} as const;
export type PathLessonKind = keyof typeof PATH_LESSONS;
export const isPathLessonKind = (value: unknown): value is PathLessonKind =>
  typeof value === "string" && Object.hasOwn(PATH_LESSONS, value);
