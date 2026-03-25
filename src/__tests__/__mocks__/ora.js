module.exports = function ora(message) {
  return {
    start() {
      return this;
    },
    stop() {
      return this;
    },
    succeed(msg) {
      return this;
    },
    fail(msg) {
      return this;
    },
    warn(msg) {
      return this;
    },
    info(msg) {
      return this;
    },
    text: message,
  };
};

module.exports.default = module.exports;
