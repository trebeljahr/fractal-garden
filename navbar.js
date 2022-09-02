customElements.define(
  "my-navbar",
  class extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: "open" });

      // Create text node and add word count to it
      const text = document.createElement("span");
      text.textContent = "hello world";

      shadow.appendChild(text);
    }
  }
);
