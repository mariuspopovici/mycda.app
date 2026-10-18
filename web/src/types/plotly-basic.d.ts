// plotly.js-basic-dist-min ships without types; it exposes the plotly.js API.
declare module 'plotly.js-basic-dist-min' {
  import * as Plotly from 'plotly.js'
  export = Plotly
}
