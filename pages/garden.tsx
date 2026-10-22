import dynamic from "next/dynamic";

// Eliminate the explorer import from production bundles as well as returning
// no page from the static export. Direct production URLs resolve to the 404.
const Garden =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("../components/GardenExplorer"), { ssr: false })
    : () => null;

export function getStaticProps() {
  return process.env.NODE_ENV === "development" ? { props: {} } : { notFound: true };
}

export default Garden;
