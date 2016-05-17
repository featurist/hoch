"use strict";

var chokidar = require('chokidar');
var events = require('events');
var debug = require('debug')('hoch');
var Dependencies = require('./dependencies.js');
var diff = require('./diff');
var glob = require('multi-glob').glob;
var pathUtils = require('path');
var minimatch = require('minimatch');
var indexBy = require('lowscore/indexBy');
var promiseLimit = require('promise-limit');

class Watcher extends events.EventEmitter {
  constructor(options) {
    super();
    this.files = {};
    this.entryFiles = {};
    this.refreshLimit = promiseLimit(1);
    this.dependencies = new Dependencies(options);
  }

  start() {
    this.watcher = chokidar.watch([], {persistent: true});

    this.watcher.on('change', path => {
      var fullpath = pathUtils.resolve(path);
      debug('changed', fullpath);
      this.dependencies.changed(fullpath);
      this.refresh({emit: true});
    });
    this.watcher.on('unlink', path => {
      var fullpath = pathUtils.resolve(path);
      debug('removed', fullpath);
      this.dependencies.changed(fullpath);
      this.refresh({emit: true});
    });
  }

  addFiles(filenames) {
    debug('add files', filenames);
    filenames.forEach(f => this.entryFiles[f] = true);
    this.watcher.add(filenames);
    return this.refresh();
  }

  refresh(options) {
    debug('refresh');
    var emit = typeof options === 'object' && options.hasOwnProperty('emit')? options.emit: undefined;

    return this.refreshLimit(() => {
      var files = Object.keys(this.entryFiles);

      return this.dependencies.deps(files).then(newList => {
        var newFiles = indexBy(newList, 'id');
        var diffs = diff(this.files, newFiles);
        this.files = newFiles;

        var toAdd = diffs.added.map(i => i.id)
        this.watcher.add(toAdd);
        var toRemoveExceptEntryFiles = diffs.removed.map(i => i.id).filter(p => !this.entryFiles[p])
        this.watcher.unwatch(toRemoveExceptEntryFiles);

        var change = {
          added: diffs.added,
          removed: diffs.removed,
          modified: files,
          files: this.files
        };

        if (emit) {
          this.emit('change', change);
        }

        return change;
      }).catch(error => {
        debug('error', error && error.stack || error);
        this.emit('error', error);
      });
    });
  }

  close() {
    this.watcher.close();
  }
}

module.exports = Watcher;
