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

class Watcher extends events.EventEmitter {
  constructor(pattern, options) {
    super();
    this.pattern = (typeof pattern === 'string'
      ? [pattern]
      : pattern).map(p => pathUtils.resolve(p));
    this.files = [];
    this.watchedFiles = {};
    this.options = options;
  }

  start() {
    this.watcher = chokidar.watch(this.pattern, {persistent: true, ignoreInitial: true});

    this.watcher.on('add', path => {
      var fullpath = pathUtils.resolve(path);
      this.watchedFiles[fullpath] = true;
      this.refreshFiles(Object.keys(this.watchedFiles));
    });
    this.watcher.on('change', path => {
      var fullpath = pathUtils.resolve(path);
      this.dependencies.changed([fullpath]);
      this.refreshFiles(Object.keys(this.watchedFiles));
    });
    this.watcher.on('unlink', path => {
      var fullpath = pathUtils.resolve(path);
      this.dependencies.changed([fullpath]);
      delete this.watchedFiles[fullpath];
      this.refreshFiles(Object.keys(this.watchedFiles));
    });

    debug('watching', this.pattern);
    this.refresh();
  }

  isEntryFile(file) {
    return this.pattern.some(p => minimatch(file, p));
  }

  refreshFiles(files) {
    this.dependencies.deps(files).then(newList => {
      var diffs = diff(indexBy(this.files, 'id'), indexBy(newList, 'id'));
      this.files = newList;

      var toAdd = diffs.added.map(i => i.id).filter(p => !this.isEntryFile(p))
      this.watcher.add(toAdd);
      var toRemove = diffs.removed.map(i => i.id).filter(p => !this.isEntryFile(p))
      this.watcher.unwatch(toRemove);

      this.emit('change', {
        added: diffs.added,
        removed: diffs.removed,
        modified: files,
        files: this.files
      });
    }).catch(error => {
      debug('error', error && error.stack || error);
      this.emit('error', error);
    });
  }

  refresh() {
    this.dependencies = new Dependencies(this.options);
    glob(this.pattern, (error, results) => {
      if (error) {
        this.emit('error', error);
      } else {
        results.forEach(f => this.watchedFiles[f] = true);
        this.refreshFiles(results);
      }
    });
  }

  stop() {
    this.watcher.close();
  }
}

module.exports = Watcher;
