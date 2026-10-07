import type { NextPage } from "next";
import { Footer } from "../components/Footer";
import { AddMoreLink, FractalLink } from "../components/FractalLink";
import apollonianGasketImage from "../public/assets/fractal-images/apollonian-gasket.jpg";
import barnsleyFernImage from "../public/assets/fractal-images/barnsley-fern.jpg";
import buddhabrotImage from "../public/assets/fractal-images/buddhabrot.jpg";
import burningShipImage from "../public/assets/fractal-images/burning-ship.jpg";
import diffusionLimitedAggregationImage from "../public/assets/fractal-images/diffusion-limited-aggregation.jpg";
import fractalCanopyImage from "../public/assets/fractal-images/fractal-canopy.jpg";
import hTreeImage from "../public/assets/fractal-images/h-tree.jpg";
import jerusalemCubeImage from "../public/assets/fractal-images/jerusalem-cube.jpg";
import juliaSetImage from "../public/assets/fractal-images/julia-set.jpg";
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
import minkowskiSausageImage from "../public/assets/fractal-images/l-system-minkowski-sausage.jpg";
import quadraticKochIslandImage from "../public/assets/fractal-images/l-system-quadratic-koch-island.jpg";
import quadraticSnowflakeImage from "../public/assets/fractal-images/l-system-quadratic-snowflake.jpg";
import sierpinskiCurveImage from "../public/assets/fractal-images/l-system-sierpinski-curve.jpg";
import sierpinsikTriangleImage from "../public/assets/fractal-images/l-system-sierpinski-triangle.jpg";
import terdragonImage from "../public/assets/fractal-images/l-system-terdragon.jpg";
import twindragonImage from "../public/assets/fractal-images/l-system-twindragon.jpg";
import logisticMapImage from "../public/assets/fractal-images/logistic-map.jpg";
import lorenzAttractorImage from "../public/assets/fractal-images/lorenz-attractor.jpg";
import mandelbrotImage from "../public/assets/fractal-images/mandelbrot.jpg";
import mandelbulbImage from "../public/assets/fractal-images/mandelbulb.jpg";
import mengerSpongeImage from "../public/assets/fractal-images/menger-sponge.jpg";
import moselySnowflakeImage from "../public/assets/fractal-images/mosely-snowflake.jpg";
import nFlakeImage from "../public/assets/fractal-images/n-flake.jpg";
import newtonFractalImage from "../public/assets/fractal-images/newton-fractal.jpg";
import penroseTilingImage from "../public/assets/fractal-images/penrose-tiling.jpg";
import polyhedronFlakeImage from "../public/assets/fractal-images/polyhedron-flake.jpg";
import pythagorasTreeImage from "../public/assets/fractal-images/pythagoras-tree.jpg";
import quadraticKoch3DImage from "../public/assets/fractal-images/quadratic-koch-3d.jpg";
import rauzyFractalImage from "../public/assets/fractal-images/rauzy-fractal.jpg";
import rosslerAttractorImage from "../public/assets/fractal-images/rossler-attractor.jpg";
import sierpinskiArrowheadImage from "../public/assets/fractal-images/sierpinski-arrowhead.jpg";
import sierpinskiCarpetImage from "../public/assets/fractal-images/sierpinski-carpet.jpg";
import sierpinskiTetrahedronImage from "../public/assets/fractal-images/sierpinski-tetrahedron.jpg";
import tSquareFractalImage from "../public/assets/fractal-images/t-square-fractal.jpg";
import vicsekFractal2DImage from "../public/assets/fractal-images/vicsek-fractal-2d.jpg";
import vicsekFractal3DImage from "../public/assets/fractal-images/vicsek-fractal-3d.jpg";
import styles from "../styles/Home.module.css";

