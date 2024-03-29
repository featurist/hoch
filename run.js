var urlUtils = require('url');
var socketIo = require('socket.io-client');
var path = require('path');
var request = require('./request');
var makeShortUrl = require('./makeShortUrl');
var colors = require('colors/safe');

module.exports = function (baseurl, module, args, ondata) {
  var io = socketIo(urlUtils.resolve(baseurl, '/client'), {path: '/.hoch/socket.io'});
  var filenames = args.map(p => path.resolve(p))
  var shortUrl = makeShortUrl(baseurl, module, filenames);

  if (ondata) {
    io.on('data', ondata);
  }

  return request(io, 'run', {module: module, filenames: filenames}).catch(function (e) {
    console.log(e && e.stack || e);
  }).then(function () {
    io.close();
    return shortUrl.then(function (url) {
      process.stderr.write('\n');
      process.stderr.write(`    url: ${colors.cyan(url)}\n`);
      process.stderr.write('\n');
    });
  });
};
