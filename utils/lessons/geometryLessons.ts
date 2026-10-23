export const GEOMETRY_LESSONS = {
  "h-tree": {
    title: "Shorter branches, more total length",
    max: 7,
    idea: "Put a shorter line across each end of the old line. Alternate between horizontal and vertical lines.",
    detail:
      "The number of new lines doubles each step: 1, 2, 4, 8. Each line is shorter than the one before it.",
    takeaway:
      "Set the length ratio above 0.5. The two new lines together are now longer than the line they came from.",
  },
  "t-square-fractal": {
    title: "See where the squares overlap",
    max: 4,
    idea: "Keep the parent square and center a smaller square on each corner. Repeat on the new squares.",
    detail: "Choose outlines to see each square. Make the new squares larger to see more overlap.",
    takeaway: "If two squares cover the same spot, adding their areas counts that spot twice.",
  },
  "vicsek-fractal-2d": {
    title: "Equal counts, different gaps",
    max: 4,
    idea: "Divide a square into nine. Keep the center and either the four corners or the four squares beside it.",
    detail:
      "Switch between the crosses. Each has five squares of the same size, placed in different positions.",
    takeaway:
      "Repeat inside the five squares. The gaps get smaller while the number of squares multiplies by five.",
  },
  "n-flake": {
    title: "Corners decide where copies fit",
    max: 3,
    idea: "Put a smaller copy at each corner. A triangle gets three copies, a pentagon gets five.",
    detail: "For a square, pentagon or hexagon, you can add a copy in the center too.",
    takeaway:
      "Try the square with a center copy. The four corner squares already fill the space, so the extra copy overlaps them.",
  },
  "mosely-snowflake": {
    title: "Keep the faces and edges, remove the corners",
    max: 2,
    idea: "Split a cube into 27 cells. Both variants remove the eight corner cubes. The lighter one also removes the center.",
    detail:
      "The lighter rule keeps 18 cubes. The heavier rule keeps 19. The same one-cube difference repeats inside every surviving cube.",
    takeaway:
      "Each lighter step keeps 18/27 of the material. Each heavier step keeps 19/27. Both keep losing material as you repeat.",
  },
  "vicsek-fractal-3d": {
    title: "A cross with six arms",
    max: 3,
    idea: "Divide a cube into 27. Keep the center cube and the six touching its faces.",
    detail:
      "Each small cube repeats the same cross. Rotating the view reveals gaps hidden behind the front arms.",
    takeaway:
      "The cubes get smaller faster than their number grows. Each step keeps only 7/27 of the material.",
  },
  "sierpinski-tetrahedron": {
    title: "Four corner copies leave the middle empty",
    max: 3,
    idea: "Put four half-size triangular pyramids at the corners of the old pyramid.",
    detail: "The four copies touch at their corners and leave the middle empty.",
    takeaway: "Each copy has one eighth of the old volume. Four copies keep half the material.",
  },
  "polyhedron-flake": {
    title: "The same corner rule on different solids",
    max: 2,
    idea: "Put a smaller copy at each corner of a solid. Repeat inside each copy.",
    detail:
      "The octahedron has six corners, the dodecahedron twenty, and the icosahedron twelve. Each gets that many copies.",
    takeaway:
      "Switch solids to compare the copies. The dodecahedron has more copies than the icosahedron, but each is smaller.",
  },
  "jerusalem-cube": {
    title: "Two sizes fit along every edge",
    max: 2,
    idea: "Eight larger cubes occupy the corners. Twelve smaller cubes occupy the edges. Face centers and the center stay empty.",
    detail: "Along an edge, two larger cubes and one smaller cube fit the original width.",
    takeaway:
      "Each corner cube is about 41.4% of the original width. Each edge cube is about 17.2%.",
  },
  "koch-surface": {
    title: "One flat triangle becomes six faces",
    max: 3,
    idea: "Divide a triangle into four equal triangles. Put a triangular pyramid on the middle one.",
    detail: "Six half-size triangles replace one face. Each has one quarter of the old area.",
    takeaway:
      "Six quarter-size areas add up to one and a half. The combined triangle area grows by 50% each step.",
  },
  "quadratic-koch-3d": {
    title: "A cube bump replaces a square",
    max: 2,
    idea: "Divide each face into nine squares. Put a small cube on the middle square.",
    detail:
      "Adding the cube covers one square and exposes five new faces. Nine visible squares become thirteen.",
    takeaway:
      "Each new square has one ninth of the old area. Thirteen of them add up to more area than the old face.",
  },
} as const;
export type GeometryLessonKind = keyof typeof GEOMETRY_LESSONS;
export const isGeometryLessonKind = (value: unknown): value is GeometryLessonKind =>
  typeof value === "string" && Object.hasOwn(GEOMETRY_LESSONS, value);
