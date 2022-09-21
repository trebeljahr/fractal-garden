customElements.define(
  "my-navbar",
  class extends HTMLElement {
    constructor() {
      super();

      document.getElementsByTagName("html")[0].style.overflowX = "hidden";
      document.head.innerHTML += `
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <style>
          .material-symbols-outlined {
          font-variation-settings:
          'FILL' 0,
          'wght' 400,
          'GRAD' 0,
          'opsz' 48
        }
        </style>
      `;

      function createIcon(parent, icon) {
        const iconElem = document.createElement("span");
        iconElem.classList.add("material-symbols-outlined");
        iconElem.classList.add("homeLink");

        iconElem.innerText = icon;
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
        const linkElem = document.createElement("button");
        linkElem.style.border = "none";
        linkElem.style.padding = 0;
        linkElem.style.textDecoration = "none";
        linkElem.style.backgroundColor = "transparent";
        linkElem.style.cursor = "pointer";
        linkElem.style.color = "#f5f1d1";
        linkElem.addEventListener("click", () => navigate(to));
        parent.appendChild(linkElem);
        return linkElem;
      }

      console.log(window.location.pathname);
      console.log(window.location);

      function createNavigation() {
        const navElem = document.createElement("nav");
        navElem.style.position = "absolute";

        navElem.style.bottom = "20px";
        navElem.style.right = "20px";
        navElem.style.transform = "scale(1.5)";

        createIcon(createLinkButtonTo("/prev", navElem), "chevron_left");
        createIcon(createLinkButtonTo("/home", navElem), "home");
        createIcon(createLinkButtonTo("/next", navElem), "chevron_right");
        document.body.appendChild(navElem);
      }

      createNavigation("/");
    }
  }
);
