module.exports = function(err) {
  return {
    name: err.name,
    message: err.message,
    stack: err.stack
  };
};
