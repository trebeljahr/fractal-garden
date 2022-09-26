import "../styles/_globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { SideDrawer } from "../components/SideDrawer";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/assets/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/assets/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/assets/favicon/favicon-16x16.png"
        />
        <link rel="manifest" href="/assets/favicon/site.webmanifest" />
      </Head>
      <SideDrawer
        description={`
This is a side drawer... 
# Hello world

## This works

> yes?

1. uh oh
1. superb
1. wonderful!
      `}
      />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