const Home: NextPage = () => {
  return (
    <>
      <main className={styles.mainContent}>
        <h1 className={styles.heading}>Fractal Garden</h1>
        <h2 className={styles.subtitle}>An Exhibition Of Mathematical Beauty</h2>
        <div className={styles.grid}>
          <FractalLink
            href="/mandelbrot"
            title="Mandelbrot Set"
            imageSrc={mandelbrotImage}
            prio={true}
          />
          <FractalLink href="/julia-set" title="Julia Set" imageSrc={juliaSetImage} prio={true} />
          <FractalLink
            href="/burning-ship"
            title="Burning Ship"
            imageSrc={burningShipImage}
            prio={true}
          />
          <FractalLink
            href="/mosely-snowflake"
            title="Mosely Snowflake"
            imageSrc={moselySnowflakeImage}
          />
          <FractalLink
            href="/vicsek-fractal-3d"
            title="3D Vicsek Fractal"
            imageSrc={vicsekFractal3DImage}
          />
          <FractalLink href="/menger-sponge" title="Menger Sponge" imageSrc={mengerSpongeImage} />
          <FractalLink href="/mandelbulb" title="Mandelbulb" imageSrc={mandelbulbImage} />
          <FractalLink href="/buddhabrot" title="Buddhabrot" imageSrc={buddhabrotImage} />
          <FractalLink
            href="/newton-fractal"
            title="Newton Fractal"
            imageSrc={newtonFractalImage}
          />
          <FractalLink
            href="/pythagoras-tree"
            title="Pythagoras Tree"
            imageSrc={pythagorasTreeImage}
          />
          <FractalLink href="/barnsley-fern" title="Barnsley Fern" imageSrc={barnsleyFernImage} />
          <FractalLink
            href="/sierpinski-carpet"
            title="Sierpinski Carpet"
            imageSrc={sierpinskiCarpetImage}
            prio={true}
          />
          <FractalLink
            href="/l-system/explorer"
            title="L-System Explorer"
            imageSrc={lSystemExplorerImage}
          />
          <FractalLink href="/l-system/levy-curve" title="Lévy Curve" imageSrc={levyCurveImage} />
          <FractalLink
            href="/l-system/dragon-curve"
            title="Dragon Curve"
            imageSrc={dragonCurveImage}
          />
          <FractalLink
            href="/l-system/gosper-curve"
            title="Gosper Curve"
            imageSrc={gosperCurveImage}
          />
          <FractalLink href="/l-system/fern-1" title="L-System Fern 1" imageSrc={fern1Image} />
          <FractalLink href="/l-system/fern-2" title="L-System Fern 2" imageSrc={fern2Image} />
          <FractalLink href="/l-system/fern-3" title="L-System Fern 3" imageSrc={fern3Image} />
          <FractalLink href="/l-system/fern-4" title="L-System Fern 4" imageSrc={fern4Image} />
          <FractalLink href="/l-system/board" title="Board" imageSrc={boardImage} />
          <FractalLink
            href="/l-system/sierpinski-triangle"
            title="Sierpinski Triangle"
            imageSrc={sierpinsikTriangleImage}
          />
          <FractalLink
            href="/fractal-canopy"
            title="Fractal Canopy"
            imageSrc={fractalCanopyImage}
          />
          <FractalLink
            href="/l-system/quadratic-snowflake"
            title="Quadratic Snowflake"
            imageSrc={quadraticSnowflakeImage}
          />
          <FractalLink
            href="/l-system/koch-snowflake"
            title="Koch Snowflake"
            imageSrc={kochSnowflakeImage}
          />
          <FractalLink
            href="/l-system/hilbert-curve"
            title="Hilbert Curve"
            imageSrc={hilbertCurveImage}
          />
          <FractalLink
            href="/l-system/sierpinski-curve"
            title="Sierpinski Curve"
            imageSrc={sierpinskiCurveImage}
          />
          <FractalLink href="/l-system/crystal" title="Crystal" imageSrc={crystalImage} />
          <FractalLink
            href="/l-system/sierpinski-arrowhead"
            title="Sierpinski Arrowhead"
            imageSrc={sierpinskiArrowheadImage}
          />
          <FractalLink
            href="/l-system/fibonacci-word-fractal"
            title="Fibonacci Word Fractal"
            imageSrc={fibonacciWordFractalImage}
          />
          <FractalLink
            href="/t-square-fractal"
            title="T-Square Fractal"
            imageSrc={tSquareFractalImage}
          />
          <FractalLink href="/n-flake" title="N-Flake" imageSrc={nFlakeImage} />
          <FractalLink
            href="/vicsek-fractal-2d"
            title="2D Vicsek Fractal"
            imageSrc={vicsekFractal2DImage}
          />
          <FractalLink
            href="/apollonian-gasket"
            title="Apollonian Gasket"
            imageSrc={apollonianGasketImage}
          />
          <FractalLink href="/logistic-map" title="Logistic Map" imageSrc={logisticMapImage} />
          <FractalLink
            href="/diffusion-limited-aggregation"
            title="Diffusion-Limited Aggregation"
            imageSrc={diffusionLimitedAggregationImage}
          />
          <FractalLink href="/l-system/twindragon" title="Twindragon" imageSrc={twindragonImage} />
          <FractalLink href="/l-system/terdragon" title="Terdragon" imageSrc={terdragonImage} />
          <FractalLink
            href="/lorenz-attractor"
            title="Lorenz Attractor"
            imageSrc={lorenzAttractorImage}
          />
          <FractalLink
            href="/rossler-attractor"
            title="Rössler Attractor"
            imageSrc={rosslerAttractorImage}
          />
          <FractalLink
            href="/l-system/hilbert-curve-3d"
            title="3D Hilbert Curve"
            imageSrc={hilbertCurve3DImage}
          />
          <FractalLink
            href="/jerusalem-cube"
            title="Jerusalem Cube"
            imageSrc={jerusalemCubeImage}
          />
          <FractalLink
            href="/quadratic-koch-3d"
            title="Quadratic Koch Surface"
            imageSrc={quadraticKoch3DImage}
          />
          <FractalLink
            href="/l-system/cesaro-fractal"
            title="Cesàro Fractal"
            imageSrc={cesaroFractalImage}
          />
          <FractalLink
            href="/l-system/minkowski-sausage"
            title="Minkowski Sausage"
            imageSrc={minkowskiSausageImage}
          />
          <FractalLink
            href="/l-system/quadratic-koch-island"
            title="Quadratic Koch Island"
            imageSrc={quadraticKochIslandImage}
          />
          <FractalLink
            href="/l-system/koch-anti-snowflake"
            title="Koch Anti-Snowflake"
            imageSrc={kochAntiSnowflakeImage}
          />
          <FractalLink
            href="/penrose-tiling"
            title="Penrose Tiling"
            imageSrc={penroseTilingImage}
          />
          <FractalLink href="/h-tree" title="H Tree" imageSrc={hTreeImage} />
          <FractalLink href="/rauzy-fractal" title="Rauzy Fractal" imageSrc={rauzyFractalImage} />
          <FractalLink
            href="/sierpinski-tetrahedron"
            title="Sierpinski Tetrahedron"
            imageSrc={sierpinskiTetrahedronImage}
          />
          <FractalLink
            href="/polyhedron-flake"
            title="Polyhedron Flake"
            imageSrc={polyhedronFlakeImage}
          />
          <AddMoreLink />
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Home;
