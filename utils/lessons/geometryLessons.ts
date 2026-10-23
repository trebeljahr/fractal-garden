export const GEOMETRY_LESSONS = {
  "h-tree": {
    title: "Shorter branches, more total length",
    max: 7,
    idea: "Each segment carries two shorter segments at its endpoints. Their direction alternates between horizontal and vertical.",
    detail:
      "The newest generation has 2ⁿ segments of length rⁿ. Its total length is (2r)ⁿ, relative to the first segment.",
    takeaway:
      "When r is greater than one half, each generation uses more line than the one before it, although individual branches shrink.",
  },
  "t-square-fractal": {
    title: "Overlaps change the visible area",
    max: 4,
    idea: "Keep the parent square and center a smaller square on each corner. Repeat on the new squares.",
    detail:
      "Outlined squares reveal the boundaries inside the filled shape. Increasing their scale makes them overlap more of the existing picture.",
    takeaway:
      "Adding the individual square areas counts overlapping regions more than once. The union has a different area.",
  },
  "vicsek-fractal-2d": {
    title: "Equal counts, different gaps",
    max: 4,
    idea: "Both crosses keep five cells from a three-by-three grid. One keeps the corners, the other keeps the side centers.",
    detail:
      "Changing the placement changes the gaps, but not the number or size of the surviving squares.",
    takeaway:
      "Both layouts have dimension log(5)/log(3). Dimension records how copies scale, but does not specify their arrangement.",
  },
  "n-flake": {
    title: "Corners decide where copies fit",
    max: 3,
    idea: "Each corner receives a smaller polygon. The number of sides sets both the number of copies and their shrink ratio.",
    detail:
      "The optional central copy appears only in the square, pentagon and hexagon variants. These are different replacement rules.",
    takeaway:
      "More copies do not always mean a denser limit. Their size and their overlaps also matter.",
  },
  "mosely-snowflake": {
    title: "Keep the faces and edges, remove the corners",
    max: 2,
    idea: "Split a cube into 27 cells. Both variants remove the eight corner cubes. The lighter one also removes the center.",
    detail:
      "The lighter rule keeps 18 cubes. The heavier rule keeps 19. The same one-cube difference repeats inside every surviving cube.",
    takeaway:
      "After n replacements their volume fractions are (18/27)ⁿ and (19/27)ⁿ. Both tend to zero.",
  },
  "vicsek-fractal-3d": {
    title: "A cross with six arms",
    max: 3,
    idea: "Seven of the 27 small cubes survive: the center and its six face neighbors.",
    detail:
      "Each small cube repeats the same cross. Rotating the view reveals gaps hidden behind the front arms.",
    takeaway: "The number of cubes grows as 7ⁿ, but their total volume shrinks as (7/27)ⁿ.",
  },
  "sierpinski-tetrahedron": {
    title: "Four corner copies leave the middle empty",
    max: 3,
    idea: "Four tetrahedra sit at the corners of the parent. Each has half its edge length.",
    detail:
      "The corner copies touch at vertices. The missing middle has the shape of an octahedron.",
    takeaway:
      "Four copies at half size give dimension 2, while their combined volume halves at every replacement.",
  },
  "polyhedron-flake": {
    title: "The same corner rule on different solids",
    max: 2,
    idea: "Replace a solid by smaller copies centered toward its vertices. The vertex arrangement determines the spaces between them.",
    detail:
      "The octahedron has six corners, the dodecahedron twenty, and the icosahedron twelve. Their fitted copy sizes differ.",
    takeaway:
      "A copy count needs a shrink ratio before it says anything about dimension. Shape and placement determine whether those copies overlap.",
  },
  "jerusalem-cube": {
    title: "Two sizes fit along every edge",
    max: 2,
    idea: "Eight larger cubes occupy the corners. Twelve smaller cubes occupy the edges. Face centers and the center stay empty.",
    detail: "The corner scale is r = √2 − 1. The edge scale is r². Along an edge, 2r + r² = 1.",
    takeaway:
      "The rule mixes two scales. Its dimension therefore solves 8rᴰ + 12r²ᴰ = 1, rather than a single log-ratio formula.",
  },
  "koch-surface": {
    title: "One flat triangle becomes six faces",
    max: 3,
    idea: "Join the edge midpoints. Keep the three corner triangles and raise the middle triangle into three tetrahedron walls.",
    detail: "Six half-size triangles replace one face. Each has one quarter of the old area.",
    takeaway:
      "The triangle count grows as 6ⁿ. The total face area grows as (6/4)ⁿ, even though the construction stays bounded.",
  },
  "quadratic-koch-3d": {
    title: "A cube bump replaces a square",
    max: 2,
    idea: "Split each square face into nine cells. Replace the center cell with the five exposed faces of a small cube.",
    detail:
      "Adding the cube covers one square and exposes five new faces. Nine visible squares become thirteen.",
    takeaway:
      "The face count grows by 13, and the total face area grows by 13/9 at each replacement.",
  },
} as const;
export type GeometryLessonKind = keyof typeof GEOMETRY_LESSONS;
export const isGeometryLessonKind = (value: unknown): value is GeometryLessonKind =>
  typeof value === "string" && Object.hasOwn(GEOMETRY_LESSONS, value);
