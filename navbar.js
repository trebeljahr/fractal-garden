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

      function createLink(href, parent = document.body) {
        const linkElem = document.createElement("a");
        linkElem.href = href;

        linkElem.style.textDecoration = "none";
        linkElem.style.color = "#f5f1d1";

        parent.appendChild(linkElem);
        return linkElem;
      }

      const fractalLinks = [
        "/mandelbrot",
        "/barnsley-fern",
        "/sierpinski-carpet",
        "/l-system/index.html?fractal=lévy-curve",
        "/l-system/index.html?fractal=fern-1",
        // "/l-system/index.html?fractal=fern-2",
        "/l-system/index.html?fractal=fern-3",
        // "/l-system/index.html?fractal=fern-4",
        "/l-system/index.html?fractal=fern-5",
        // "/l-system/index.html?fractal=fern-6",
        "/l-system/index.html?fractal=fern-7",
        "/l-system/index.html?fractal=hilbert-kurve",
        "/l-system/index.html?fractal=koch-snowflake",
        "/l-system/index.html?fractal=quadratic-snowflake",
        "/l-system/index.html?fractal=board",
        "/l-system/index.html?fractal=sierpinski-triangle",
        "/l-system/index.html?fractal=crystal",
        "/fractal-tree",
      ];

      console.log(window.location.pathname);
      console.log(window.location);

      function createNavigation() {
        const navElem = document.createElement("nav");
        navElem.style.position = "absolute";

        navElem.style.bottom = "20px";
        navElem.style.right = "20px";
        navElem.style.transform = "scale(1.5)";

        createIcon(createLink("/barnsley-fern", navElem), "chevron_left");
        createIcon(createLink("/", navElem), "home");
        createIcon(createLink("/mandelbrot", navElem), "chevron_right");
        document.body.appendChild(navElem);
      }

      createNavigation("/");
    }
  }
);
