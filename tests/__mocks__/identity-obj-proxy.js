/**
 * Identity Object Proxy Mock for CSS Modules
 * Used in Jest tests for CSS imports
 */
module.exports = {
  process: (src) => {
    return {
      code: `module.exports = ${JSON.stringify(src)};`,
    };
  },
};
