module.exports = function(fn, n) {
  var interval;

  return {
    start() {
      this.stop();
      interval = setInterval(fn, n);
    },

    stop() {
      if (interval) {
        clearInterval(interval);
      }
    }
  };
};
