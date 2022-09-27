# Barnsley Fern

The Barnsley Fern is an IFS (Iterated Function System). 

This means it is a function that can be called over and over again. The function is transforming a single point around the screen, using a set of affine transformations – a bunch of cleverly picked "magic" numbers moving and rotating points on the screen.

<br/>

```js
const barnsley = [
    [0, 0, 0, 0.16, 0, 0, 0.01],
    [0.85, 0.04, -0.04, 0.85, 0, 1.6, 0.85],
    [0.2, -0.26, 0.23, 0.22, 0, 1.6, 0.07],
    [-0.15, 0.28, 0.26, 0.24, 0, 0.44, 0.07],
];
``` 

<br/>


Which of the transformations is picked depends on the last value of the arrays from above. I.e. the first transformation is picked with a likelihood of 0.01, the second with a likelihood of 0.85 etc.

<br>

When painting the point transformed with the above transformations on a screen over and over again, this *iteration* of the function slowly starts to paint a picture. A shape – the Barnsley Fern – emerges.

The iterated function code for the Barnsley Fern in P5:

<br/>


```js
let x = 0;
let y = 0;

function applyMatrixValues(xValue: number, yValue: number, matrix: number[]) {
  const newXValue = barnsley[0] * xValue + barnsley[1] * yValue + barnsley[4];
  const newYValue = barnsley[2] * xValue + barnsley[3] * yValue + barnsley[5];
  return { newXValue, newYValue };
}

function generateNewCoords(xValue: number, yValue: number) {
  const r = Math.random();
  const prob1 = barnsley[1][6];
  const prob2 = barnsley[2][6];
  const prob3 = barnsley[3][6];
  const prob4 = barnsley[0][6];
  if (r <= prob1) {
    return applyMatrixValues(xValue, yValue, barnsley[1]);
  } else if (r <= prob1 + prob2) {
    return applyMatrixValues(xValue, yValue, barnsley[2]);
  } else if (r <= prob1 + prob2 + prob3) {
    return applyMatrixValues(xValue, yValue, barnsley[3]);
  } else if (r <= prob1 + prob2 + prob3 + prob4) {
    return applyMatrixValues(xValue, yValue, barnsley[0]);
  }
  return {
    newXValue: 0,
    newYValue: 0,
  };
}

// this is repeatedly called by P5.js -> roughly 60 times per second.
function draw() {
    for (let i = 0; i < 1000; i++) {
        const fernHeight = height;
        const fernWidth = fernHeight / 2;

        let plotX = fernWidth * ((x + 3) / 6) + width / 2 - fernWidth / 2;
        let plotY = height - (fernHeight * y) / 14;

        stroke(color);
        strokeWeight(1);
        point(plotX, plotY);

        const coords = generateNewCoords(x, y);
        x = coords.newXValue;
        y = coords.newYValue;
    }
};

```

<br/>


One can play around with and change the numbers going into the algorithm and thereby create different fractal shapes. Interestingly, one of those shapes is very similar to the [Fractal Canopy](/fractal-canopy).

For more explanations on the mathematics of the Barnsley Fern have a look at 
[this article from the Algorithms Archive](https://www.algorithm-archive.org/contents/barnsley/barnsley.html) and the [Wikipedia Page for the Barnsley Fern](https://en.wikipedia.org/wiki/Barnsley_fern)
