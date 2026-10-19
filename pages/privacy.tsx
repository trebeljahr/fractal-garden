import type { NextPage } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "../components/Footer";
import styles from "../styles/Imprint.module.css";

// Update this date, and the host list below, whenever the site starts or stops
// contacting a server (a script, a font, an image, an embed).
const UPDATED_ON = "October 19, 2026";

const Host = ({ children }: { children: ReactNode }) => (
  <code className={styles.host}>{children}</code>
);

const Privacy: NextPage = () => {
  return (
    <>
      <main className={styles.container}>
        <p className={styles.backLink}>
          <Link legacyBehavior href="/" passHref>
            <a href="/" className={styles.link}>
              &larr; Back to Fractal Garden
            </a>
          </Link>
        </p>
        <h1 className={styles.heading}>Privacy Policy</h1>
        <p className={styles.intro}>Last updated: {UPDATED_ON}</p>

        <p className={styles.paragraph}>
          This page lists every server your browser contacts when you open fractal.garden, and what
          each one receives. The site has no accounts, no forms and no newsletter. It sets no
          cookies.
        </p>

        <h2 className={styles.subheading}>Controller</h2>
        <p className={styles.paragraph}>
          The controller under the EU General Data Protection Regulation (GDPR) is the service
          provider named in the{" "}
          <Link legacyBehavior href="/imprint" passHref>
            <a href="/imprint" className={styles.link}>
              imprint
            </a>
          </Link>
          : Rico Trebeljahr, c/o Block Services, Stuttgarter Str. 106, 70736 Fellbach, Germany.
          Email for privacy questions:{" "}
          <a href="mailto:imprint+fractal.garden@trebeljahr.com" className={styles.link}>
            imprint+fractal.garden@trebeljahr.com
          </a>
          .
        </p>

        <h2 className={styles.subheading}>Servers your browser contacts</h2>
        <ul className={styles.list}>
          <li>
            <Host>fractal.garden</Host>: the site itself, served by Cloudflare. Pages, scripts,
            images and fonts all come from here.
          </li>
          <li>
            <Host>static.cloudflareinsights.com</Host>: the script of Cloudflare Web Analytics.
            Visitors in the EU, the EEA, the United Kingdom and Switzerland do not get it.
          </li>
          <li>
            <Host>plausible.trebeljahr.com</Host>: my own Plausible Analytics server.
          </li>
        </ul>
        <p className={styles.paragraph}>
          No other server receives a request from your browser. A link to another site, such as
          GitHub, my blog or the donation page on ricos.site, contacts that site only when you click
          it.
        </p>

        <h2 className={styles.subheading}>Hosting by Cloudflare</h2>
        <p className={styles.paragraph}>
          The site is a set of static files. Cloudflare, Inc., 101 Townsend St, San Francisco, CA
          94107, USA, serves them from its Worker <Host>fractal-garden</Host>. No code of mine runs
          when you load a page.
        </p>
        <p className={styles.paragraph}>
          Cloudflare receives your IP address, the address of the page, the user agent and the
          referrer of each request. It uses them to deliver the site and to protect it against
          abuse. I do not export or keep logs of these requests.
        </p>
        <p className={styles.paragraph}>
          The fonts (Merriweather, Montserrat and the KaTeX math fonts) are copies on
          fractal.garden. Your browser contacts no font service and no script host other than the
          ones listed above.
        </p>
        <p className={styles.paragraph}>
          Legal basis: Art. 6 (1) (f) GDPR (legitimate interest in delivering the site securely).
        </p>

        <h2 className={styles.subheading}>Cloudflare Web Analytics</h2>
        <p className={styles.paragraph}>
          Cloudflare adds the script of{" "}
          <a
            href="https://developers.cloudflare.com/web-analytics/"
            className={styles.link}
            rel="noreferrer"
          >
            Cloudflare Web Analytics
          </a>{" "}
          to each page. Your browser loads it from <Host>static.cloudflareinsights.com</Host>, and
          the script sends its report to <Host>fractal.garden/cdn-cgi/rum</Host>.
        </p>
        <p className={styles.paragraph}>
          The report holds the page URL, the referrer and how long the page took to load. The
          timings include Largest Contentful Paint, Interaction to Next Paint and Cumulative Layout
          Shift. Cloudflare shows me totals by page, country, browser and device type.
        </p>
        <p className={styles.paragraph}>
          The script sets no cookies and stores nothing on your device. It gives each page view a
          random ID and keeps no ID from one page view to the next. Cloudflare receives your IP
          address with the report, discards it at the nearest data center and does not store it.
        </p>
        <p className={styles.paragraph}>
          Cloudflare does not add the script for visitors who connect through a Cloudflare data
          center in the EU, the EEA, the United Kingdom or Switzerland. For all other visitors the
          legal basis is Art. 6 (1) (f) GDPR (legitimate interest in knowing how fast the pages
          load). You can object at any time, or block <Host>static.cloudflareinsights.com</Host>{" "}
          with a content blocker.
        </p>

        <h2 className={styles.subheading}>Plausible Analytics</h2>
        <p className={styles.paragraph}>
          I count visits with{" "}
          <a href="https://plausible.io/data-policy" className={styles.link} rel="noreferrer">
            Plausible Analytics
          </a>
          . It runs on my own server at <Host>plausible.trebeljahr.com</Host>, rented from Hetzner
          Online GmbH in Nuremberg, Germany. Requests to it pass through Cloudflare as described
          under Hosting.
        </p>
        <p className={styles.paragraph}>
          Your browser loads the Plausible script from <Host>plausible.trebeljahr.com</Host> and
          sends its events there. That server receives your IP address and user agent. I do not
          route these requests through fractal.garden, so a content blocker can stop them. The site
          works the same without them.
        </p>
        <p className={styles.paragraph}>
          Plausible sets no cookies and stores nothing on your device. It combines your IP address
          and user agent with a salt that changes every day, and stores only the resulting hash. It
          deletes the salt after 24 hours, so nobody can trace the hash back to you. It never stores
          the IP address.
        </p>
        <p className={styles.paragraph}>
          Plausible records the page address, the referrer, the browser, the operating system, the
          device type and the country. It also records clicks on links to other sites and on file
          downloads. It measures how far you scroll and how long the page has your attention. The
          script loads only on fractal.garden, not on local or test copies of the site.
        </p>
        <p className={styles.paragraph}>
          The page address includes the part after the <code className={styles.host}>#</code>. The
          L-system explorer keeps your rules there, so Plausible receives the rules you type into
          it. They are the only content you create that reaches a server.
        </p>
        <p className={styles.paragraph}>
          Legal basis: Art. 6 (1) (f) GDPR (legitimate interest in knowing which pages people read).
          No information is stored on or read from your device for this, so § 25 TDDDG requires no
          consent. You can object at any time.
        </p>

        <h2 className={styles.subheading}>Data in your browser</h2>
        <p className={styles.paragraph}>
          The site writes two things to your browser's local storage. Neither one leaves your
          device, and you can delete both by clearing the site data in your browser.
        </p>
        <ul className={styles.list}>
          <li>
            <Host>fractal-garden:iteration-budget:v2:…</Host>: how long your device took to draw
            each level of a fractal. The next visit uses it to pick a level that draws quickly.
          </li>
          <li>
            <Host>donation-supported-at</Host>: the time you came back from the donation page on
            ricos.site. The site writes it only when the address has{" "}
            <code className={styles.host}>?supported=1</code>.
          </li>
        </ul>
        <p className={styles.paragraph}>
          Legal basis: § 25 (2) No. 2 TDDDG (the first entry is needed to show the fractal you asked
          for at a speed your device can keep up with). The second entry records an action of yours,
          and nothing reads it yet.
        </p>

        <h2 className={styles.subheading}>Transfers outside the EU</h2>
        <p className={styles.paragraph}>
          Cloudflare, Inc. is established in the United States. It handles each request in a data
          center of its network, normally the one nearest to you. Access by U.S. authorities under
          U.S. law cannot be fully excluded. My Plausible server is in Germany.
        </p>

        <h2 className={styles.subheading}>Storage period</h2>
        <ul className={styles.list}>
          <li>
            Plausible keeps its events with no time limit. Each event carries only the daily hash,
            which nobody can link to you once the salt is deleted after 24 hours.
          </li>
          <li>
            Cloudflare Web Analytics keeps totals by page, country, browser and device type.
            Cloudflare does not store the IP address.
          </li>
          <li>The two entries in your local storage stay there until you delete them.</li>
        </ul>

        <h2 className={styles.subheading}>Your rights</h2>
        <p className={styles.paragraph}>Under the GDPR you have the right to:</p>
        <ul className={styles.list}>
          <li>access the personal data held about you (Art. 15);</li>
          <li>have inaccurate data corrected (Art. 16);</li>
          <li>
            have your data deleted (Art. 17), unless a legal obligation requires me to keep it;
          </li>
          <li>restrict processing (Art. 18);</li>
          <li>receive your data in a portable format (Art. 20);</li>
          <li>
            object to processing based on legitimate interest (Art. 21), which includes both kinds
            of analytics above.
          </li>
        </ul>
        <p className={styles.paragraph}>
          To use any of these rights, email{" "}
          <a href="mailto:imprint+fractal.garden@trebeljahr.com" className={styles.link}>
            imprint+fractal.garden@trebeljahr.com
          </a>
          . You can also complain to a supervisory authority (Art. 77 GDPR). The authority
          responsible for me is the Landesbeauftragte für den Datenschutz und die
          Informationsfreiheit Baden-Württemberg.
        </p>
        <p className={styles.paragraph}>
          The site makes no automated decisions about you and builds no profile of you (Art. 22
          GDPR).
        </p>

        <h2 className={styles.subheading}>Changes</h2>
        <p className={styles.paragraph}>
          I update this page when the site starts or stops using a server. The date at the top shows
          the last change.
        </p>
      </main>
      <Footer />
    </>
  );
};

export default Privacy;
