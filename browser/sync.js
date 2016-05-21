var diff = require('../diff');
var debug = require('debug')('hoch');
var values = require('lowscore/values');

var files = {};

module.exports = function(newFiles) {
  var diffs = diff(files, newFiles, 'version');

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
    return values(files);
  });
};

window._hochAddFile = function(id, fn, deps) {
  var file = files[id];
  file.deps = deps;
  file.fn = fn;
  file.id = id;
  file.resolve();
};

function addFile(file) {
  file.script = addScript('/.hoch/file?id=' + encodeURIComponent(file.id) + '&version=' + file.version);
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

  delete files[f.id];
}

function updateFile(file) {
  removeFile(file);
  addFile(file);
}

function addScript(src) {
  var script = document.createElement('script');
  script.src = src;
  document.body.appendChild(script);
  return script;
}
