# web-components
HTML CSS JS WebComponents

## Installation
```git clone https://github.com/J4H20M3/web-components.git
   cd web-components
   npm install
   npm run gen
   npm run dev
```

## How-To
- create single HTML files for web-components under `./{WEBCOMPONENTS_DIR}/{prefix}/{prefix}-{suffix}.html`
- you have access to the `shadowDocument`, `state`
- set state by `shadowDocument.host.dataset.state = JSON.stringify({newState})`

## NO-GOs
- never addEventListener to shadowDocument