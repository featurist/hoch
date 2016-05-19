var removeColorEscapes = require('../removeColorEscapes');
var util = require('util');

module.exports = function(run, send) {
  var oldLog = console.log;
  console.log = function() {
    oldLog.apply(console, arguments);
    var args = removeColorEscapes(Array.prototype.slice.apply(arguments)).map(util.inspect);
    args.unshift('log');
    send.apply(undefined, args);
  };
  run();
  console.log = oldLog;
}
