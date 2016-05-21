var debug = require('debug')('hoch');
var respond = require('../respond');
var querystring = require('querystring');
var socket = window.io('/runner', {path: '/.hoch/socket.io', transports: ['websocket', 'polling']});

function start() {
  debug('starting');
  var setFinished;
  var startTime;

  window.addEventListener('message', function (event) {
    if (event.data.hoch == 'start run') {
      debug('starting run');
    } else if (event.data.hoch == 'finish run') {
      debug('finished run', (Date.now() - startTime) + 'ms');
      setFinished();
    } else {
      socket.emit('data', event.data);
    }
  });

  respond(socket, 'run', function (msg) {
    debug('starting');

    startTime = Date.now();
    var finished = new Promise(function (resolve) {
      setFinished = resolve;
    });
    var iframe = startIframe(msg);

    finished.then(function () {
      iframe.parentNode.removeChild(iframe);
    });

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
