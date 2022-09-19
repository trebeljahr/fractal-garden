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
  "Hexagonal Gosper": {
    maxIterations: 8,
    axiom: "XF",
    draw: drawRules,
    replace: {
      X: "X+YF++YF-FX--FXFX-YF+",
      Y: "-FX+YFYF++YF+FX--FX-Y",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.height * 0.3;
      len = len || initialLength;
      pg.translate(pg.width / 2 - len * 2, pg.height / 2 - len * 2);

      angle = 60;
    },
    after: () => {
      len /= 2.3;
    },
  },
  Rings: {
    maxIterations: 7,
    axiom: "F+F+F+F",
    draw: drawRules,
    replace: {
      F: "FF+F+F+F+F+F-F",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.height * 0.3;
      pg.translate(pg.width / 2, pg.height / 2);

      angle = 90;
      len = len || initialLength;
    },
    after: () => {
      len /= 3;
    },
  },
  Tiles: {
    maxIterations: 8,
    axiom: "F+F+F+F",
    draw: drawRules,
    replace: {
      F: "FF+F-F+F+FF",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.height * 0.3;
      pg.translate(pg.width / 2, pg.height / 2);

      angle = 90;
      len = len || initialLength;
    },
    after: () => {
      len /= 2;
    },
  },
  "Fern 8": {
    maxIterations: 10,
    axiom: "X",
    draw: drawRules,
    replace: {
      X: "F[+X][-X]FX",
      F: "FF",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.height * 0.48;
      pg.translate(pg.width / 2, pg.height);

      angle = 25.7;
      len = len || initialLength;
    },
    after: () => {
      len /= 2;
    },
  },
  "Fern 7": {
    maxIterations: 10,
    axiom: "X",
    draw: drawRules,
    replace: {
      X: "F[+X]F[-X]+X",
      F: "FF",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.height * 0.5;
      pg.translate(pg.width / 2, pg.height);

      angle = 20;
      len = len || initialLength;
    },
    after: () => {
      len /= 2;
    },
  },
  "Fern 6": {
    maxIterations: 10,
    axiom: "F",
    draw: drawRules,
    replace: {
      F: "FF-[XY]+[XY]",
      X: "+FY",
      Y: "-FX",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.height * 0.5;
      pg.translate(pg.width / 2, pg.height);

      angle = 22.5;
      len = len || initialLength;
    },
    after: () => {
      len /= 2;
    },
  },
  "Fern 5": {
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
  "Fern 4": {
    maxIterations: 15,
    axiom: "VZFFF",
    draw: drawRules,
    replace: {
      V: "[+++W][---W]YV",
      W: "+X[-W]Z",
      X: "-W[+X]Z",
      Y: "YZ",
      Z: "[-FFF][+FFF]F",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.height * 0.38;
      pg.translate(pg.width / 2, pg.height);

      angle = 20;
      len = len || initialLength;
    },
    after: () => {
      len /= 1.29;
    },
  },
  "Fern 3": {
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
  "Fern 2": {
    maxIterations: 7,
    axiom: "F",
    draw: drawRules,
    replace: {
      F: "FF+[+F-F-F]-[-F+F+F]",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.height * 0.45;
      pg.translate(pg.width / 2, pg.height);

      angle = 22.5;
      len = len || initialLength;
    },
    after: () => {
      if (currentIteration >= 5) {
        len /= 2;
        return;
      }
      len /= 2.24;
    },
  },
  "Fern 1": {
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
  Triangle: {
    maxIterations: 12,
    axiom: "F+F+F",
    draw: drawRules,
    replace: {
      F: "F-F+F",
    },
    setup: () => {
      commonSetup();
      let initialLength = pg.width / 5;
      pg.translate(pg.width / 2, pg.height / 2);

      angle = 120;
      len = len || initialLength;
    },
    after: () => {
      len /= (1 + Math.sqrt(5)) / 2;
    },
  },
  "Sierpinski Square": {
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
    maxIterations: 8,
    axiom: "F+F+F+F",
    draw: drawRules,
    replace: {
      F: "FF+F++F+F",
    },
    setup: () => {
      commonSetup();
      let initialLength = Math.min(pg.width, pg.height) * 0.9;
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
  "Koch Island": {
    maxIterations: 7,
    axiom: "F+F+F+F",
    draw: drawRules,
    replace: {
      F: "F+F-F-FFF+F+F-F",
    },
    setup: () => {
      commonSetup();
      pg.translate(
        pg.width / 2 - pg.width / 4 / 2,
        pg.height / 2 + pg.width / 4 / 2
      );

      angle = 90;
      len = len || pg.width / 4;
    },
    after: () => {
      len = len / 4.5;
    },
  },
  Board: {
    color: "#403acc",
    maxIterations: 7,
    axiom: "F+F+F+F",
    draw: drawRules,
    replace: {
      F: "FF+F+F+F+FF",
    },
    setup: () => {
      commonSetup();

      let initialLength = Math.min(pg.width, pg.height) * 0.9;
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
    maxIterations: 8,
    axiom: "F++F++F",
    draw: drawRules,
    replace: {
      F: "F-F++F-F",
    },
    setup: () => {
      commonSetup();
      pg.translate(
        pg.width / 2 - pg.width / 3 / 3,
        pg.height / 2 + pg.width / 3 / 2
      );

      angle = 60;
      len = len || pg.width / 3;
    },
    after: () => {
      len = len / 3;
    },
  },
  Cross: {
    maxIterations: 8,
    axiom: "F+F+F+F",
    draw: drawRules,
    replace: {
      F: "F+F-F+F+F",
    },
    setup: () => {
      commonSetup();
      const initialLength = Math.min(pg.width, pg.height) * 0.25;
      len = len || initialLength;

      pg.translate(
        pg.width / 2 - (len * Math.pow(2, config.iterations) + 1) / 2,
        pg.height / 2 + (len * Math.pow(2, config.iterations) + 1) / 2
      );

      angle = 90;
    },
    after: () => {
      len = len / 2;
    },
  },
  Pentaflake: {
    maxIterations: 8,
    axiom: "F++F++F++F++F",
    draw: drawRules,
    replace: {
      F: "F++F++F|F-F++F",
    },
    setup: () => {
      commonSetup();
      len = len || pg.width / 3;
      pg.translate(pg.width / 2 - len * 2, pg.height / 2 - len * 2);

      angle = 36;
    },
    after: () => {
      len = len / 2.5;
    },
  },
  "Dragon Kurve": {
    maxIterations: 18,
    axiom: "F",
    replace: {
      F: "F+G",
      G: "F-G",
    },
    setup: () => {
      commonSetup();
      pg.translate(pg.width / 2, pg.height / 2);

      angle = 90;
      len = 5;
    },
    after: () => {},
    draw: drawRules,
  },
  "Koch Kurve 90°": {
    maxIterations: 8,
    axiom: "F",
    replace: {
      F: "F+F-F-F+F",
    },
    setup: () => {
      commonSetup();
      const initialLength = Math.min(pg.width, pg.height);
      len = len || initialLength;
      pg.translate(
        pg.width / 2 - initialLength / 2,
        pg.height / 2 - initialLength / 4
      );

      angle = 90;
      pg.rotate(angle);
    },
    after: () => {
      len /= 3;
    },
    draw: drawRules,
  },
  "Koch Kurve 60°": {
    maxIterations: 8,
    axiom: "F",
    replace: {
      F: "F+F-F-F+F",
    },
    setup: () => {
      commonSetup();
      angle = 60;
      const initialLength =
        Math.min(pg.width, pg.height) *
        (pg.width > pg.height
          ? map(pg.width - pg.height, 0, 2 * pg.height, 1, 2.4)
          : 0.9);
      len = len || initialLength;
      pg.translate(
        pg.width / 2 - initialLength / 2,
        pg.height / 2 - initialLength / 6
      );
      pg.rotate(90);
    },
    after: () => {
      len /= 4;
    },
    draw: drawRules,
  },
  "Hilbert Kurve": {
    maxIterations: 10,
    axiom: "W",
    replace: {
      V: "-WF+VFV+FW-",
      W: "+VF-WFW-FV+",
    },
    setup: () => {
      commonSetup();
      angle = 90;
      const initialLength = Math.min(pg.width, pg.height) * 0.9;
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
  "Sierpinski Arrowhead": {
    maxIterations: 11,
    axiom: "YF",
    replace: {
      X: "YF+XF+Y",
      Y: "XF-YF-X",
    },
    setup: () => {
      commonSetup();
      angle = 60;
      const initialLength = Math.min(pg.width, pg.height);
      len = len || initialLength;
      const totalHeight = (initialLength * Math.sqrt(3)) / 2;

      pg.translate(
        initialLength / 2,
        pg.height - (pg.height - totalHeight) / 2
      );
      pg.rotate(30);
      if (config.iterations % 2 === 0) pg.rotate(60);
    },
    after: () => {
      len = len / 2;
    },
    draw: drawRules,
  },
};
