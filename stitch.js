var wrap = require('./wrap');

module.exports = function(file) {
  return wrap(
    file.id,
    `_hochAddFile(${JSON.stringify(file.id)}, function(require, module, exports) {\n`,
    file.source,
    `\n}, ${JSON.stringify(file.deps)})`
  );
}
