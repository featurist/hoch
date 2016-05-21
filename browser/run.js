var requires = require('./requires');
var querystring = require('querystring');
var debug = require('debug')('hoch');

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

var modules = {};

window._hochAddFile = function(filename, fn, deps) {
  filesLoadedSoFar.push(filename);
  modules[filename] = [fn, deps];

  if (areAllFilesLoaded()) {
    setFilesLoaded(requires.create(modules));
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

    requires.clear();

    return plugin(function () {
      filenames.forEach(id => _require(id));
    }, sendData || function () {}).then(function () {
      debug('run finished in ' + (Date.now() - startTime) + 'ms');
      post({hoch: 'finish run'});
    });
  });
}

start();
