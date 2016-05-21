var ioClient = require('socket.io-client');
var request = require('../request');

module.exports = function(module, filenames) {
  var io = ioClient('http://localhost:4000/client');
  var results = [];

  io.on('data', function (msg) {
    results.push(msg.arguments);
  });

  return request(io, 'run', {module: module, filenames: filenames}).then(function () {
    io.close();
    return results;
  });
};
