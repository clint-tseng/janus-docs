module.exports = (global && global.$) ? global.$ : (window && window.$) ? window.$ : require('jquery');

