var debug = require('debug')('hoch');
var respond = require('../respond');
var querystring = require('querystring');
var socket = window.io('/runner', {path: '/.hoch/socket.io', transports: ['websocket', 'polling']});
var deserializeError = require('../deserializeError');

function start() {
  debug('starting');
  var setFinished;
  var setError;
  var startTime;

  window.addEventListener('message', function (event) {
    if (event.data.hoch == 'start run') {
      debug('run starting');
    } else if (event.data.hoch == 'finish run') {
      debug('run finished', (Date.now() - startTime) + 'ms');
      setFinished();
    } else if (event.data.hoch == 'error') {
      debug('run error', event.data.error);
      setError(deserializeError(event.data.error));
    } else {
      socket.emit('data', event.data);
    }
  });

  respond(socket, 'run', function (msg) {
    startTime = Date.now();
    var finished = new Promise(function (resolve, reject) {
      setFinished = resolve;
      setError = reject;
    });
    var iframe = startIframe(msg);

    function removeIframe() {
      iframe.parentNode.removeChild(iframe);
    }

    finished.then(removeIframe, removeIframe);

    return finished;
  });
}

function startIframe(msg) {
  var iframe = document.createElement('iframe');
  iframe.src = '/.hoch/run?' + querystring.stringify({
    module: msg.module,
    filenames: msg.filenames
  });

  document.body.appendChild(iframe);
  return iframe;
}

start();
