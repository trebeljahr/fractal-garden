import type { NextPage } from "next";
import Link from "next/link";
import { Footer } from "../components/Footer";
import { AddMoreLink, FractalLink } from "../components/FractalLink";
import styles from "../styles/Home.module.css";
import { FRACTAL_TILES } from "../utils/fractalTiles";

const Home: NextPage = () => {
  return (
    <>
      <main className={styles.mainContent}>
        <h1 className={styles.heading}>Fractal Garden</h1>
        <h2 className={styles.subtitle}>An Exhibition Of Mathematical Beauty</h2>
        {process.env.NODE_ENV === "development" && (
          <Link href="/garden" className={styles.gardenLink}>
            Enter the experimental garden <span>Development only</span>
          </Link>
        )}
        <div className={styles.grid}>
          {Object.entries(FRACTAL_TILES).map(([href, tile], index) => (
            <FractalLink
              key={href}
              href={href}
              {...tile}
              prio={index < 3 || href === "/sierpinski-carpet"}
            />
          ))}
          <AddMoreLink />
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Home;
