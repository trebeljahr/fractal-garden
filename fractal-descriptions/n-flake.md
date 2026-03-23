# N-Flake

An N-Flake starts with a regular polygon and replaces it with smaller copies of the same polygon. One copy sits at each corner, and for a few famous cases there can also be a matching polygon in the center. Repeating that rule turns a simple shape into a ring of smaller shapes, and then rings inside those rings, over and over again.

That makes N-Flakes more like a whole family of fractals than a single picture. With `n = 3`, the construction is closely related to the [Sierpinski Triangle](/l-system/sierpinski-triangle). With `n = 5` it becomes a pentaflake, and with `n = 6` it becomes a hexaflake. As the number of sides grows, the boundary starts to resemble gentler and gentler versions of the corners seen in the [Koch Snowflake](/l-system/koch-snowflake).

The version here lets you change the number of sides directly, so you can move from sharp triangular flakes to much rounder polygon families. The centered option is especially interesting for the classic pentaflake and hexaflake cases, where the middle copy helps create the denser star-like structure those versions are known for.
