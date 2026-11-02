import type { StaticImageData } from "next/legacy/image";
import apollonianGasketImage from "../public/assets/fractal-images/apollonian-gasket.jpg";
import barnsleyFernImage from "../public/assets/fractal-images/barnsley-fern.jpg";
import barnsleyTreeImage from "../public/assets/fractal-images/barnsley-tree.jpg";
import buddhabrotImage from "../public/assets/fractal-images/buddhabrot.jpg";
import burningShipImage from "../public/assets/fractal-images/burning-ship.jpg";
import cactusFractalImage from "../public/assets/fractal-images/cactus-fractal.jpg";
import circlesAndSquaresImage from "../public/assets/fractal-images/circles-and-squares.jpg";
import diffusionLimitedAggregationImage from "../public/assets/fractal-images/diffusion-limited-aggregation.jpg";
import fractalCanopyImage from "../public/assets/fractal-images/fractal-canopy.jpg";
import gosperIslandImage from "../public/assets/fractal-images/gosper-island.jpg";
import hTreeImage from "../public/assets/fractal-images/h-tree.jpg";
import jerusalemCubeImage from "../public/assets/fractal-images/jerusalem-cube.jpg";
import juliaSetImage from "../public/assets/fractal-images/julia-set.jpg";
import kochSurfaceImage from "../public/assets/fractal-images/koch-surface.jpg";
import boardImage from "../public/assets/fractal-images/l-system-board.jpg";
import cesaroFractalImage from "../public/assets/fractal-images/l-system-cesaro-fractal.jpg";
import crystalImage from "../public/assets/fractal-images/l-system-crystal.jpg";
import dragonCurveImage from "../public/assets/fractal-images/l-system-dragon-curve.jpg";
import lSystemExplorerImage from "../public/assets/fractal-images/l-system-explorer.jpg";
import fern1Image from "../public/assets/fractal-images/l-system-fern-1.jpg";
import fern2Image from "../public/assets/fractal-images/l-system-fern-2.jpg";
import fern3Image from "../public/assets/fractal-images/l-system-fern-3.jpg";
import fern4Image from "../public/assets/fractal-images/l-system-fern-4.jpg";
import fibonacciWordFractalImage from "../public/assets/fractal-images/l-system-fibonacci-word-fractal.jpg";
import gosperCurveImage from "../public/assets/fractal-images/l-system-gosper-curve.jpg";
import hilbertCurveImage from "../public/assets/fractal-images/l-system-hilbert-curve.jpg";
import hilbertCurve3DImage from "../public/assets/fractal-images/l-system-hilbert-curve-3d.jpg";
import kochAntiSnowflakeImage from "../public/assets/fractal-images/l-system-koch-anti-snowflake.jpg";
import kochSnowflakeImage from "../public/assets/fractal-images/l-system-koch-snowflake.jpg";
import levyCurveImage from "../public/assets/fractal-images/l-system-levy.jpg";
import levyTapestryImage from "../public/assets/fractal-images/l-system-levy-tapestry.jpg";
import minkowskiSausageImage from "../public/assets/fractal-images/l-system-minkowski-sausage.jpg";
import peanoCurveImage from "../public/assets/fractal-images/l-system-peano-curve.jpg";
import quadraticKochIslandImage from "../public/assets/fractal-images/l-system-quadratic-koch-island.jpg";
import quadraticSnowflakeImage from "../public/assets/fractal-images/l-system-quadratic-snowflake.jpg";
import sierpinskiCurveImage from "../public/assets/fractal-images/l-system-sierpinski-curve.jpg";
import sierpinsikTriangleImage from "../public/assets/fractal-images/l-system-sierpinski-triangle.jpg";
import terdragonImage from "../public/assets/fractal-images/l-system-terdragon.jpg";
import twindragonImage from "../public/assets/fractal-images/l-system-twindragon.jpg";
import logisticMapImage from "../public/assets/fractal-images/logistic-map.jpg";
import lorenzAttractorImage from "../public/assets/fractal-images/lorenz-attractor.jpg";
import mandelbarSetImage from "../public/assets/fractal-images/mandelbar-set.jpg";
import mandelbrotImage from "../public/assets/fractal-images/mandelbrot.jpg";
import mandelbulbImage from "../public/assets/fractal-images/mandelbulb.jpg";
import mengerSpongeImage from "../public/assets/fractal-images/menger-sponge.jpg";
import miraFractalImage from "../public/assets/fractal-images/mira-fractal.jpg";
import moselySnowflakeImage from "../public/assets/fractal-images/mosely-snowflake.jpg";
import nFlakeImage from "../public/assets/fractal-images/n-flake.jpg";
import newtonFractalImage from "../public/assets/fractal-images/newton-fractal.jpg";
import penroseTilingImage from "../public/assets/fractal-images/penrose-tiling.jpg";
import polyhedronFlakeImage from "../public/assets/fractal-images/polyhedron-flake.jpg";
import pythagorasTreeImage from "../public/assets/fractal-images/pythagoras-tree.jpg";
import quadraticKoch3DImage from "../public/assets/fractal-images/quadratic-koch-3d.jpg";
import rauzyFractalImage from "../public/assets/fractal-images/rauzy-fractal.jpg";
import romanescoImage from "../public/assets/fractal-images/romanesco.jpg";
import rosslerAttractorImage from "../public/assets/fractal-images/rossler-attractor.jpg";
import sierpinskiArrowheadImage from "../public/assets/fractal-images/sierpinski-arrowhead.jpg";
import sierpinskiCarpetImage from "../public/assets/fractal-images/sierpinski-carpet.jpg";
import sierpinskiTetrahedronImage from "../public/assets/fractal-images/sierpinski-tetrahedron.jpg";
import starFractalImage from "../public/assets/fractal-images/star-fractal.jpg";
import tSquareFractalImage from "../public/assets/fractal-images/t-square-fractal.jpg";
import vicsekFractal2DImage from "../public/assets/fractal-images/vicsek-fractal-2d.jpg";
import vicsekFractal3DImage from "../public/assets/fractal-images/vicsek-fractal-3d.jpg";

