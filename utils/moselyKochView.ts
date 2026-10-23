import { encodeView } from "./explorerShare";

// The article image is captured from this camera in the live Explore renderer.
export const MOSELY_KOCH_VIEW = {
  config: {
    variant: "lighter",
    navigation: "explore",
    iterations: 3,
    animateIterations: false,
    autoRotate: false,
    background: "#252424",
    fillColor: "#8fb0ff",
    strokeColor: "#dce9ff",
    showFaces: true,
    showWireframe: true,
    lineWidth: 0.7,
  },
  voxelCamera: {
    kind: "voxel-flight",
    position: ["0", "0", "0"],
    bits: 160,
    level: 0,
    // Fixed values for -pi/4 and -asin(1/sqrt(3)) keep the URL identical
    // across server and browser math implementations.
    yaw: -0.7853981633974483,
    pitch: -0.6154797086703874,
  },
};

export const MOSELY_KOCH_LINK = `/mosely-snowflake${encodeView("/mosely-snowflake", MOSELY_KOCH_VIEW)}`;
