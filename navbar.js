customElements.define(
  "my-navbar",
  class extends HTMLElement {
    constructor() {
      super();

      document.getElementsByTagName("html")[0].style.overflowX = "hidden";
      document.head.innerHTML += `
        <link rel="stylesheet" href="/assets/styles/icon-styles.css">
        <link rel="stylesheet" href="/assets/styles/navbar-styles.css">
      `;

      function createIcon(parent, icon) {
        const iconElem = document.createElement("span");
        iconElem.classList.add("icon-" + icon);
        parent.appendChild(iconElem);
      }

      function navigate(to) {
        const fractalLinks = [
          "/mandelbrot",
          "/barnsley-fern",
          "/sierpinski-carpet",
          "/l-system/index.html?fractal=l%C3%A9vy-curve",
          "/l-system/index.html?fractal=fern-1",
          "/l-system/index.html?fractal=fern-2",
          "/l-system/index.html?fractal=fern-3",
          "/l-system/index.html?fractal=fern-4",
          "/l-system/index.html?fractal=board",
          "/l-system/index.html?fractal=sierpinski-triangle",
          "/fractal-tree",
          "/l-system/index.html?fractal=quadratic-snowflake",
          "/l-system/index.html?fractal=koch-snowflake",
          "/l-system/index.html?fractal=hilbert-curve",
          "/l-system/index.html?fractal=sierpinski-square",
          "/l-system/index.html?fractal=crystal",
        ];

        const i = fractalLinks.findIndex((link) => {
          return window.location.href.includes(link);
        });

        if (i === -1) {
          return;
        }
        if (to === "/prev") {
          const newIndex = i - 1 >= 0 ? i - 1 : fractalLinks.length - 1;
          return window.location.replace(fractalLinks[newIndex]);
        }
        if (to === "/next") {
          const newIndex = i + 1 <= fractalLinks.length - 1 ? i + 1 : 0;
          return window.location.replace(fractalLinks[newIndex]);
        }
        if (to === "/home") {
          return window.location.replace("/");
        }
      }

      function createLinkButtonTo(to, parent) {
        const btnElem = document.createElement("button");
        btnElem.classList.add("link-button");
        btnElem.addEventListener("click", () => navigate(to));
        parent.appendChild(btnElem);
        return btnElem;
      }

      console.log(window.location.pathname);
      console.log(window.location);

      function createNavigation() {
        const navElem = document.createElement("nav");
        navElem.classList.add("navigation-element");

        createIcon(createLinkButtonTo("/prev", navElem), "arrow-left");
        createIcon(createLinkButtonTo("/home", navElem), "home3");
        createIcon(createLinkButtonTo("/next", navElem), "arrow-right");
        document.body.appendChild(navElem);
      }

      createNavigation("/");
    }
  }
);