type FractalTile = { title: string; imageSrc: StaticImageData };

// The order here is the home gallery order. Related tiles reuse the same assets.
export const FRACTAL_TILES = {
  "/mandelbrot": { title: "Mandelbrot Set", imageSrc: mandelbrotImage },
  "/julia-set": { title: "Julia Set", imageSrc: juliaSetImage },
  "/burning-ship": { title: "Burning Ship", imageSrc: burningShipImage },
  "/mosely-snowflake": { title: "Mosely Snowflake", imageSrc: moselySnowflakeImage },
  "/vicsek-fractal-3d": { title: "3D Vicsek Fractal", imageSrc: vicsekFractal3DImage },
  "/menger-sponge": { title: "Menger Sponge", imageSrc: mengerSpongeImage },
  "/mandelbulb": { title: "Mandelbulb", imageSrc: mandelbulbImage },
  "/romanesco": { title: "Romanesco", imageSrc: romanescoImage },
  "/buddhabrot": { title: "Buddhabrot", imageSrc: buddhabrotImage },
  "/newton-fractal": { title: "Newton Fractal", imageSrc: newtonFractalImage },
  "/pythagoras-tree": { title: "Pythagoras Tree", imageSrc: pythagorasTreeImage },
  "/barnsley-fern": { title: "Barnsley Fern", imageSrc: barnsleyFernImage },
  "/sierpinski-carpet": { title: "Sierpinski Carpet", imageSrc: sierpinskiCarpetImage },
  "/l-system/explorer": { title: "L-System Explorer", imageSrc: lSystemExplorerImage },
  "/l-system/levy-curve": { title: "Lévy Curve", imageSrc: levyCurveImage },
  "/l-system/dragon-curve": { title: "Dragon Curve", imageSrc: dragonCurveImage },
  "/l-system/gosper-curve": { title: "Gosper Curve", imageSrc: gosperCurveImage },
  "/l-system/fern-1": { title: "L-System Fern 1", imageSrc: fern1Image },
  "/l-system/fern-2": { title: "L-System Fern 2", imageSrc: fern2Image },
  "/l-system/fern-3": { title: "L-System Fern 3", imageSrc: fern3Image },
  "/l-system/fern-4": { title: "L-System Fern 4", imageSrc: fern4Image },
  "/l-system/board": { title: "Board", imageSrc: boardImage },
  "/l-system/sierpinski-triangle": {
    title: "Sierpinski Triangle",
    imageSrc: sierpinsikTriangleImage,
  },
  "/fractal-canopy": { title: "Fractal Canopy", imageSrc: fractalCanopyImage },
  "/l-system/quadratic-snowflake": {
    title: "Quadratic Snowflake",
    imageSrc: quadraticSnowflakeImage,
  },
  "/l-system/koch-snowflake": { title: "Koch Snowflake", imageSrc: kochSnowflakeImage },
  "/l-system/hilbert-curve": { title: "Hilbert Curve", imageSrc: hilbertCurveImage },
  "/l-system/sierpinski-curve": { title: "Sierpinski Curve", imageSrc: sierpinskiCurveImage },
  "/l-system/crystal": { title: "Crystal", imageSrc: crystalImage },
  "/l-system/sierpinski-arrowhead": {
    title: "Sierpinski Arrowhead",
    imageSrc: sierpinskiArrowheadImage,
  },
  "/l-system/fibonacci-word-fractal": {
    title: "Fibonacci Word Fractal",
    imageSrc: fibonacciWordFractalImage,
  },
  "/t-square-fractal": { title: "T-Square Fractal", imageSrc: tSquareFractalImage },
  "/n-flake": { title: "N-Flake", imageSrc: nFlakeImage },
  "/vicsek-fractal-2d": { title: "2D Vicsek Fractal", imageSrc: vicsekFractal2DImage },
  "/apollonian-gasket": { title: "Apollonian Gasket", imageSrc: apollonianGasketImage },
  "/logistic-map": { title: "Logistic Map", imageSrc: logisticMapImage },
  "/diffusion-limited-aggregation": {
    title: "Diffusion-Limited Aggregation",
    imageSrc: diffusionLimitedAggregationImage,
  },
  "/l-system/twindragon": { title: "Twindragon", imageSrc: twindragonImage },
  "/l-system/terdragon": { title: "Terdragon", imageSrc: terdragonImage },
  "/lorenz-attractor": { title: "Lorenz Attractor", imageSrc: lorenzAttractorImage },
  "/rossler-attractor": { title: "Rössler Attractor", imageSrc: rosslerAttractorImage },
  "/l-system/hilbert-curve-3d": { title: "3D Hilbert Curve", imageSrc: hilbertCurve3DImage },
  "/jerusalem-cube": { title: "Jerusalem Cube", imageSrc: jerusalemCubeImage },
  "/quadratic-koch-3d": { title: "Quadratic Koch Surface", imageSrc: quadraticKoch3DImage },
  "/l-system/cesaro-fractal": { title: "Cesàro Fractal", imageSrc: cesaroFractalImage },
  "/l-system/minkowski-sausage": { title: "Minkowski Sausage", imageSrc: minkowskiSausageImage },
  "/l-system/quadratic-koch-island": {
    title: "Quadratic Koch Island",
    imageSrc: quadraticKochIslandImage,
  },
  "/l-system/koch-anti-snowflake": {
    title: "Koch Anti-Snowflake",
    imageSrc: kochAntiSnowflakeImage,
  },
  "/penrose-tiling": { title: "Penrose Tiling", imageSrc: penroseTilingImage },
  "/h-tree": { title: "H Tree", imageSrc: hTreeImage },
  "/rauzy-fractal": { title: "Rauzy Fractal", imageSrc: rauzyFractalImage },
  "/sierpinski-tetrahedron": {
    title: "Sierpinski Tetrahedron",
    imageSrc: sierpinskiTetrahedronImage,
  },
  "/polyhedron-flake": { title: "Polyhedron Flake", imageSrc: polyhedronFlakeImage },
  "/koch-surface": { title: "Koch Surface", imageSrc: kochSurfaceImage },
  "/mandelbar-set": { title: "Mandelbar Set", imageSrc: mandelbarSetImage },
  "/cactus-fractal": { title: "Cactus Fractal", imageSrc: cactusFractalImage },
  "/barnsley-tree": { title: "Barnsley's Tree", imageSrc: barnsleyTreeImage },
  "/mira-fractal": { title: "Mira Fractal", imageSrc: miraFractalImage },
  "/star-fractal": { title: "Star Fractal", imageSrc: starFractalImage },
  "/gosper-island": { title: "Gosper Island", imageSrc: gosperIslandImage },
  "/l-system/peano-curve": { title: "Peano Curve", imageSrc: peanoCurveImage },
  "/l-system/levy-tapestry": { title: "Lévy Tapestry", imageSrc: levyTapestryImage },
  "/circles-and-squares": { title: "Circles and Squares", imageSrc: circlesAndSquaresImage },
} satisfies Record<string, FractalTile>;

export type FractalTilePath = keyof typeof FRACTAL_TILES;
