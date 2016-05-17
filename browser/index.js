var diff = require('../diff');
var debug = require('debug')('hoch');
var respond = require('../respond');

var socket = window.io('/runner');

var modules = {};
var files = {};
var require;
var requireCache = {};
var version;
var plugins = {};

window._hochAddFile = function(id, fn) {
  var file = files[id];
  modules[id] = [fn, file.deps];
  file.resolve();
}

window._hochAddPlugin = function(module, pluginRequire) {
  plugins[module].run = pluginRequire('plugin');
  plugins[module].resolve();
};

respond(socket, 'refresh', function (msg) {
  debug('refresh', msg.version);
  version = msg.version;
  var diffs = diff(files, msg.files, 'version');

  diffs.removed.forEach(file => {
    removeFile(file);
    debug('remove', file.id, file.version);
  });
  diffs.added.forEach(file => {
    addFile(file);
    debug('add', file.id, file.version);
  });
  diffs.changed.forEach(file => {
    updateFile(file);
    debug('update', file.id, file.version);
  });

  return Promise.all(Object.keys(files).map(k => files[k].loaded)).then(() => {
    require = createRequire(modules);

    debug('version', version);
  });
});

function addScript(src) {
  var script = document.createElement('script');
  script.src = src;
  document.body.appendChild(script);
  return script;
}

function addFile(file) {
  file.script = addScript('/file?id=' + encodeURIComponent(file.id) + '&version=' + file.version);
  file.loaded = new Promise(function (resolve) {
    file.resolve = resolve;
  });
  files[file.id] = file;
}

function removeFile(f) {
  var file = files[f.id];

  if (file) {
    file.script.parentNode.removeChild(file.script);
  }

  delete modules[f.id];
  delete files[f.id];
}

function updateFile(file) {
  removeFile(file);
  addFile(file);
}

function send(name) {
  var msg = {
    name: name,
    arguments: Array.prototype.slice.call(arguments, 1)
  };
  socket.emit('data', msg);
}

function plugin(module) {
  var plugin = plugins[module];

  if (!plugin) {
    debug('loading plugin', module);
    plugin = plugins[module] = {};
    plugin.loaded = new Promise(function (resolve) {
      plugin.resolve = resolve;
    }).then(function () {
      debug('loaded plugin', module);
      return plugin.run;
    });
    addScript('/plugin?fn=_hochAddPlugin&module=' + encodeURIComponent(module));
  }

  return plugin.loaded;
}

function clearRequireCache() {
  Object.keys(requireCache).forEach(k => delete requireCache[k]);
}

respond(socket, 'run', function (msg) {
  debug('run', msg.ids);
  return plugin(msg.module).then(function (run) {
    clearRequireCache();

    return run(function () {
      msg.ids.forEach(id => require(id));
    }, send);
  });
});

function createRequire(modules) {
  requireCache = {};
  return outer(modules, requireCache, []);
}

function outer (modules, cache, entry) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == "function" && require;

    function newRequire(name, jumped){
        if(!cache[name]) {
            if(!modules[name]) {
                // if we cannot find the module within our internal map or
                // cache jump to the current global require ie. the last bundle
                // that was added to the page.
                var currentRequire = typeof require == "function" && require;
                if (!jumped && currentRequire) return currentRequire(name, true);

                // If there are other bundles on this page the require from the
                // previous one is saved to 'previousRequire'. Repeat this as
                // many times as there are bundles until the module is found or
                // we exhaust the require chain.
                if (previousRequire) return previousRequire(name, true);
                var err = new Error('Cannot find module \'' + name + '\'');
                err.code = 'MODULE_NOT_FOUND';
                throw err;
            }
            var m = cache[name] = {exports:{}};
            modules[name][0].call(m.exports, function(x){
                var id = modules[name][1][x];
                return newRequire(id ? id : x);
            },m,m.exports,outer,modules,cache,entry);
        }
        return cache[name].exports;
    }
    for(var i=0;i<entry.length;i++) newRequire(entry[i]);

    // Override the current require with this new one
    return newRequire;
}
