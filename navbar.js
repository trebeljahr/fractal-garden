customElements.define(
  "my-navbar",
  class extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: "open" });

      // Create text node and add word count to it
      const navbar = document.createElement("nav");
      navbar.innerHTML = `
      <a href="/sierpinski-carpet/index.html">Sierpinski Carpet</a>
      <a href="/fractal-tree/">Fractal Tree</a>
      <a href="/barnsley-fern/">Barnsley Fern</a>
      `;
      text.textContent = "hello world";

      shadow.appendChild(text);
    }
  }
);
