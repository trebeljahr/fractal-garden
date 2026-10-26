export const GEOMETRY_LESSONS = {
  "h-tree": {
    title: "Shorter branches can add more length",
    max: 7,
    idea: "Put a shorter line across each end of the first line. At the next round, turn the new lines the other way.",
    detail:
      "Every line gets two shorter branches. Set the size of each new copy to 0.5: together, those two branches match the old line’s length.",
    takeaway:
      "Raise the size above 0.5. Each branch is still shorter, but the pair is now longer than the line they came from.",
  },
  "t-square-fractal": {
    title: "Find where the squares overlap",
    max: 4,
    idea: "Put a smaller square on each corner of the first square, with its center exactly on that corner. Keep the first square too.",
    detail:
      "Follow the outlines to see where one square covers part of another. Increase the size of each new copy to make those overlaps larger.",
    takeaway:
      "Adding all the square areas would count the overlaps more than once. The area actually covered is smaller than that sum.",
  },
  "vicsek-fractal-2d": {
    title: "Keep five squares in two different ways",
    max: 4,
    idea: "Divide a square into nine. Keep the middle square, then choose four more to make a cross.",
    detail:
      "Switch between the two crosses. They keep the same amount of area, but place the gaps in different positions.",
    takeaway:
      "Add another round. Each of the five squares now contains a smaller version of your chosen cross.",
  },
  "n-flake": {
    title: "Put a smaller shape at each corner",
    max: 3,
    idea: "Set Sides to 3: a triangle gets three smaller copies, one at each corner. Now change the number of sides.",
    detail:
      "A pentagon needs five copies because it has five corners. Each copy gets the same arrangement again in the next round.",
    takeaway:
      "Try a square, then keep its center copy too. The four corner squares already fill the space, so the extra square overlaps them.",
  },
  "mosely-snowflake": {
    title: "Remove the corners of a cube",
    max: 2,
    idea: "Divide the cube into 27 smaller cubes. Remove the eight corners, then choose whether to keep the center cube.",
    detail:
      "Take one step and turn the view to find the missing corners. Keeping the center adds just one cube, hidden inside.",
    takeaway:
      "The next round repeats your choice inside every remaining cube. Removing cubes also exposes faces that were hidden before.",
  },
  "vicsek-fractal-3d": {
    title: "Find the six arms of the cross",
    max: 3,
    idea: "Divide a cube into 27 smaller cubes. Keep the center cube and one cube against each of its six faces.",
    detail:
      "Turn the view to find the arms hidden at the back. Then add a round: every cube becomes a smaller six-armed cross.",
    takeaway:
      "Only seven of the 27 cubes survive each replacement. The total volume decreases even as the number of little cubes grows.",
  },
  "sierpinski-tetrahedron": {
    title: "Leave a gap between four pyramids",
    max: 3,
    idea: "Replace the triangular pyramid with four half-size copies, one at each corner. Turn the view to look into the middle.",
    detail:
      "The four copies meet at their corners. Between them is a gap that none of the copies fills.",
    takeaway:
      "Each copy has one eighth of the original volume, so four copies keep half. Another round removes half of what is left.",
  },
  "polyhedron-flake": {
    title: "Try the corner rule on another solid",
    max: 2,
    idea: "Put a smaller copy at every corner of a solid. Change the solid to see how its corners arrange the copies.",
    detail:
      "The octahedron has six corners, the dodecahedron twenty and the icosahedron twelve. More corners mean more copies in each round.",
    takeaway:
      "Compare the last two solids. The dodecahedron fits in more copies by making them smaller.",
  },
  "jerusalem-cube": {
    title: "Fit two sizes of cube along an edge",
    max: 2,
    idea: "Put a larger cube at each corner and a smaller cube in the middle of each edge. Leave the centers of the faces empty.",
    detail:
      "Follow one outside edge: a large cube, a small cube, then a large cube span the full width.",
    takeaway:
      "Add another round. Both sizes of cube receive the same arrangement, leaving smaller cross-shaped openings inside them.",
  },
  "koch-surface": {
    title: "Put a pyramid on the middle triangle",
    max: 3,
    idea: "Divide a flat triangle into four equal triangles. Keep the three corner triangles and put a triangular pyramid on the middle one.",
    detail:
      "Turn the view to see the pyramid’s three sloping faces. Together with the three flat corners, they make six smaller triangles.",
    takeaway:
      "Each has a quarter of the old area. Their combined area is larger, even though the outside corners stay in place.",
  },
  "quadratic-koch-3d": {
    title: "Put a cube on a square face",
    max: 2,
    idea: "Divide a face into nine equal squares. Place a small cube on its middle square, then do the same on every face.",
    detail:
      "The cube hides the middle square, but adds five faces of its own. That leaves thirteen visible squares where there were nine.",
    takeaway:
      "Add another round. The new bumps repeat on the flat parts and on every face of the earlier bumps.",
  },
} as const;
export type GeometryLessonKind = keyof typeof GEOMETRY_LESSONS;
export const isGeometryLessonKind = (value: unknown): value is GeometryLessonKind =>
  typeof value === "string" && Object.hasOwn(GEOMETRY_LESSONS, value);
