module.exports = function(error) {
  var err = new Error(error.message);
  err.name = error.name;
  err.stack = error.stack;
  return err;
};
