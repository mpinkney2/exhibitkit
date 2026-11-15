// pdfjs-dist optionally loads this package to polyfill DOMMatrix in Node.
// Text extraction does not draw pages, and the native build fails on Vercel.
module.exports = {};
