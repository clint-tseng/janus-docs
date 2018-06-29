
const exists = (x) => (x != null);
const not = (f) => (...args) => !f(...args);
const always = (x) => () => x

module.exports = { exists, not, always };

