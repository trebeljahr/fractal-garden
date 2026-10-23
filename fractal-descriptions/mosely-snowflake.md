# Mosely Snowflake

Split a cube into 27 little cubes. Remove the eight corners. Repeat inside every cube that remains.

The **heavier** version keeps nineteen cubes each time. The **lighter** version also removes the middle cube, leaving eighteen.

<figure data-construction-player="mosely-snowflake"></figure>

Both versions lose volume at every round. Keep going forever and that volume falls to zero. The holes and corners keep gaining smaller detail.

## A cube with a snowflake shadow

Look at a cube from a corner, along its diagonal. With parallel viewing rays, its shadow is a hexagon.

Keep removing corners with the heavier rule, and that shadow approaches a filled [Koch snowflake](/l-system/koch-snowflake).<sup><a id="mosely-snowflake-ref-1" href="#mosely-snowflake-source-1">1</a></sup> The cubes make an outline usually built from triangular bumps.

<figure data-article-images="mosely-koch"></figure>

The lighter version has holes in this shadow. Removing its middle cubes opens gaps that the heavier version fills. The exact filled-snowflake result belongs to the heavier rule.

The main explorer uses perspective, so moving the camera changes the apparent outline.

## Built from business cards

The fractal is named for Jeannine Mosely. She and Margaret Wertheim documented a USC Libraries project to assemble a model from roughly 49,000 business cards in 2011–2012.<sup><a id="mosely-snowflake-ref-2" href="#mosely-snowflake-source-2">2</a></sup>

Compare the [Menger sponge](/menger-sponge). It keeps the corners and removes the face centers. Swapping which cubes remain changes both the tunnels and the shadow.

## Sources and notes

1. <span id="mosely-snowflake-source-1"></span> Eric Baird, [The Impossible Snowflake](https://alt-fractals.blogspot.com/2011/04/impossible-snowflake.html), 30 April 2011. Nineteen-cube construction and exact diagonal Koch silhouette. [Back](#mosely-snowflake-ref-1)
2. <span id="mosely-snowflake-source-2"></span> Margaret Wertheim and Jeannine Mosely, [The Mosely Snowflake Sponge: Construction Guide](https://www.theiff.org/exhibits/USC%20Sponge%20Guide.pdf), USC Libraries Discovery Fellowship, 2011–2012. Business-card model, module counts and attribution. The volume comparison follows from this explorer’s cube counts. [Back](#mosely-snowflake-ref-2)
