var express = require('express');
var browserifyMiddleware = require('browserify-middleware');
var browserify = require('browserify');
var http = require('http');
var Files = require('./files');
var stitch = require('./stitch');
var wrap = require('./wrap');
var debug = require('debug')('hoch');
var Connection = require('./connection');
var Client = require('./client');
var fs = require('fs-promise');

var app = express();
var server = http.Server(app);
var io = require('socket.io')(server);
var clientIo = io.of('/client');
var runnerIo = io.of('/runner');

app.use('/', browserifyMiddleware(__dirname + '/browser'));

app.use('/style', express.static(__dirname + '/style'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/file', function (req, res) {
  var id = req.query.id;
  var version = req.query.version;
  var file = files.files[id];

  if (file) {
    if (file.version == version) {
      res.set('Content-Type', 'text/javascript');
      res.send(stitch(file));
    } else {
      res.status(404).send('file exists, but the wrong version was requested, expected ' + file.version);
    }
  } else {
    res.status(404).send('no such file ' + id);
  }
});

app.get('/plugin', function (req, res) {
  debug('loading plugin', req.query.module);

  var bundle = browserify({
    debug: true
  });

  bundle.require(req.query.module, {expose: 'plugin'});

  bundle.bundle((err, buf) => {
    if (err) {
      debug('error', err && err.stack || err);
      res.status(500).send();
    } else {
      var source = buf.toString();
      res.set('Content-Type', 'text/javascript');
      res.send(wrap(undefined, `${req.query.fn}(${JSON.stringify(req.query.module)}, `, source, `);`));
    }
  });
});

app.use('/mocha', express.static(__dirname + '/node_modules/mocha'));

app.listen = function() {
  server.listen.apply(server, arguments);
};

var firstConnection;
var somethingConnected = new Promise(resolve => {
  firstConnection = resolve;
});


var files = new Files('hoch.json', {
  refresh() {
    connections.forEach(refreshConnection);
  }
});

var connections = [];
var connectionId = 0;

var runner = {
  run(client, module, ids) {
    return somethingConnected.then(() => {
      return Promise.all(connections.map(c => c.run(client, module, ids)));
    }).then(() => {});
  }
}

function refreshConnection(connection) {
  return connection.refresh(files.version, files.files).then(result => {
    firstConnection();
    return result;
  }).catch(e => {
    debug('could not refresh', e && e.stack || e);
  });
}

runnerIo.on('connection', function (socket) {
  var connection = new Connection(connectionId++, socket);
  connections.push(connection);
  disconnect(socket, connection, connections);

  if (files.loaded) {
    refreshConnection(connection);
  }
});

var clients = [];
var clientId = 0;

function disconnect(socket, connection, connections) {
  socket.on('disconnect', function () {
    connection.disconnect();
    var index = connections.indexOf(connection);
    if (index >= 0) {
      connections.splice(index, 1);
    }
  });
}

clientIo.on('connection', function (socket) {
  var client = new Client(clientId++, socket, runner);
  clients.push(client);
  disconnect(socket, client, clients);
});

module.exports = app;
