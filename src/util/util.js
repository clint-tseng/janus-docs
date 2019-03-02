
const exists = (x) => (x != null);
const nonblank = (x) => (x != null) && (x !== '');
const blank = (x) => (x == null) || (x === '');

const not = (x) => !x;
const equals = (x, y) => x === y;
const give = (x) => () => x;

module.exports = { exists, nonblank, blank, not, equals, give };

