import { webcomponents } from './webcomponents';
import { registerObserver, unregisterObserver } from './stores/Global.js';

//TODO: setting up nodes with attributes (data-state, @-click) creates state and listeners
function defineCustomElement(prefix, componentName, filePath) {
  fetch(`${filePath}?raw`).then(file => file.text()).then(component => {
    const fragment = document.createRange().createContextualFragment(component);
    const scriptFragments = fragment.querySelectorAll("script");
    const scriptFragment = scriptFragments[1];
    const styleFragment = fragment.querySelector("style");
    const templateFragment = fragment.querySelector("template");
    customElements.define(`${prefix}-${componentName}`, class extends HTMLElement {
      static observedAttributes = ["data-date", "data-state"];
      constructor() { // this is available after construction
        super();
        this.scriptInitialized = false;
        this.attachShadow({ mode: "open"});
        // console.log("created", this.outerHTML);
      }
      attributeChangedCallback(name, oldValue, newValue) {
        // console.log("attributeChanged", this.outerHTML);
        this.disconnectedCallback();
        this.connectedCallback();
      }
      connectedCallback() {
        // console.log("connected", this.outerHTML);
        this.hostDataIDs = []; // the hostDataIDs are used to find the shadowRoot for the WebComponent in the IIFE
        this.dataset.id = Math.random().toString(16).substring(2, 8);

        let hostElement = this;
        while (hostElement && hostElement.dataset.id) {
          this.hostDataIDs.push(hostElement.dataset.id);
          hostElement = hostElement.getRootNode().host;
        }
        // if (this.dataset.obs) { await registerObserver(this); } // if (this.dataset.if) { const shouldRender = await registerConditional(this); }
        this.render();
      }
      render() {
        // console.log("rendering", this.outerHTML);
        if (templateFragment) {
          const newRange = document.createRange().createContextualFragment(templateFragment.innerHTML);
          this.shadowRoot.replaceChildren(newRange);
        }
        if (styleFragment) {
          const clonedStyle = styleFragment.cloneNode(true);
          this.shadowRoot.appendChild(clonedStyle);
        }
        if (scriptFragment) {
          const scriptElement = document.createElement("script");
          scriptElement.setAttribute("type", "module");
          scriptElement.textContent = `
const shadowDocument = (function getDOM(hostDataIDs = '${this.hostDataIDs.reverse().toString()}') {
  let shadowDocument = document;
  for (let hostDataID of hostDataIDs.split(',')) {
    const host = shadowDocument.querySelector('[data-id="' + hostDataID + '"]');
    if (host) {
      shadowDocument = host.shadowRoot;
    } else {
      return null;
    }
  }
  return shadowDocument;
})();
if (shadowDocument) {
  const state = shadowDocument.host.dataset.state ? JSON.parse(shadowDocument.host.dataset.state) : undefined;
  ${scriptFragment ? scriptFragment.textContent : ''}
} else {
  // console.error("This element did not exist.")
}
`;
          this.shadowRoot.appendChild(scriptElement);
        }
      }
      disconnectedCallback() {
        // console.log("disconnected", this.outerHTML)
        // if (this.dataset.obs) { unregisterObserver(this); } // if (this.dataset.if) { unregisterObserver(this); }
        this.shadowRoot.replaceChildren(); // this is safe https://dom.spec.whatwg.org/#dom-parentnode-replacechildren
      }
    });
  });
}

Object.keys(webcomponents).forEach(function (prefix) {
  webcomponents[prefix].forEach(function ({ componentName, filePath }) {
    defineCustomElement(prefix, componentName, filePath);
  });
});
