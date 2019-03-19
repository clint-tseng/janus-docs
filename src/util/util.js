const identity = (x) => x;

const exists = (x) => (x != null);
const nonblank = (x) => (x != null) && (x !== '');
const blank = (x) => (x == null) || (x === '');

const not = (x) => !x;
const equals = (x, y) => x === y;
const give = (x) => () => x;

module.exports = { identity, exists, nonblank, blank, not, equals, give };

