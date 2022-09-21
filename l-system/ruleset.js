function drawForward() {
  // console.log("drawing");
  pg.line(0, 0, 0, -len);
  pg.translate(0, -len);
}

function commonSetup() {
  pg.resetMatrix();
  pg.background(config.backgroundColor);
  pg.stroke(config.fractalColor);
}

const drawRules = {
  V: () => {},
  W: () => {},
  X: () => {},
  Y: () => {},
  Z: () => {},
  G: drawForward,
  F: drawForward,
  f: () => pg.translate(0, -len),
  "+": () => pg.rotate(angle * rotationDirection),
  "-": () => pg.rotate(angle * -rotationDirection),
  "|": () => pg.rotate(180),
  "[": () => pg.push(),
  "]": () => pg.pop(),
  "#": () => pg.strokeWeight((weight += weightIncrement)),
  "!": () => pg.strokeWeight((weight -= weightIncrement)),
  ">": () => (len *= scale),
  "<": () => (len /= scale),
  "&": () => (rotationDirection = -rotationDirection),
  "(": () => (angle += angleIncrement),
  ")": () => (angle -= angleIncrement),
};

const ruleSet = {
  "Lévy Curve": {
    color: "#54bffc",
    maxIterations: 18,
    axiom: "F",
    draw: drawRules,
    replace: {
      F: "-F++F-",
    },
    setup: () => {
      commonSetup();
      let initialLength =
        Math.min(pg.width, pg.height) *
        (pg.width > pg.height * 1.3 ? 0.7 : 0.45);
      len = len || initialLength;

      pg.translate(
        pg.width / 2 - initialLength / 2,
        pg.height / 2 + initialLength / 2.6
      );
      pg.rotate(90);
      angle = 45;
    },
    after: () => {
      len /= 1.417;
    },
  },
  "Fern 4": {
    color: "#ffe10b",
    maxIterations: 10,
    axiom: "X",
    draw: drawRules,
    replace: {
      X: "F[+X]F[-X]+X",
      F: "FF",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.height * 0.4;
      pg.translate(pg.width / 2, pg.height);

      angle = 20;
      len = len || initialLength;
    },
    after: () => {
      len /= 2;
    },
  },
  "Fern 3": {
    color: "#91fc8e",
    maxIterations: 6,
    axiom: "F",
    draw: drawRules,
    replace: {
      F: "F[+FF][-FF]F[-F][+F]F",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.height * 0.9;
      pg.translate(pg.width / 2, pg.height);

      angle = 22.5;
      len = len || initialLength;
    },
    after: () => {
      len /= 3;
    },
  },
  "Fern 2": {
    color: "#3cf7d2",
    maxIterations: 10,
    axiom: "Y",
    draw: drawRules,
    replace: {
      X: "X[-FFF][+FFF]FX",
      Y: "YFX[+Y][-Y]",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.height * 0.6;
      pg.translate(pg.width / 2, pg.height);

      angle = 25.7;
      len = len || initialLength;
    },
    after: () => {
      len /= 2.05;
    },
  },
  "Fern 1": {
    color: "#adff00",
    maxIterations: 9,
    axiom: "X",
    draw: drawRules,
    replace: {
      X: "F+[[X]-X]-F[-FX]+X",
      F: "FF",
    },
    setup: () => {
      commonSetup();
      const initialLength = pg.height * 0.37;
      len = len || initialLength;

      pg.translate(pg.width / 2, pg.height);
      angle = -25;
    },
    after: () => {
      len = len / 2;
    },
  },
  "Sierpinski Square": {
    color: "#f7ad1c",
    maxIterations: 8,
    axiom: "F+XF+F+XF",
    draw: drawRules,
    replace: {
      X: "XF-F+F-XF+F+XF-F+F-X",
    },
    setup: () => {
      commonSetup();
      let initialLength = Math.min(pg.width, pg.height) * 0.25;
      pg.translate(pg.width / 2 - initialLength * 1.6, pg.height / 2);

      angle = 90;
      len = len || initialLength;
    },
    after: () => {
      len /= 2.05;
    },
  },
  Crystal: {
    color: "#18fce0",
    maxIterations: 8,
    axiom: "F+F+F+F",
    draw: drawRules,
    replace: {
      F: "FF+F++F+F",
    },
    setup: () => {
      commonSetup();
      let initialLength = Math.min(pg.width, pg.height) * 0.7;
      pg.translate(
        pg.width / 2 - initialLength / 2,
        pg.height / 2 + initialLength / 2
      );

      angle = 90;
      len = len || initialLength;
    },
    after: () => {
      len = len / 3;
    },
  },
  "Quadratic Snowflake": {
    color: "#80b8f9",
    maxIterations: 8,
    axiom: "FF+FF+FF+FF",
    draw: drawRules,
    replace: {
      F: "F+F-F-F+F",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.width / 4;
      pg.translate(pg.width / 2 - initialLength, pg.height / 2 + initialLength);

      angle = 90;
      len = len || initialLength;
    },
    after: () => {
      len = len / 3;
    },
  },
  Board: {
    color: "#339ffc",
    maxIterations: 7,
    axiom: "F+F+F+F",
    draw: drawRules,
    replace: {
      F: "FF+F+F+F+FF",
    },
    setup: () => {
      commonSetup();

      let initialLength = Math.min(pg.width, pg.height) * 0.7;
      len = len || initialLength;
      pg.translate(
        pg.width / 2 - initialLength / 2,
        pg.height / 2 + initialLength / 2
      );

      angle = 90;
    },
    after: () => {
      len = len / 3;
    },
  },
  "Koch Snowflake": {
    color: "#b1e5e8",
    maxIterations: 8,
    axiom: "F++F++F",
    draw: drawRules,
    replace: {
      F: "F-F++F-F",
    },
    setup: () => {
      commonSetup();
      const initialLength = width * 0.7;
      pg.translate(
        pg.width / 2 - initialLength / 3,
        pg.height / 2 + initialLength / 2
      );

      angle = 60;
      len = len || initialLength;
    },
    after: () => {
      len = len / 3;
    },
  },

  "Hilbert Curve": {
    color: "#fc79ff",
    maxIterations: 10,
    axiom: "W",
    replace: {
      V: "-WF+VFV+FW-",
      W: "+VF-WFW-FV+",
    },
    setup: () => {
      commonSetup();
      angle = 90;
      const initialLength = Math.min(pg.width, pg.height) * 0.7;
      len = len || initialLength;
      pg.translate(
        pg.width / 2 - initialLength / 2,
        pg.height / 2 + initialLength / 2
      );
    },
    after: () => {
      len /= 2;
    },
    draw: drawRules,
  },
  "Sierpinski Triangle": {
    color: "#fc366b",
    maxIterations: 11,
    axiom: "F-G-G",
    replace: {
      F: "F-G+F+G-F",
      G: "GG",
    },
    setup: () => {
      commonSetup();
      angle = 120;
      const initialLength = Math.min(pg.width, pg.height);
      len = len || initialLength;
      const totalHeight = (initialLength * Math.sqrt(3)) / 2;

      pg.translate(
        initialLength / 2,
        pg.height - (pg.height - totalHeight) / 2
      );
      pg.rotate(90);
    },
    after: () => {
      len = len / 2;
    },
    draw: drawRules,
  },
};
