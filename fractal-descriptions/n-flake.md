# N-Flake

An N-Flake starts with a regular polygon and replaces it with smaller copies of the same polygon. One copy sits at each corner, and for a few famous cases there can also be a matching polygon in the center. Repeating that rule turns a simple shape into a ring of smaller shapes, and then rings inside those rings, over and over again.

<figure data-investigation="n-flake"></figure>

That makes N-Flakes more like a whole family of fractals than a single picture. With `n = 3`, the construction is closely related to the [Sierpinski Triangle](/l-system/sierpinski-triangle). With `n = 5` it becomes a pentaflake, and with `n = 6` it becomes a hexaflake. The square case is special too: if a centered square is kept together with the corner copies, the copies share the corner-and-center arrangement of the [2D Vicsek fractal](/vicsek-fractal-2d), but use a different shrink ratio. As the number of sides grows, the boundary starts to resemble gentler and gentler versions of the corners seen in the [Koch Snowflake](/l-system/koch-snowflake).

The shrink ratio depends on the polygon’s geometry. A count of corner copies alone cannot determine how much area remains.
