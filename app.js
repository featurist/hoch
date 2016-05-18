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
var connections = require('./connections');
var bodyParser = require('body-parser');
var Nightmare = require('nightmare');

module.exports = function () {
  var app = express();
  var server = http.Server(app);
  var io = require('socket.io')(server);
  var clientIo = io.of('/client');
  var runnerIo = io.of('/runner');

  app.use(bodyParser.json());
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

  app.post('/shorturl', function (req, res) {
    var id = shorturls.create(req.body.url);
    res.send({
      url: `/u/${id}`
    });
  });

  app.get('/u/:id', function (req, res) {
    var id = req.params.id;
    var url = shorturls.find(id);

    if (url) {
      res.redirect(url);
    } else {
      res.status(404).send('no such short URL ' + id);
    }
  });

  app.use('/mocha', express.static(__dirname + '/node_modules/mocha'));

  app.listen = function(port, cb) {
    return server.listen(port, function (err) {
      if (err) {
        cb(err);
      } else {
        nightmare.goto(`http://localhost:${port}/`).then(() => {
          debug('started browser');
        }).catch(e => {
          debug('could not start browser', e);
        });
        cb();
      }
    });
  };

  var files = new Files('hoch.json', {
    refresh(changes) {
      app.emit('changes', changes);
      return Promise.all(runners.map(refreshConnection));
    }
  });

  var runner = {
    run(client, module, ids) {
      debug('run', module, ids);
      return runnerConnected.then(() => {
        return files.addFiles(ids).then(() => {
          return Promise.all(runners.map(c => c.run(client, module, ids)));
        });
      });
    }
  }

  var shorturls = {
    id: 1,
    urls: {},
    ids: {},

    create(url) {
      var id = this.ids[url];

      if (!id) {
        id = this.id++;
        this.urls[id] = url;
        this.ids[url] = id;
      }

      return id;
    },

    find(id) {
      return this.urls[Number(id)];
    }
  };

  function refreshConnection(connection) {
    return connection.refresh(files.version, files.files).catch(e => {
      debug('could not refresh', e && e.stack || e);
    });
  }

  var nightmare = Nightmare();
  var setRunnerConnected;
  var runnerConnected = new Promise(resolve => setRunnerConnected = resolve);

  var runners = connections(runnerIo, (socket, id) => {
    var connection = new Connection(id, socket);
    if (files.version) {
      refreshConnection(connection);
    }
    setRunnerConnected();
    return connection;
  });

  connections(clientIo, (socket, id) => {
    return new Client(id, socket, runner);
  });

  app.close = function () {
    server.close();
    files.close();
  };

  return app;
};
