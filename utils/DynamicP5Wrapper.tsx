import dynamic from "next/dynamic";

export const DynamicReactP5Wrapper = dynamic(
  () => import("react-p5-wrapper").then((mod) => mod.ReactP5Wrapper),
  {
    ssr: false,
  }
);
