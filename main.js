import { webcomponents } from './webcomponents';
import { registerObserver, unregisterObserver } from './stores/Global.js';

// HTMLElement prototype helper functions
function defineHTMLElementHelpers() {
    HTMLElement.prototype.on = function (a, b, c) { return this.addEventListener(a, b, c); }
    HTMLElement.prototype.off = function (a, b) { return this.removeEventListener(a, b); }
    HTMLElement.prototype.$ = function (s) { return this.querySelector(s); }
    HTMLElement.prototype.$$ = function (s) { return this.querySelectorAll(s); }
    HTMLElement.prototype.refresh = function () { this.dataset.date = Date.now(); }
}

// Call the function to define the helpers
defineHTMLElementHelpers();

// Utility functions
function parseState(state) {
    return state ? JSON.parse(state.replace(/'/g, "\"")) : null;
}

function stringifyState(newState) {
    return JSON.stringify(newState);
}

function getDOM(hostDataIDs) {
    let shadowDOM = document;
    for (let hostDataID of hostDataIDs) {
        const host = shadowDOM.querySelector('[data-id="' + hostDataID + '"]');
        if (host) {
            shadowDOM = host.shadowRoot;
        } else {
            return null;
        }
    }
    return shadowDOM;
}

// Define custom properties on HTMLElement prototype
Object.defineProperty(HTMLElement.prototype, 'state', {
    get: function () { return parseState(this.dataset.state); },
    set: function (newState) { this.dataset.state = stringifyState(newState); }
});

Object.defineProperty(HTMLElement.prototype, 'script', {
    get: function () { return this.getDOM().publicAPI; }
});

// Custom element class
class CustomElement extends HTMLElement {
    static observedAttributes = ["data-date", "data-state"];

    constructor(templateFragment, styleFragment, scriptFragment) {
        super();
        this.attachShadow({ mode: "open" });
        this.isAttached = false;
        this.templateFragment = templateFragment;
        this.styleFragment = styleFragment;
        this.scriptFragment = scriptFragment;
    }

    attributeChangedCallback() {
        if (this.isAttached) {
            this.disconnectedCallback();
            this.connectedCallback();
        }
    }

    async connectedCallback() {
        this.hostDataIDs = [];
        this.dataset.id = Math.random().toString(16).substring(2, 8);
        let hostElement = this;
        while (hostElement && hostElement.dataset.id) {
            this.hostDataIDs.push(hostElement.dataset.id);
            hostElement = hostElement.getRootNode().host;
        }
        if (this.dataset.obs) {
            await registerObserver(this);
        }
        this.render();
    }

    disconnectedCallback() {
        if (this.dataset.obs) {
            unregisterObserver(this);
        }
        while (this.shadowRoot.firstChild) {
            this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        }
    }

    async render() {
        if (this.templateFragment) {
            this.shadowRoot.appendChild(document.createRange().createContextualFragment(this.templateFragment.innerHTML));
        }
        if (this.styleFragment) {
            const clonedStyle = this.styleFragment.cloneNode(true);
            this.shadowRoot.appendChild(clonedStyle);
        }
        const scriptContent = `
        (
        async function(context = '${this.hostDataIDs.reverse().toString()}'.split(',')) {
            const datasetID = context.at(-1);
            let shadowDocument = getDOM(context);

            // Define HTMLElement prototype helper functions
            const $ = (query) => shadowDocument.querySelector(query);
            const $$ = (query) => shadowDocument.querySelectorAll(query);
            function getState() { return shadowDocument.host.state; }
            function setState(newState) { shadowDocument.host.state = JSON.stringify(newState); }
            function refresh() { getDOM([context[0]]).host.refresh(); }
            
            ${this.scriptFragment ? this.scriptFragment.textContent : ''}
        }
        )();`;

        // Debug log the script content
        console.log("Generated script content:", scriptContent);

        const scriptFunction = new Function('getDOM', scriptContent);
        scriptFunction(getDOM);
        this.isAttached = true;
    }
}

// Register custom elements
Object.keys(webcomponents).forEach(function (prefix) {
    webcomponents[prefix].forEach(function ({ componentName, filePath }) {
        fetch(`${filePath}?raw`).then(file => file.text()).then(component => {
            const fragment = document.createRange().createContextualFragment(component);
            const scriptFragment = fragment.querySelectorAll("script")[1];
            const styleFragment = fragment.querySelector("style");
            const templateFragment = fragment.querySelector("template");
            customElements.define(`${prefix}-${componentName}`, class extends CustomElement {
                constructor() {
                    super(templateFragment, styleFragment, scriptFragment);
                }
            });
        });
    });
});