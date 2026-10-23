# Barnsley Fern

Pick a point. Move it using one of four rules. Draw a dot where it lands, then move that point again. Keep going, and a fern appears.

No rule draws a leaf. Each rule shrinks, turns or moves the point. Together, they put the dots in the right places.<sup><a id="barnsley-fern-ref-1" href="#barnsley-fern-source-1">1</a></sup>

<figure data-article-images="fern"></figure>

## Four rules make the whole fern

The Classic Barnsley preset chooses these rules:

- **Stem:** squash the point onto the stem. Use this rule 1% of the time.
- **Tip:** shrink and turn toward the top. Use it 85% of the time.
- **Left leaflet:** move into a smaller copy on one side. Use it 7% of the time.
- **Right leaflet:** move into the copy on the other side. Use it 7% of the time.

The next dot always starts from the last dot. Randomness chooses the rule, not a fresh place on the screen.

<figure data-lesson="fern"></figure>

You can also make the fern without randomness. Choose **All four maps** to apply all four rules to the whole picture at once. Repeat on the result.

Both methods approach the same fern. Even the starting picture can change: a point, a rectangle or a small drawing will approach that same shape.<sup><a id="barnsley-fern-ref-2" href="#barnsley-fern-source-2">2</a></sup> At early stages, you can still see pieces of the starting picture.

## Change the fern

**Fern style** changes the four rules. Compare **Cyclosorus** with **Fishbone fern** and watch the side leaflets change shape.

Changing how often a rule is chosen changes where dots pile up. As long as every rule keeps a positive chance, the same four rules still define the same final shape.<sup><a id="barnsley-fern-ref-3" href="#barnsley-fern-source-3">3</a></sup>

Scroll or pinch over a leaflet to see its smaller copies. The explorer adds detail inside the view as you zoom. It gives sparse areas extra dots so you can see them. The zoomed image shows the shape, rather than the original distribution of dots.

The [L-system fern](/l-system/fern-1) grows another way: it follows instructions for drawing and branching. The [fractal canopy](/fractal-canopy) starts with a trunk and repeats a fork.

## Sources and notes

1. <span id="barnsley-fern-source-1"></span> Michael F. Barnsley and Andrew Vince, [The Chaos Game on a General Iterated Function System](https://arxiv.org/pdf/1005.0322), *Ergodic Theory and Dynamical Systems* 31, no. 4 (2011), 1073–1079. Theorem 3 establishes almost-sure convergence under conditions that include these contracting maps and fixed positive selection probabilities. [Back](#barnsley-fern-ref-1)
2. <span id="barnsley-fern-source-2"></span> John E. Hutchinson, [Fractals and Self Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), *Indiana University Mathematics Journal* 30 (1981), 713–747. Sections 3.1–3.2 prove uniqueness of the compact invariant set and convergence of whole-set iteration. [Back](#barnsley-fern-ref-2)
3. <span id="barnsley-fern-source-3"></span> Hutchinson, same paper, Section 4.4. Positive rule probabilities change the distribution of dots while preserving the set they approach. Preset choices and zoom sampling describe this explorer. [Back](#barnsley-fern-ref-3)
