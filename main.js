import { webcomponents } from './webcomponents';
import { registerObserver, unregisterObserver } from './stores/Global.js';

const start = Date.now();
function createScriptContent(scriptFragment, hostDataIDs) { // TODO: complex, hard to debug, should be simplified if possible
  let scriptElement = document.createElement("script");
  scriptElement.setAttribute("type", "module");
  scriptElement.textContent = `
const shadowDocument = (function getDOM(hostDataIDs = '${hostDataIDs.reverse().toString()}') {
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
  console.error("This element did not exist.")
}
`;
  return scriptElement;
}
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
        this.listenerRegistry = [];
        this.attachShadow({ mode: "open" })
        // console.log("created", this.outerHTML);
      }
      attributeChangedCallback(name, oldValue, newValue) {
        // console.log("updating", this.outerHTML)
        if (newValue != oldValue) {
          if (this.isConnected) this.disconnectedCallback();
          this.connectedCallback();
        }
      }
      connectedCallback() {
        // console.log("connected", this.outerHTML);
        this.hostDataIDs = []; // the hostDataIDs are used to find the shadowRoot for the WebComponent in the IIFE
        if (!this.dataset.id) { // reuse the old id
          this.dataset.id = 't-' + Date.now();// Math.random().toString(16).substring(2, 8);
        }
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
          // what about a predefined web-component for each fragment?
          const newRange = document.createRange().createContextualFragment(templateFragment.innerHTML);
          this.shadowRoot.replaceChildren(newRange);
        }
        if (styleFragment) {
          // what about a predefined web-component for each fragment?
          const clonedStyle = styleFragment.cloneNode(true);
          this.shadowRoot.appendChild(clonedStyle);
        }
        if (scriptFragment) {
          // what about a predefined web-component for each fragment?
          const scriptElement = createScriptContent(scriptFragment, this.hostDataIDs);
          this.shadowRoot.appendChild(scriptElement);
        }
      }
      disconnectedCallback() {
        // console.log("disconnected", this.outerHTML)
        // if (this.dataset.obs) { unregisterObserver(this); } // if (this.dataset.if) { unregisterObserver(this); }
        this.removeAllListeners();
        this.shadowRoot.replaceChildren(); // this is safe https://dom.spec.whatwg.org/#dom-parentnode-replacechildren
      }
      removeAllListeners() {
        this.listenerRegistry.forEach(({ target, type, handler }) => {
          target.removeEventListener(type, handler);
        });
        this.listenerRegistry = []; // Clear the registry
      }
    });
  });
}

Object.keys(webcomponents).forEach(function (prefix) {
  webcomponents[prefix].forEach(function ({ componentName, filePath }) {
    defineCustomElement(prefix, componentName, filePath);
  });
});

const end = Date.now();
console.log("TIME: ", end-start);