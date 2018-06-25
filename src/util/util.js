
const ifPresent = (f) => (x) => (x != null) ? f(x) : null;

const compose = (...fs) => (x) => {
  let result = x;
  for (const f of fs) result = f(result);
  return result;
};

module.exports = { ifPresent, compose };

