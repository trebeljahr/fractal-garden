import "../styles/_globals.css";
import "../styles/react-dat-gui.css";

import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import Script from "next/script";
import { useEffect } from "react";
import { PageSeo } from "../components/PageSeo";
import { consumeSupportedParam } from "../utils/donation";

const plausibleEnabled = process.env.NODE_ENV === "production";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Static pages with a query string are hydrated, then Next.js replaces the
  // URL to fill in router.query. Waiting for isReady keeps that replace from
  // writing ?supported=1 back after we remove it.
  useEffect(() => {
    if (router.isReady) consumeSupportedParam();
  }, [router.isReady]);

  return (
    <>
      <Head>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-5EP0KS9R28" />
        <Script id="gtaginit">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-5EP0KS9R28');
          `}
        </Script>
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1" />
      </Head>
      {plausibleEnabled ? (
        <>
          <Script
            defer
            data-domain="fractal.garden"
            src="https://plausible.trebeljahr.com/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js"
          />
          <Script id="plausible-init">
            {`
              window.plausible = window.plausible || function() {
                (window.plausible.q = window.plausible.q || []).push(arguments);
              };
            `}
          </Script>
        </>
      ) : null}
      <Component {...pageProps} />
      <PageSeo />
    </>
  );
}

export default MyApp;
