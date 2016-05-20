"use strict";

var diff = require('./diff');
var Watcher = require('./watcher');
var debug = require('debug')('hoch');
var events = require('events');
var hash = require('./hash');
var values = require('lowscore/values');

module.exports = class extends events.EventEmitter {
  constructor(config, server) {
    super();
    this.files = [];
    this.server = server;
    this.watcher = new Watcher({events: server.events, browserify: config.browserify || {}});

    this.watcher.start();

    this.watcher.on('change', () => {
      this.refresh();
    });

    this.watcher.on('error', function (error) {
      console.error(error);
    });
  }

  refresh() {
    this.version = computeVersions(values(this.watcher.files));
    debug('version', this.version);
    var diffs = diff(this.files, this.watcher.files, 'version');
    this.files = this.watcher.files;

    return this.server.refresh(diffs);
  }

  addFiles(filenames) {
    return this.watcher.addFiles(filenames).then(() => {
      return this.refresh();
    });
  }

  close() {
    this.watcher.close();
  }
};

function computeVersions(files) {
  files.forEach(file => {
    file.version = hash(file.source);
  });

  var versions = files.map(file => `${file.id}:${file.version}`);
  versions.sort();

  return hash(versions.join(','));
}
