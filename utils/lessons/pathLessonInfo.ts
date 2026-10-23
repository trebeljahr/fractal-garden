export const PATH_LESSONS = {
  board: {
    title: "A long detour between the same corners",
    max: 3,
    idea: "Seven forward segments replace each old segment. The four right turns bring the heading back to its starting direction.",
    detail:
      "The middle of the replacement walks around a small square. Its endpoint is three unit steps from its start.",
    takeaway: "The path length grows by 7/3 per replacement when its endpoint spacing stays fixed.",
  },
  crystal: {
    title: "A return path inside each edge",
    max: 3,
    idea: "Five forward segments replace one segment. A half-turn sends part of the path back toward its start.",
    detail:
      "Some strokes retrace earlier positions. A count of instructions therefore differs from a count of distinct edges.",
    takeaway:
      "Overlaps matter: a similarity count alone does not establish the dimension of the visible set.",
  },
  "fern-1": {
    title: "A branch remembers where it began",
    max: 4,
    idea: "Brackets save the position and direction, then restore them. Nested brackets create branches on branches.",
    detail:
      "The X symbols mark future growth. They draw no line themselves. Each F doubles at the next rewrite.",
    takeaway:
      "The paired inner branches share a base. Their later copies produce the fern’s repeated leaflet pattern.",
  },
  "fern-2": {
    title: "Two kinds of growing tip",
    max: 4,
    idea: "Y creates the main branching structure. X creates pairs of short leaflets along its stems.",
    detail:
      "Unlike Fern 1, this rule does not double every existing F. New line segments arrive through X and Y.",
    takeaway:
      "Two interacting tip rules can separate the shape of a stem from the shape of its leaflets.",
  },
  "fern-3": {
    title: "Long side branches and short side branches",
    max: 3,
    idea: "Every F becomes nine forward strokes. Four bracketed branches leave the main stem and return to it.",
    detail: "The first pair of branches has two strokes each. The later pair has one stroke each.",
    takeaway:
      "Each child stroke grows the same whole pattern at the next rewrite. Unequal branch lengths survive at every scale.",
  },
  "fern-4": {
    title: "A tip that keeps turning",
    max: 4,
    idea: "Two side branches leave the stem before the final X continues with a turn.",
    detail:
      "Restoring a bracketed branch keeps its bend from changing the stem. The final bend remains outside the brackets.",
    takeaway:
      "That unpaired final turn biases the growing tip and gives this plant a different outline from Fern 1.",
  },
  "gosper-curve": {
    title: "Seven pieces on a hexagonal grid",
    max: 3,
    idea: "The turns lie on a 60° grid. X and Y arrange the same seven-part motif with different orientations.",
    detail:
      "The turns keep neighboring copies connected while their directions change. The pale path shows the whole stage.",
    takeaway:
      "With endpoint spacing held fixed, seven smaller copies replace the old path at a scale of 1/√7.",
  },
  "levy-curve": {
    title: "Two segments make one right-angle fold",
    max: 7,
    idea: "A straight edge becomes two edges meeting at a right angle. The endpoint distance sets the scale.",
    detail:
      "Each child is 1/√2 of the parent chord. Two such lengths exceed the old straight length.",
    takeaway:
      "The count doubles at every stage. The limiting curve occupies a planar region, although each finite stage is a line.",
  },
  "quadratic-snowflake": {
    title: "A square bump in every edge",
    max: 3,
    idea: "Five strokes replace one stroke. The middle three go around three sides of a square.",
    detail:
      "The replacement travels three unit lengths along the original direction. Keeping that span fixed shrinks each stroke to one third.",
    takeaway:
      "The boundary length multiplies by 5/3. This is the flat relative of the quadratic Koch surface.",
  },
  "sierpinski-arrowhead": {
    title: "One path around triangular gaps",
    max: 5,
    idea: "A and B both draw forward. Their three-part replacements bend in opposite directions.",
    detail:
      "Each rewrite triples the segment count. The alternating turns leave triangular gaps between connected parts.",
    takeaway:
      "The arrowhead approaches the Sierpinski triangle through a single continuous path, rather than by removing filled triangles.",
  },
  "sierpinski-curve": {
    title: "A connected route through nested squares",
    max: 3,
    idea: "X inserts new detours while existing forward strokes remain. The right-angle turns keep the route on a square grid.",
    detail:
      "The full curve stays connected even as more gaps appear inside its repeated square motifs.",
    takeaway: "Following drawing order reveals connections that a dense still image can hide.",
  },
  "koch-anti-snowflake": {
    title: "The same bend points inward",
    max: 3,
    idea: "The Koch replacement has four strokes with 60° turns. Here the starting triangle makes the spikes face inward.",
    detail: "The boundary grows longer while the construction cuts into the enclosed region.",
    takeaway:
      "Orientation changes where the empty space appears, even when the local replacement rule stays the same.",
  },
  "quadratic-koch-island": {
    title: "Eighteen steps replace one edge",
    max: 2,
    idea: "This square-grid replacement takes eighteen strokes to cross a distance of six unit steps.",
    detail: "At a fixed endpoint spacing, every new stroke has one sixth of the old length.",
    takeaway:
      "The boundary length triples at each rewrite: 18 copies times a length factor of 1/6.",
  },
  "minkowski-sausage": {
    title: "Outward and inward bumps balance",
    max: 3,
    idea: "Eight strokes replace one straight edge. The endpoint lies four unit steps along the old direction.",
    detail:
      "One bump turns outward and the other inward. Their signed areas cancel in a closed island.",
    takeaway:
      "Each rewrite doubles boundary length while the corresponding island retains its enclosed area.",
  },
  "cesaro-fractal": {
    title: "A sharper spike needs a longer detour",
    max: 3,
    idea: "Four equal strokes replace one edge. Changing the bend changes the distance between their endpoints.",
    detail:
      "At bend α, the chord spans 2(1 + cos α) unit strokes. Larger bends shorten that chord.",
    takeaway:
      "With the chord fixed, sharper bends increase the total length and crowd neighboring spikes together.",
  },
  "fibonacci-word-fractal": {
    title: "The position of a digit changes its turn",
    max: 10,
    idea: "The word grows by 0 → 01 and 1 → 0. Every digit draws a step.",
    detail:
      "A zero turns after drawing: right at odd positions, left at even positions. A one leaves the direction unchanged.",
    takeaway:
      "The same digit can turn in opposite directions. Geometry depends on both the word and each digit’s position.",
  },
  terdragon: {
    title: "Three copies turn through a triangular lattice",
    max: 5,
    idea: "Three forward strokes replace one stroke, with opposite 120° turns between them.",
    detail:
      "The new path’s endpoint is √3 unit steps from its start. Its heading rotates as the construction grows.",
    takeaway:
      "Shrinking the chord back to its old size gives three copies at scale 1/√3. Their similarity dimension is 2.",
  },
  twindragon: {
    title: "Two folded paths close a tile",
    max: 7,
    idea: "The second dragon is the first turned halfway around the midpoint of its endpoint chord.",
    detail:
      "One path runs from the first endpoint to the second. Its partner returns from the second endpoint to the first.",
    takeaway:
      "The two folds form the boundary of a region. Translated copies of the limiting tile cover the plane.",
  },
  "hilbert-curve-3d": {
    title: "Visit each little cube once",
    max: 3,
    idea: "Eight octants replace the cube. Their routes connect end to end into one path.",
    detail:
      "An order-n path visits all 8ⁿ cells of a 2ⁿ × 2ⁿ × 2ⁿ grid. Consecutive cells share a face.",
    takeaway:
      "A flat projection can make separate strokes look crossed. Turning the view separates their depths.",
  },
  "l-system-explorer": {
    title: "A bracket changes a branch, not the trunk",
    max: 4,
    idea: "The same rewrite can produce a narrow plant or a wide one. The branch angle changes geometry without changing the word.",
    detail:
      "Brackets return the turtle to an earlier position and direction. The next stem segment continues from that saved state.",
    takeaway:
      "A rewriting system separates topology — which branches connect — from geometry — their angles and lengths.",
  },
} as const;
export type PathLessonKind = keyof typeof PATH_LESSONS;
export const isPathLessonKind = (value: unknown): value is PathLessonKind =>
  typeof value === "string" && Object.hasOwn(PATH_LESSONS, value);
