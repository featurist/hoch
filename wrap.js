var convert = require('convert-source-map');
var combine = require('combine-source-map');

function sourceMapComment(filename, before, source) {
  return combine
    .create()
    .addFile(
      {
        source: source,
        sourceFile: filename
      },
      { line: before.split(/\n/).length - 1 })
    .comment();
}

function concat(before, source, after) {
  return before + convert.removeComments(source) + after;
}

module.exports = function(filename, before, source, after) {
  return concat(before, source, after) + '\n' + sourceMapComment(filename, before, source);
}
