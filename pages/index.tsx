import type { NextPage } from "next";
import Head from "next/head";
import { FractalLink } from "../components/FractalLink";
import styles from "../styles/Home.module.css";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Fractal Garden</title>
        <meta
          name="description"
          content="Fractal Garden - An Exhibition Of Mathematical Beauty: A page to collect fractal renderings, and teach people about the awesome connections between different fractals and how they are drawn. Also, they look pretty."
        />
      </Head>
      <main className={styles.mainContent}>
        <h1 className={styles.heading}>Fractal Garden</h1>
        <h2 className={styles.subtitle}>
          An Exhibition Of Mathematical Beauty
        </h2>
        <div className={styles.grid}>
          <FractalLink
            href="/mandelbrot"
            title="Mandelbrot Set"
            imageSrc="/assets/fractal-images/mandelbrot.jpg"
            prio={true}
          />
          <FractalLink
            href="/barnsley-fern"
            title="Barnsley Fern"
            imageSrc="/assets/fractal-images/barnsley-fern.jpg"
            prio={true}
          />
          <FractalLink
            href="/sierpinski-carpet"
            title="Sierpinski Carpet"
            imageSrc="/assets/fractal-images/sierpinski-carpet.jpg"
          />
          <FractalLink
            href="/l-system/levy-curve"
            title="Lévy Curve"
            imageSrc="/assets/fractal-images/l-system-levy.jpg"
          />
          <FractalLink
            href="/l-system/fern-1"
            title="L-System Fern 1"
            imageSrc="/assets/fractal-images/l-system-fern-1.jpg"
          />
          <FractalLink
            href="/l-system/fern-2"
            title="L-System Fern 2"
            imageSrc="/assets/fractal-images/l-system-fern-2.jpg"
          />
          <FractalLink
            href="/l-system/fern-3"
            title="L-System Fern 3"
            imageSrc="/assets/fractal-images/l-system-fern-3.jpg"
          />
          <FractalLink
            href="/l-system/fern-4"
            title="L-System Fern 4"
            imageSrc="/assets/fractal-images/l-system-fern-4.jpg"
          />
          <FractalLink
            href="/l-system/board"
            title="Board"
            imageSrc="/assets/fractal-images/l-system-board.jpg"
          />
          <FractalLink
            href="/l-system/sierpinski-triangle"
            title="Sierpinski Triangle"
            imageSrc="/assets/fractal-images/l-system-sierpinski-triangle.jpg"
          />
          <FractalLink
            href="/fractal-canopy"
            title="Fractal Canopy"
            imageSrc="/assets/fractal-images/fractal-canopy.jpg"
          />
          <FractalLink
            href="/l-system/quadratic-snowflake"
            title="Quadratic Snowflake"
            imageSrc="/assets/fractal-images/l-system-quadratic-snowflake.jpg"
          />
          <FractalLink
            href="/l-system/koch-snowflake"
            title="Koch Snowflake"
            imageSrc="/assets/fractal-images/l-system-koch-snowflake.jpg"
          />
          <FractalLink
            href="/l-system/hilbert-curve"
            title="Hilbert Curve"
            imageSrc="/assets/fractal-images/l-system-hilbert-curve.jpg"
          />
          <FractalLink
            href="/l-system/sierpinski-curve"
            title="Sierpinski Curve"
            imageSrc="/assets/fractal-images/l-system-sierpinski-curve.jpg"
          />
          <FractalLink
            href="/l-system/crystal"
            title="Crystal"
            imageSrc="/assets/fractal-images/l-system-crystal.jpg"
          />
          <FractalLink
            href="/l-system/sierpinski-arrowhead"
            title="Sierpinski Arrowhead"
            imageSrc="/assets/fractal-images/sierpinski-arrowhead.jpg"
          />
        </div>
      </main>
    </>
  );
};

export default Home;
