import "../styles/_globals.css";
import "../styles/react-dat-gui.css";

import type { AppProps } from "next/app";
import Head from "next/head";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
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
