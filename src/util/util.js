
const exists = (x) => (x != null);
const nonblank = (x) => (x != null) && (x !== '');
const blank = (x) => (x == null) || (x === '');

const not = (x) => !x;
const give = (x) => () => x;

module.exports = { exists, nonblank, blank, not, give };

