
const exists = (x) => (x != null);
const nonblank = (x) => (x != null) && (x !== '');
const blank = (x) => (x == null) || (x === '');

const not = (f) => (...args) => !f(...args);
const always = (x) => () => x

module.exports = { exists, nonblank, blank, not, always };

