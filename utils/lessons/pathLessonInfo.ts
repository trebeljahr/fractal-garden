export const PATH_LESSONS = {
  board: {
    title: "Follow the loop, then the repeated line",
    max: 3,
    idea: "Set Round to 1 and follow the dot around a small square. Watch where it goes after closing the loop.",
    detail:
      "Its next step follows a line it has already drawn. Seven drawing steps leave only six different small edges.",
    takeaway:
      "At the next round, every line gets its own smaller loop, including the line that was drawn twice.",
  },
  crystal: {
    title: "One line gets drawn twice",
    max: 3,
    idea: "Follow the dot along a side branch. It turns around and comes back along the same line.",
    detail:
      "That return trip adds another drawing step, but no new edge. Five steps make only four different edges.",
    takeaway: "Raise the round to repeat this out-and-back move inside every smaller line.",
  },
  "fern-1": {
    title: "Return to the same fork",
    max: 4,
    idea: "Follow a side branch to its tip. The dot then returns to a fork without drawing a line back.",
    detail:
      "Remembering the fork lets the drawing continue along another branch. The same move makes branches within branches.",
    takeaway:
      "Change the bend angle to spread them apart. Their lengths and connections stay the same.",
  },
  "fern-2": {
    title: "Find the two kinds of branches",
    max: 4,
    idea: "Trace the fern and compare the main forks with the short branches along their stems.",
    detail:
      "The two shapes come from two different rules: Y adds forks, while X adds pairs of short side branches.",
    takeaway:
      "Increase the bend angle. Both kinds of branches turn farther, while keeping the same connections.",
  },
  "fern-3": {
    title: "Compare the lower and upper branches",
    max: 3,
    idea: "Set Round to 1 and trace the stem. It has two long side branches lower down and two short ones above.",
    detail:
      "The lower branches are twice as long as the upper ones. Each line gets this whole branching pattern in the next round.",
    takeaway:
      "A longer branch therefore has room for two copies of the pattern where a shorter branch has one.",
  },
  "fern-4": {
    title: "Watch where the main stem turns",
    max: 4,
    idea: "Trace past the two side branches and follow the continuing stem. It bends too.",
    detail:
      "The drawing returns from each side branch to the old direction. The final turn comes afterward, so the stem keeps that bend.",
    takeaway:
      "Change the bend angle to see how this repeated turn changes the shape of the whole fern.",
  },
  "gosper-curve": {
    title: "Follow seven connected pieces",
    max: 3,
    idea: "Trace Round 1, then Round 2. Every line in the first route becomes seven shorter lines in the next.",
    detail:
      "The turns arrange those pieces so each ends where the next begins. You can draw the whole route without lifting the pen.",
    takeaway: "Follow a small bend, then look for the same arrangement at a larger scale.",
  },
  "levy-curve": {
    title: "A longer way between two ends",
    max: 7,
    idea: "Start at Round 1. Two equal lines meet at a right angle, making a bent route between the original ends.",
    detail:
      "The bend makes the route longer. In the next round, each of its two lines bends in the same way.",
    takeaway: "Keep adding rounds and trace the smaller bends inside the larger ones.",
  },
  "quadratic-snowflake": {
    title: "Go around three sides of a square",
    max: 3,
    idea: "At Round 1, follow the dot around one square notch. Three short lines replace what used to be one straight section.",
    detail:
      "Together with the straight sections on either side, the new route has five equal lines where the old route had three.",
    takeaway:
      "Repeat the round to put a smaller notch in every line, including those inside the first notch.",
  },
  "sierpinski-arrowhead": {
    title: "Draw around the triangular gaps",
    max: 5,
    idea: "Follow the dot around the largest triangular gap. The route stays connected as it passes from one side to another.",
    detail:
      "Each new round bends every line into three shorter lines. Smaller triangular gaps appear between the bends.",
    takeaway:
      "Compare a small gap with the large one. Repeating the construction approaches the Sierpinski triangle.",
  },
  "sierpinski-curve": {
    title: "Fit smaller detours between the joins",
    max: 3,
    idea: "Trace the route, then raise the round. New detours appear between the lines that join its parts.",
    detail:
      "The old joining lines stay in the drawing instructions. Only the X symbols expand into more lines and turns.",
    takeaway: "This keeps the new parts connected while adding smaller square gaps.",
  },
  "koch-anti-snowflake": {
    title: "Turn the bumps inward",
    max: 3,
    idea: "Trace the outline around a triangular notch. The line bends into the starting triangle.",
    detail:
      "Each notch removes area but makes the route around the edge longer. Repeat to add notches within the notches.",
    takeaway: "The ordinary Koch snowflake uses the same four-line bend, pointing outward instead.",
  },
  "quadratic-koch-island": {
    title: "Follow the detours along one side",
    max: 2,
    idea: "Set Round to 1 and follow one side of the square. Its new route winds back and forth before reaching the next corner.",
    detail:
      "Eighteen short lines connect the same two ends. Their combined length is three times the old straight side.",
    takeaway: "The next round puts that whole detour into each of those short lines.",
  },
  "minkowski-sausage": {
    title: "Match the bumps on opposite sides",
    max: 3,
    idea: "Trace the first round. The route bends to one side of the old line, then to the other.",
    detail:
      "The two bumps enclose equal areas. If this line borders an island, one bump adds as much area as the other removes.",
    takeaway:
      "Both bends add length, so the route gets longer even though the two area changes cancel.",
  },
  "cesaro-fractal": {
    title: "Make the notch narrower",
    max: 3,
    idea: "Change the bend angle and watch the narrow notch. Its two sides move closer together as the angle increases.",
    detail:
      "A sharper notch needs a longer detour between the same two ends. The number of lines stays the same.",
    takeaway: "Raise the round to repeat that notch along every smaller line.",
  },
  "fibonacci-word-fractal": {
    title: "Change the turns, keep their order",
    max: 10,
    idea: "Trace the path, then change the bend angle. The turns still happen in the same order, but each turns by a different amount.",
    detail:
      "The order comes from a row of digits: replace 0 with 01 and 1 with 0. Every digit draws one line.",
    takeaway:
      "After a 0, turn right at odd positions and left at even positions. After a 1, keep going straight.",
  },
  terdragon: {
    title: "Three lines replace one",
    max: 5,
    idea: "Set Round to 1. Follow three equal lines: turn 120 degrees after the first, then turn back after the second.",
    detail: "The first and last lines point the same way. The middle line makes the sideways bend.",
    takeaway: "Each new round puts a smaller copy of this three-line bend into every line.",
  },
  twindragon: {
    title: "Follow one dragon out and the other back",
    max: 7,
    idea: "Trace the first dragon to its end. The second dragon starts there and returns to the first dragon’s start.",
    detail:
      "The second path is a copy turned halfway around. Highlight it to see where the two copies meet.",
    takeaway:
      "More rounds make the turns smaller. In the infinite limit, the two paths fill a tile.",
  },
  "hilbert-curve-3d": {
    title: "Join paths inside eight small cubes",
    max: 3,
    idea: "Follow the route through the cube. Each new round fits a smaller route inside each of eight smaller cubes.",
    detail:
      "The smaller routes are turned so short lines can join them across neighboring faces. Together they visit every grid point once.",
    takeaway:
      "Rotate the view to separate lines that look as though they cross. They can be at different depths.",
  },
  "l-system-explorer": {
    title: "Return to a fork and draw another branch",
    max: 4,
    idea: "Watch the dot reach a branch tip, then return to a fork without drawing a line back.",
    detail:
      "Brackets in the drawing instructions save a position and direction. Returning to them lets another branch start from the same fork.",
    takeaway:
      "Change the bend angle to spread the branches apart. The instructions still connect them at the same forks.",
  },
} as const;
export type PathLessonKind = keyof typeof PATH_LESSONS;
export const isPathLessonKind = (value: unknown): value is PathLessonKind =>
  typeof value === "string" && Object.hasOwn(PATH_LESSONS, value);
