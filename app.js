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
var findConfig = require('find-config');
var pathUtils = require('path');
var Headless = require('./headless');

function cacheHard(res) {
  var seconds = 31557600;
  res.set('Cache-Control', 'public, max-age=' + seconds);
  res.set('Expires', new Date(Date.now() + seconds * 1000).toGMTString());
}

module.exports = function () {
  var app = express();
  var server = http.Server(app);
  var io = require('socket.io')(server, {path: '/.hoch/socket.io'});
  var clientIo = io.of('/client');
  var runnerIo = io.of('/runner');

  var configPaths = findConfig.obj('hoch', {dir: undefined, module: true});
  var config = require(configPaths.path);
  debug('config', config);

  app.set('view engine', 'ejs');

  var hochApp = express();

  hochApp.use(bodyParser.json());
  hochApp.use('/', browserifyMiddleware(__dirname + '/browser'));

  hochApp.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
  });

  hochApp.get('/run', (req, res) => {
    var scriptFiles = Object.keys(files.files).map(f => files.files[f]);

    res.render(__dirname + '/views/run.ejs', {
      stylesheets: config.stylesheets || [],
      scripts: config.scripts || [],
      files: scriptFiles || [],
      plugin: req.query.module
    });
  });

  hochApp.get('/file', function (req, res) {
    var id = req.query.id;
    var version = req.query.version;
    var file = files.files[id];

    if (file) {
      if (file.version == version) {
        res.set('Content-Type', 'text/javascript');
        cacheHard(res);
        res.send(stitch(file));
      } else {
        res.status(404).send('file exists, but the wrong version was requested, expected ' + file.version);
      }
    } else {
      res.status(404).send('no such file ' + id);
    }
  });

  hochApp.get('/files', function (req, res) {
    res.send({
      files: files.files,
      version: files.version
    });
  });

  var plugins = {};

  function plugin(module) {
    var cached = plugins[module];

    if (cached) {
      return Promise.resolve(cached);
    } else {
      return new Promise((resolve, reject) => {
        var bundle = browserify({
          debug: true
        });

        bundle.require(module, {expose: 'plugin'});

        bundle.bundle((err, buf) => {
          if (err) {
            reject(err);
          } else {
            var src = buf.toString();
            plugins[module] = src;
            resolve(src);
          }
        });
      });
    }
  }

  hochApp.get('/plugin', function (req, res) {
    debug('loading plugin', req.query.module);

    plugin(req.query.module).then(source => {
      res.set('Content-Type', 'text/javascript');
      cacheHard(res);
      res.send(wrap(undefined, `${req.query.fn}(${JSON.stringify(req.query.module)}, `, source, `);`));
    }).catch(err => {
      debug('error', err && err.stack || err);
      res.status(500).send();
    })
  });

  hochApp.post('/shorturl', function (req, res) {
    var id = shorturls.create(req.body.url);
    res.send({
      url: `/.hoch/u/${id}`
    });
  });

  hochApp.get('/u/:id', function (req, res) {
    var id = req.params.id;
    var url = shorturls.find(id);

    if (url) {
      res.redirect(url);
    } else {
      res.status(404).send('no such short URL ' + id);
    }
  });

  app.listen = function(port, cb) {
    return server.listen(port, function (err) {
      if (err) {
        cb(err);
      } else {
        if (headless) {
          headless.start(`http://localhost:${port}/.hoch`);
        }

        if (cb) {
          cb();
        }
      }
    });
  };

  var files = new Files(config, {
    events: app,
    refresh(changes) {
      app.emit('changes', changes);
    }
  });

  var runner = {
    run(client, module, filenames) {
      debug('run', module, filenames);
      return runnerConnected.then(() => {
        return files.addFiles(filenames).then(() => {
          return Promise.all(runners.map(c => c.run(client, module, filenames)));
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

  var headless = config.headless !== false ? new Headless() : undefined;
  var setRunnerConnected;
  var runnerConnected = new Promise(resolve => setRunnerConnected = resolve);

  var runners = connections(runnerIo, (socket, id) => {
    var connection = new Connection(id, socket);
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

  app.use('/.hoch', hochApp);

  if (config.static) {
    Object.keys(config.static).forEach(path => {
      var dir = config.static[path];

      var fullDir = pathUtils.resolve(configPaths.dir, dir);
      debug('static', `${path} => ${fullDir}`);
      app.use(path, express.static(fullDir));
    });
  }

  return app;
};
