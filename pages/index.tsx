import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import styles from "../styles/Home.module.css";

type FractalLinkProps = {
  href: string;
  imageSrc: string;
  title: string;
};

const FractalLink = ({ href, imageSrc, title }: FractalLinkProps) => {
  return (
    <div className={styles.gridItem}>
      <article className={styles.card}>
        <Link as={href} href={href}>
          <a className={styles.cardLink}></a>
        </Link>
        <div className={styles.squareImage}>
          <Image src={imageSrc} alt={title} layout="fill" />
        </div>

        <div className={styles.cardContent}>
          <h3 className={styles.cardHeading}>{title}</h3>
        </div>
      </article>
    </div>
  );
};

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
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
            imageSrc="/assets/fractal-images/mandelbrot.png"
          />
          <FractalLink
            href="/barnsley-fern"
            title="Barnsley Fern"
            imageSrc="/assets/fractal-images/barnsley-fern.png"
          />
          <FractalLink
            href="/sierpinski-carpet"
            title="Sierpinski Carpet"
            imageSrc="/assets/fractal-images/sierpinski-carpet.png"
          />
          <FractalLink
            href="/l-system/levy-curve"
            title="Lévy Curve"
            imageSrc="/assets/fractal-images/l-system-levy.png"
          />
          <FractalLink
            href="/l-system/fern-1"
            title="L-System Fern 1"
            imageSrc="/assets/fractal-images/l-system-fern-1.png"
          />
          <FractalLink
            href="/l-system/fern-2"
            title="L-System Fern 2"
            imageSrc="/assets/fractal-images/l-system-fern-2.png"
          />
          <FractalLink
            href="/l-system/fern-3"
            title="L-System Fern 3"
            imageSrc="/assets/fractal-images/l-system-fern-3.png"
          />
          <FractalLink
            href="/l-system/fern-4"
            title="L-System Fern 4"
            imageSrc="/assets/fractal-images/l-system-fern-4.png"
          />
          <FractalLink
            href="/l-system/board"
            title="Board"
            imageSrc="/assets/fractal-images/l-system-board.png"
          />
          <FractalLink
            href="/l-system/sierpinski-triangle"
            title="Sierpinski Triangle"
            imageSrc="/assets/fractal-images/l-system-sierpinski-triangle.png"
          />
          <FractalLink
            href="/fractal-canopy"
            title="Fractal Canopy"
            imageSrc="/assets/fractal-images/fractal-canopy.png"
          />
          <FractalLink
            href="/l-system/quadratic-snowflake"
            title="Quadratic Snowflake"
            imageSrc="/assets/fractal-images/l-system-quadratic-snowflake.png"
          />
          <FractalLink
            href="/l-system/koch-snowflake"
            title="Koch Snowflake"
            imageSrc="/assets/fractal-images/l-system-koch-snowflake.png"
          />
          <FractalLink
            href="/l-system/hilbert-curve"
            title="Hilbert Curve"
            imageSrc="/assets/fractal-images/l-system-hilbert-curve.png"
          />
          <FractalLink
            href="/l-system/sierpinski-curve"
            title="Sierpinski Curve"
            imageSrc="/assets/fractal-images/l-system-sierpinski-curve.png"
          />
          <FractalLink
            href="/l-system/crystal"
            title="Crystal"
            imageSrc="/assets/fractal-images/l-system-crystal.png"
          />
        </div>
      </main>
      <footer className={styles.footer}>
        <p>
          Made with <span className={styles.heart}>♥</span> by{" "}
          <a href="https://trebeljahr.com">Rico Trebeljahr</a>
        </p>
      </footer>
    </div>
  );
};

export default Home;
