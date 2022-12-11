import "../styles/_globals.css";
import "../styles/react-dat-gui.css";

import type { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-5EP0KS9R28"
        />
        <Script id="gtaginit">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-5EP0KS9R28');
          `}
        </Script>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
