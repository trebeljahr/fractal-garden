# Mandelbrot Set

You get this set by iterating over the equation 
$$
z = z^2 + c 
$$

for all points $z$ in the complex plane.

If after iterating a couple of times (say 100), the resulting number is still less than 2, the point is in the Mandelbrot set. If not, then it isn't.

If a point escaped from the mandelbrot set, it is colored based on an algorithm called orbit trapping. 

```js
const a = "hello world"
function b(iterate_over_fractal) {
    console.log(b)
}
``` 

All of this is implemented in a shader. You can look at it here: 