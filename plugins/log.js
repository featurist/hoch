var removeColorEscapes = require('../removeColorEscapes');

module.exports = function(run, send) {
  var oldLog = console.log;
  console.log = function() {
    oldLog.apply(console, arguments);
    var args = removeColorEscapes(Array.prototype.slice.apply(arguments));
    args.unshift('log');
    send.apply(undefined, args);
  };
  run();
  console.log = oldLog;
}
