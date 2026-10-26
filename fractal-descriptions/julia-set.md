# Julia Set

Start with $0.5$ and keep squaring it. You get $0.25$, then $0.0625$, then smaller and smaller numbers. Start with $2$ instead: $4$, $16$, $256$. The answers grow.

We can do the same with points on a plane. A point has a horizontal and a vertical coordinate; together they form a **complex number**. To square it, multiply its distance from zero by itself and double its angle from the line pointing right.

Points less than one unit from zero move closer with every squaring. Points farther than one unit move away. The circle between them is the simplest Julia set.<sup><a id="julia-set-ref-1" href="#julia-set-source-1">1</a></sup>

Try a point inside the circle, then one outside. Next, choose **Add −1**. Subtracting one after every square changes the circle into a different shape.

<figure data-orbit="julia"></figure>

The number added each time is called $c$. Every starting point in one picture uses the same $c$. Change it, and you change the whole picture.

<figure data-article-images="julia"></figure>

Starting points whose results stay within a fixed distance of zero forever make up the **filled Julia set**. Its edge is the **Julia set**. For $c=0$, these are a filled disk and its circular edge.

The computer tests only a limited number of steps. Dark pixels haven't escaped yet; some may escape later.

Which choices of $c$ keep the shape connected? The [Mandelbrot set](/mandelbrot) answers that question. Choose $c$ in the Mandelbrot set and the Julia set is connected. Choose it outside and the Julia set breaks into dust.<sup><a id="julia-set-ref-2" href="#julia-set-source-2">2</a></sup>

Try **Circle**, **Two lobes**, then **Dust** below. Watch where the amber ring sits in the Mandelbrot picture as the Julia shape changes.

<figure data-lesson="linked-julia"></figure>

## Further reading

- [Julia set — Wikipedia](https://en.wikipedia.org/wiki/Julia_set)
- [Introduction to Complex Dynamics — Cornell Math Explorers’ Club](https://pi.math.cornell.edu/~lipa/mec/lesson5.html)

## Sources and notes

1. <span id="julia-set-source-1"></span> [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). [Back](#julia-set-ref-1)
2. <span id="julia-set-source-2"></span> [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf). [Back](#julia-set-ref-2)
