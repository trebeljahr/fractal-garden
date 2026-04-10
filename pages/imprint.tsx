import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { Footer } from "../components/Footer";
import styles from "../styles/Imprint.module.css";

const Imprint: NextPage = () => {
  return (
    <>
      <Head>
        <title>Imprint – Fractal Garden</title>
        <meta
          name="description"
          content="Imprint for fractal.garden, an exhibition of mathematical beauty by Rico Trebeljahr."
        />
      </Head>
      <main className={styles.container}>
        <p>
          <Link href="/">
            <a className={styles.link}>&larr; Back to Fractal Garden</a>
          </Link>
        </p>
        <h1 className={styles.heading}>Imprint</h1>

        <p className={styles.intro}>
          Information pursuant to § 5 DDG (German Digital Services Act) and
          § 18 (2) MStV (Interstate Media Treaty).
        </p>

        <h2 className={styles.subheading}>Service Provider</h2>
        <p className={styles.address}>
          Rico Trebeljahr
          <br />
          c/o Block Services
          <br />
          Stuttgarter Str. 106
          <br />
          70736 Fellbach
          <br />
          Germany
        </p>

        <h2 className={styles.subheading}>Contact</h2>
        <p className={styles.address}>
          Email:{" "}
          <a href="mailto:imprint+fractal.garden@trebeljahr.com" className={styles.link}>
            imprint+fractal.garden@trebeljahr.com
          </a>
        </p>

        <h2 className={styles.subheading}>
          Person Responsible for Content (§ 18 (2) MStV)
        </h2>
        <p className={styles.address}>
          Rico Trebeljahr
          <br />
          c/o Block Services
          <br />
          Stuttgarter Str. 106
          <br />
          70736 Fellbach
          <br />
          Germany
        </p>

        <h2 className={styles.subheading}>Liability for Content</h2>
        <p className={styles.paragraph}>
          As a service provider, I am responsible for my own content on
          these pages in accordance with § 7 (1) DDG and general laws.
          However, pursuant to §§ 8 to 10 DDG, I am not obligated as a
          service provider to monitor transmitted or stored third-party
          information or to investigate circumstances that indicate illegal
          activity.
        </p>
        <p className={styles.paragraph}>
          Obligations to remove or block the use of information under general
          laws remain unaffected. However, liability in this regard is only
          possible from the point in time at which a specific legal violation
          becomes known. Upon becoming aware of such violations, I will
          remove this content immediately.
        </p>

        <h2 className={styles.subheading}>Liability for Links</h2>
        <p className={styles.paragraph}>
          This site contains links to external websites of third parties over
          whose content I have no influence. Therefore, I cannot assume any
          liability for these third-party contents. The respective provider
          or operator of the pages is always responsible for the content of
          the linked pages.
        </p>

        <h2 className={styles.subheading}>Copyright</h2>
        <p className={styles.paragraph}>
          The content and works created by the site operator on these pages
          are subject to German copyright law. Duplication, processing,
          distribution, and any kind of use outside the limits of copyright
          require the written consent of the respective author or creator.
        </p>
      </main>
      <Footer />
    </>
  );
};

export default Imprint;
