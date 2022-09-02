customElements.define(
  "my-navbar",
  class extends HTMLElement {
    constructor() {
      super();

      document.getElementsByTagName("html")[0].style.overflowX = "hidden";

      const shadow = this.attachShadow({ mode: "open" });

      // Create text node and add word count to it
      const navbar = document.createElement("nav");
      navbar.innerHTML = `
      <a href="/sierpinski-carpet/">Sierpinski Carpet</a>
      <a href="/fractal-tree/">Fractal Tree</a>
      <a href="/barnsley-fern/">Barnsley Fern</a>
      `;

      shadow.appendChild(navbar);
    }
  }
);
