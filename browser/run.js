var createRequire = require('./createRequire');
var querystring = require('querystring');
var debug = require('debug')('hoch');
var serializeError = require('../serializeError');

var setPluginLoaded;
var pluginLoaded = new Promise(function (resolve) {
  setPluginLoaded = resolve;
});

var setFilesLoaded;
var filesLoaded = new Promise(function (resolve) {
  setFilesLoaded = resolve;
});

var filesLoadedSoFar = [];

function areAllFilesLoaded() {
  function normalise(files) {
    files.sort();
    return files.join(',');
  }

  return normalise(window._hochFiles) == normalise(filesLoadedSoFar);
}

var files = [];

window._hochAddFile = function(id, fn, deps) {
  filesLoadedSoFar.push(id);
  files.push({
    id: id,
    fn: fn,
    deps: deps
  });

  if (areAllFilesLoaded()) {
    setFilesLoaded(createRequire(files));
  }
}

window._hochAddPlugin = function(module, pluginRequire) {
  var plugin = pluginRequire('plugin');
  setPluginLoaded(plugin);
};

function post(msg) {
  if (window.self !== window.top) {
    window.parent.postMessage(msg, '*');
  }
}

function sendData(name) {
  var msg = {
    name: name,
    arguments: Array.prototype.slice.call(arguments, 1)
  };

  post(msg);
}

function run(plugin, filenames, _require) {
  function requireFilenames() {
    filenames.forEach(id => _require(id));
  }

  try {
    return Promise.resolve(plugin(requireFilenames, sendData));
  } catch(e) {
    return Promise.reject(e);
  }
}

function start() {
  Promise.all([
    filesLoaded,
    pluginLoaded
  ]).then(function (results) {
    var startTime = Date.now();
    var _require = results[0];
    var plugin = results[1];
    var search = window.location.search.substring(1)
    var params = querystring.parse(search);
    var filenames = params.filenames ? (params.filenames instanceof Array ? params.filenames : [params.filenames]) : undefined;

    debug('run', filenames);
    post({hoch: 'start run'});

    _require.clear();

    try {
      return run(plugin, filenames, _require).then(function () {
        debug('run finished in ' + (Date.now() - startTime) + 'ms');
        post({hoch: 'finish run'});
      }).catch(function (e) {
        post({hoch: 'error', error: serializeError(e)});
      });
    } catch (e) {
      post({hoch: 'error', error: serializeError(e)});
    }
  });
}

start();
