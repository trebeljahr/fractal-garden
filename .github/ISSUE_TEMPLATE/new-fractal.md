---
name: New Fractal
about: Add a new Fractal to the Garden
title: Add [Name of Fractal]
labels: enhancement, new-fractal
assignees: ''

---

## Description
Add Ability to showcase Julia Sets. Ideally, this would have a small "control" surface -> where the user can interact with the mouse, depending on the mouse coordinates in that window the corresponding Julia Set is rendered. 
Something like this: 
[EkZhang - WebGL Demo](https://www.ekzhang.com/webgl-julia-viewer/)

**Bonus:** Ability to pre-select a few "cool" Julia Sets from a Dropdown in the Dat Gui Component. 

## Inspiration
[Wikipedia - Julia Set](https://en.wikipedia.org/wiki/Julia_set)
[Paul Bourke - Julia Set](http://paulbourke.net/fractals/juliaset/)

Code for the Demo above:
[EkZhang - WebGL Julia Viewer Implementation](https://github.com/ekzhang/webgl-julia-viewer)

## Type
Shader -> WebGL

## Difficulties
Implementing the mapping of Coordinates from the "control" Surface to the WebGL Shader Input might be a bit tricky.
