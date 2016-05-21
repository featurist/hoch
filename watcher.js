"use strict";

var fs = require('fs-promise');
var chokidar = require('chokidar');
var events = require('events');
var debug = require('debug')('hoch');
var Dependencies = require('./dependencies.js');
var diff = require('./diff');
var pathUtils = require('path');
var indexBy = require('lowscore/indexBy');
var promiseLimit = require('promise-limit');
var _ = require('underscore');

class Watcher extends events.EventEmitter {
  constructor(options) {
    super();
    this.files = {};
    this.entryFiles = {};
    this.refreshLimit = promiseLimit(1);
    this.dependencies = new Dependencies(options);

    this.delayedRefresh = _.throttle(function () {
      return this.refresh.apply(this, arguments);
    }, 100, {leading: false});
  }

  start() {
    this.watcher = chokidar.watch([], {persistent: true});

    this.watcher.on('change', path => {
      var fullpath = pathUtils.resolve(path);
      debug('changed', fullpath);
      this.dependencies.changed(fullpath);
      this.delayedRefresh(this.entryFiles, {emit: true});
    });
    this.watcher.on('unlink', path => {
      var fullpath = pathUtils.resolve(path);
      debug('removed', fullpath);
      delete this.entryFiles[fullpath];
      this.dependencies.changed(fullpath);
    });
  }

  ensureFilesExist(filenames) {
    function fileExists(f) {
      return fs.exists(f).then(exists => {
        return {
          filename: f,
          exists: exists
        };
      });
    }

    return Promise.all(filenames.map(fileExists)).then(exists => {
      var dontExist = exists.filter(f => !f.exists);

      if (dontExist.length) {
        throw new Error(`file ${dontExist[0].filename} doesn't exist`)
      }
    });
  }

  extantFiles(files) {
    function fileExists(f) {
      return fs.exists(f).then(exists => {
        return {
          filename: f,
          exists: exists
        };
      });
    }

    return Promise.all(files.map(fileExists)).then(exists => {
      return exists.filter(f => f.exists).map(f => f.filename);
    });
  }

  addFiles(filenames) {
    return this.ensureFilesExist(filenames).then(() => {
      debug('add files', filenames);
      var entryFiles = JSON.parse(JSON.stringify(this.entryFiles));
      filenames.forEach(f => entryFiles[f] = true);
      this.watcher.add(filenames);
      return this.refresh(entryFiles).then(() => {
        this.entryFiles = entryFiles;
      });
    });
  }

  refresh(entryFiles, options) {
    debug('refresh');
    var emit = typeof options === 'object' && options.hasOwnProperty('emit')? options.emit: undefined;
    var startTime = Date.now();

    return this.refreshLimit(() => {
      return this.extantFiles(Object.keys(entryFiles)).then(files => {
        return this.dependencies.deps(files).then(newList => {
          var newFiles = indexBy(newList, 'id');
          var diffs = diff(this.files, newFiles);
          this.files = newFiles;

          var toAdd = diffs.added.map(i => i.id)
          this.watcher.add(toAdd);
          var toRemove = diffs.removed.map(i => i.id)
          this.watcher.unwatch(toRemove);

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
        });
      }).then(() => {
        debug('compiled in ' + (Date.now() - startTime) + 'ms');
      }).catch(error => {
        debug('error', error && error.stack || error);
        this.emit('error', error);
        throw error;
      });
    });
  }

  close() {
    this.watcher.close();
  }
}

module.exports = Watcher;
