var express = require('express');
var browserify = require('browserify-middleware');
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

app.use('/', browserify(__dirname + '/browser'));

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

function pluginFilename(plugin) {
  var moduleName = plugin.module[0] == '.' ? process.cwd() + '/' + plugin.module: plugin.module;
  var path = require.resolve(moduleName);
  return path;
}

app.get('/plugin', function (req, res) {
  debug('loading plugin', plugin.name);

  var path = pluginFilename(plugin);

  return fs.readFile(path, 'utf-8').then(content => {
    res.set('Content-Type', 'text/javascript');
    res.send(wrap(path, '_hochAddPlugin(function(module, exports) {\n', content, '\n})'));
  });
});

app.use('/mocha', express.static(__dirname + '/node_modules/mocha'));

app.listen = function() {
  server.listen.apply(server, arguments);
};

var files = new Files('hoch.json', {
  refresh(version, files) {
    connections.forEach(c => c.refresh(version, files));
  }
});

var plugin = {
  name: 'log',
  module: './log'
};

var connections = [];
var connectionId = 0;

var runner = {
  run(client, ids) {
    return Promise.all(connections.map(c => c.run(client, ids))).then(() => {});
  }
}

runnerIo.on('connection', function (socket) {
  var connection = new Connection(connectionId++, socket);
  connections.push(connection);

  if (files.loaded) {
    connection.refresh(files.version, files.files);
  }

  connection.plugin(plugin.name);

  disconnect(socket, connection, connections);
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
