# Barnsley Fern

Start with one point. Choose one of four affine maps, move the point, and plot its new position. Repeat. The outline emerges from the accumulated dots.

For **Classic Barnsley**, the maps act on coordinates $(x,y)$ as follows:

$$
f_1(x,y)=(0,0.16y)
$$
$$
f_2(x,y)=(0.85x+0.04y,-0.04x+0.85y+1.6)
$$
$$
f_3(x,y)=(0.20x-0.26y,0.23x+0.22y+1.6)
$$
$$
f_4(x,y)=(-0.15x+0.28y,0.26x+0.24y+0.44)
$$

Their selection probabilities are 1%, 85%, 7% and 7%. The first map produces the stem. The second carries most points toward the tip. The other maps place points in the side leaflets. Other styles in the explorer use different coefficients and probabilities.

<figure data-article-images="fern"></figure>

Apply each map to the *whole fern*, rather than one dot. Their four images together reproduce the original set:

$$
F=f_1(F)\cup f_2(F)\cup f_3(F)\cup f_4(F).
$$

<figure data-lesson="fern"></figure>

This is an iterated function system. Hutchinson proved that a finite family of contractions has one compact invariant set. Positive selection probabilities also determine an invariant probability measure supported on that set.<sup><a id="barnsley-fern-ref-1" href="#barnsley-fern-source-1">1</a></sup>

Changing positive probabilities changes the density of dots, while the four fixed maps determine the limiting outline. Sparse regions can take much longer to appear.

The maps are affine, so their copies can stretch differently in different directions. A leaflet need not be a uniformly scaled replica. The [L-system ferns](/l-system/fern-1) instead construct branches from symbolic instructions. The [fractal canopy](/fractal-canopy) repeats explicit branch geometry.

## Sources and notes

1. <span id="barnsley-fern-source-1"></span> John E. Hutchinson, [Fractals and Self Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), *Indiana University Mathematics Journal* 30 (1981), 713–747. Sections 3–4 establish the invariant set and measure. Coefficients above match this explorer's Classic Barnsley preset. [Back](#barnsley-fern-ref-1)
