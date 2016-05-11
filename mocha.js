var io = require('socket.io-client')('http://localhost:5000/client');
var path = require('path');
var request = require('./request');

var paths = process.argv.slice(2).map(p => path.resolve(p))
request(io, 'run', {module: './mochaPlugin', ids: paths}).then(function () {
  io.close();
});

io.on('data', function (msg) {
  console.log.apply(console, msg.args);
});
